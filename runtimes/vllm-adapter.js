'use strict';

const { spawn, exec } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const RuntimeAdapter = require('./adapter-interface');
const { parsePrometheusText } = require('./prometheus-parser');

const LOG_BUFFER_MAX = 500;

const VLLM_METRICS_KEYS = [
    'vllm:avg_generation_throughput_toks_per_s',
    'vllm:avg_prompt_throughput_toks_per_s',
    'vllm:gpu_cache_usage_perc',
    'vllm:num_requests_running',
];

const DOCKER_HUB_TAGS_URL = 'https://hub.docker.com/v2/repositories/vllm/vllm-openai/tags?page_size=20&ordering=last_updated';
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'app_settings.json');

let _gpuPassthroughCache = null;
let _gpuPassthroughPending = null;

class VllmAdapter extends RuntimeAdapter {
    constructor() {
        super();
        this._containers = new Map();
        this._emitters = new Map();
        this._logBuffers = new Map();
        this._ports = new Map();
    }

    async spawn(instanceId, config) {
        const em = new EventEmitter();
        this._emitters.set(instanceId, em);
        this._logBuffers.set(instanceId, []);
        this._ports.set(instanceId, config.port);

        const containerName = `vllm-${instanceId}`;
        const imageTag = config.imageTag || 'latest';

        const args = [
            'run',
            '--name', containerName,
            '--runtime', 'nvidia',
            '--gpus', 'all',
            '--ipc=host',
            '-v', `${config.modelDir}:/models`,
            '-p', `${config.port}:${config.port}`,
            '-e', 'PYTHONUNBUFFERED=1',
            '--rm',
            `vllm/vllm-openai:${imageTag}`,
            ...this.buildArgs(config),
        ];

        const proc = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });

        this._containers.set(instanceId, proc);

        if (proc.stdout) {
            proc.stdout.on('data', (data) => {
                this._emitLog(instanceId, data.toString(), 'stdout');
            });
        }

        if (proc.stderr) {
            proc.stderr.on('data', (data) => {
                this._emitLog(instanceId, data.toString(), 'stderr');
            });
        }

        return new Promise((resolve, reject) => {
            let settled = false;

            proc.on('error', (error) => {
                this._emitLog(instanceId, `Failed to start container: ${error}`, 'system');
                this._containers.delete(instanceId);
                em.emit('spawn-error', { error, instanceId });
                if (!settled) {
                    settled = true;
                    reject(error);
                }
            });

            proc.on('close', (code) => {
                this._emitLog(instanceId, `Container exited with code ${code}`, 'system');
                this._containers.delete(instanceId);
                em.emit('close', { code, instanceId });
                if (!settled) {
                    settled = true;
                    reject(new Error(`Container exited during spawn with code ${code}`));
                }
            });

            setImmediate(() => {
                if (!settled) {
                    settled = true;
                    resolve();
                }
            });
        });
    }

    async stop(instanceId, timeoutMs = 10000) {
        const containerName = `vllm-${instanceId}`;
        return new Promise((resolve) => {
            const proc = spawn('docker', ['stop', '--time', Math.round(timeoutMs / 1000), containerName], { stdio: 'ignore' });
            proc.on('error', () => resolve());
            proc.on('close', () => resolve());
        });
    }

    logs(instanceId) {
        const em = this._emitters.get(instanceId);
        if (!em) {
            throw new Error(`No instance found: ${instanceId}`);
        }
        return em;
    }

    async waitForReady(instanceId, timeoutMs = 300000) {
        const em = this._emitters.get(instanceId);
        if (!em) {
            throw new Error(`No instance found: ${instanceId}`);
        }

        return new Promise((resolve, reject) => {
            let settled = false;
            let pollInterval = null;
            let onLog = null;
            let onClose = null;

            const cleanup = () => {
                clearTimeout(timeout);
                if (pollInterval) clearInterval(pollInterval);
                if (onLog) em.removeListener('log', onLog);
                if (onClose) em.removeListener('close', onClose);
            };

            const timeout = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    cleanup();
                    reject(new Error('Server failed to start within the timeout period'));
                }
            }, timeoutMs);

            onLog = (entry) => {
                const line = entry.data || '';
                if (line.includes('Application startup complete.')) {
                    if (!settled) {
                        settled = true;
                        cleanup();
                        resolve();
                    }
                }
            };

            onClose = (info) => {
                if (!settled) {
                    settled = true;
                    cleanup();
                    reject(new Error(`Container exited during startup with code ${info.code}`));
                }
            };

            em.on('log', onLog);
            em.on('close', onClose);

            const port = this._ports.get(instanceId);
            if (port) {
                pollInterval = setInterval(async () => {
                    if (settled) return;
                    try {
                        const res = await fetch(`http://localhost:${port}/health`);
                        if (res.ok) {
                            if (!settled) {
                                settled = true;
                                cleanup();
                                resolve();
                            }
                        }
                    } catch { /* not ready yet */ }
                }, 2000);
            }
        });
    }

    buildArgs(config) {
        const args = ['--model', `/models/${config.modelName}`];

        // Core
        if (config.tensorParallelSize)     args.push('--tensor-parallel-size', config.tensorParallelSize);
        if (config.pipelineParallelSize)   args.push('--pipeline-parallel-size', config.pipelineParallelSize);
        if (config.dtype)                  args.push('--dtype', config.dtype);
        if (config.quantization)           args.push('--quantization', config.quantization);
        if (config.maxModelLen)            args.push('--max-model-len', config.maxModelLen);
        if (config.gpuMemoryUtilization)   args.push('--gpu-memory-utilization', config.gpuMemoryUtilization);

        // Concurrency
        if (config.maxNumSeqs)             args.push('--max-num-seqs', config.maxNumSeqs);
        if (config.enablePrefixCaching)    args.push('--enable-prefix-caching');
        if (config.prefixCachingHashAlgo)  args.push('--prefix-caching-hash-algo', config.prefixCachingHashAlgo);

        // Identity
        if (config.servedModelName)        args.push('--served-model-name', config.servedModelName);
        if (config.apiKey)                 args.push('--api-key', config.apiKey);
        args.push('--host', '127.0.0.1');
        args.push('--port', config.port);

        // Memory / KV
        if (config.kvCacheDtype)           args.push('--kv-cache-dtype', config.kvCacheDtype);
        if (config.kvOffloadingBackend)    args.push('--kv-offloading-backend', config.kvOffloadingBackend);
        if (config.kvOffloadingSize)       args.push('--kv-offloading-size', config.kvOffloadingSize);
        if (config.kvTransferConfig)       args.push('--kv-transfer-config', JSON.stringify(config.kvTransferConfig));

        // Advanced
        if (config.enforceEager)           args.push('--enforce-eager');
        if (config.tokenizer)              args.push('--tokenizer', config.tokenizer);
        if (config.seed !== undefined)     args.push('--seed', config.seed);
        if (config.distributedExecutorBackend) args.push('--distributed-executor-backend', config.distributedExecutorBackend);
        if (config.enableSleepMode)        args.push('--enable-sleep-mode');
        if (config.shutdownTimeout)        args.push('--shutdown-timeout', config.shutdownTimeout);
        if (config.speculativeConfig)      args.push('--speculative-config', JSON.stringify(config.speculativeConfig));
        if (config.loraModules)            args.push('--lora-modules', ...config.loraModules);
        if (config.hfToken)                args.push('--hf-token', config.hfToken);

        return args;
    }

    async cleanup(instanceId) {
        this._containers.delete(instanceId);
        this._emitters.delete(instanceId);
        this._logBuffers.delete(instanceId);
        this._ports.delete(instanceId);
    }

    async collectMetrics(instanceId) {
        const port = this._ports.get(instanceId);
        if (!port) return;

        try {
            const res = await fetch(`http://localhost:${port}/metrics`);
            if (!res.ok) return;

            const text = await res.text();
            const metrics = parsePrometheusText(text, VLLM_METRICS_KEYS);

            const em = this._emitters.get(instanceId);
            if (em) {
                em.emit('metrics', { type: 'vllm-prometheus', metrics });
            }
        } catch { /* server may briefly be unavailable */ }
    }

    async checkForUpdates(currentTag) {
        try {
            const res = await fetch(DOCKER_HUB_TAGS_URL);
            if (!res.ok) {
                return { latestTag: null, updateAvailable: false, allTags: [], error: `Docker Hub returned ${res.status}` };
            }

            const data = await res.json();
            const allTags = (data.results || [])
                .map((t) => t.name)
                .filter((t) => /^v\d/.test(t));

            const latestTag = allTags[0] || null;
            return {
                latestTag,
                updateAvailable: latestTag !== null && latestTag !== currentTag,
                allTags,
            };
        } catch (error) {
            return { latestTag: null, updateAvailable: false, allTags: [], error: error.message };
        }
    }

    pullImage(tag, onProgress) {
        return new Promise((resolve, reject) => {
            const proc = spawn('docker', ['pull', `vllm/vllm-openai:${tag}`], { stdio: ['ignore', 'pipe', 'pipe'] });

            if (proc.stdout) {
                proc.stdout.on('data', (data) => {
                    const line = data.toString();
                    if (onProgress) onProgress(line);
                });
            }

            if (proc.stderr) {
                proc.stderr.on('data', (data) => {
                    const line = data.toString();
                    if (onProgress) onProgress(line);
                });
            }

            proc.on('error', (error) => {
                reject(new Error(`Failed to pull image: ${error.message}`));
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`docker pull exited with code ${code}`));
                }
            });
        });
    }

    async getPinnedTag() {
        const settings = await this._loadSettings();
        return (settings.vllm && settings.vllm.imageTag) || null;
    }

    async setPinnedTag(tag) {
        const settings = await this._loadSettings();
        if (!settings.vllm) settings.vllm = {};
        settings.vllm.imageTag = tag;
        await this._saveSettings(settings);
    }

    async _loadSettings() {
        try {
            const data = await fs.promises.readFile(SETTINGS_FILE, 'utf8');
            return JSON.parse(data);
        } catch {
            return { modelsPath: { source: 'lmstudio', customPath: '' }, version: '1.0' };
        }
    }

    async _saveSettings(settings) {
        await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    }

    async preflight(config) {
        const dockerOk = await this._runCommand('docker info');
        if (!dockerOk) {
            return { ok: false, errors: ['Docker Desktop is not running. Please start Docker Desktop and try again.'] };
        }

        const nvidiaOk = await this._runCommand('nvidia-smi');
        if (!nvidiaOk) {
            return { ok: false, errors: ['NVIDIA driver not detected. Ensure the GeForce driver is installed.'] };
        }

        const gpuCount = await this._getGpuCount();
        if (!gpuCount || gpuCount < 1) {
            return { ok: false, errors: ['No NVIDIA GPU detected.'] };
        }

        const passthroughOk = await this.checkGpuPassthrough();
        if (!passthroughOk) {
            return { ok: false, errors: ['Docker GPU passthrough failed. Check NVIDIA Container Toolkit configuration.'] };
        }

        const tag = config.imageTag || 'latest';
        const imageOk = await this._runCommand(`docker image inspect vllm/vllm-openai:${tag}`);
        if (!imageOk) {
            return { ok: false, errors: ['Image not found locally. Pull it first with the Update function.'] };
        }

        if (config.modelDir && config.modelName) {
            const modelPath = path.join(config.modelDir, config.modelName);
            if (!fs.existsSync(modelPath)) {
                return { ok: false, errors: [`Model directory not found: ${modelPath}`] };
            }
        }

        return { ok: true, errors: [] };
    }

    async checkGpuPassthrough(force = false) {
        if (!force && _gpuPassthroughCache !== null) {
            return _gpuPassthroughCache;
        }

        if (!force && _gpuPassthroughPending) {
            return _gpuPassthroughPending;
        }

        _gpuPassthroughPending = this._runCommand(
            'docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi',
            30000
        ).then((result) => {
            _gpuPassthroughCache = result;
            _gpuPassthroughPending = null;
            return result;
        });

        return _gpuPassthroughPending;
    }

    _runCommand(cmd, timeoutMs = 10000) {
        return new Promise((resolve) => {
            exec(cmd, { timeout: timeoutMs }, (error) => {
                resolve(!error);
            });
        });
    }

    _getGpuCount() {
        return new Promise((resolve) => {
            exec('nvidia-smi --query-gpu=count --format=csv,noheader', { timeout: 10000 }, (error, stdout) => {
                if (error) return resolve(0);
                const lines = stdout.trim().split('\n').filter((l) => l.trim());
                if (lines.length === 0) return resolve(0);
                const count = parseInt(lines[0].trim(), 10);
                resolve(isNaN(count) ? lines.length : count);
            });
        });
    }

    getContainer(instanceId) {
        return this._containers.get(instanceId) || null;
    }

    getLogBuffer(instanceId) {
        return this._logBuffers.get(instanceId) || [];
    }

    _emitLog(instanceId, data, type) {
        const buffer = this._logBuffers.get(instanceId);
        if (buffer) {
            buffer.push(data);
            if (buffer.length > LOG_BUFFER_MAX) buffer.shift();
        }

        const em = this._emitters.get(instanceId);
        if (em) {
            em.emit('log', { data, type, timestamp: Date.now() });
        }
    }
}

module.exports = VllmAdapter;
