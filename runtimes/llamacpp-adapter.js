'use strict';

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const RuntimeAdapter = require('./adapter-interface');

const LOG_BUFFER_MAX = 500;

class LlamaCppAdapter extends RuntimeAdapter {
    constructor() {
        super();
        this._processes = new Map();
        this._emitters = new Map();
        this._logBuffers = new Map();
        this._detectedContextSize = 16384;
    }

    async spawn(instanceId, config) {
        const em = new EventEmitter();
        this._emitters.set(instanceId, em);
        this._logBuffers.set(instanceId, []);

        const processedArgs = this._processMultiPartArgs(config.args || []);

        const proc = spawn(config.serverPath, processedArgs, { stdio: 'pipe' });

        this._processes.set(instanceId, proc);

        if (proc.stdout) {
            proc.stdout.on('data', (data) => {
                const logData = data.toString();
                this._emitLog(instanceId, logData, 'stdout');
                this._parsePerformanceMetrics(instanceId, logData);
            });
        }

        if (proc.stderr) {
            proc.stderr.on('data', (data) => {
                const logData = data.toString();
                this._emitLog(instanceId, logData, 'stderr');
                this._parsePerformanceMetrics(instanceId, logData);
            });
        }

        return new Promise((resolve, reject) => {
            let settled = false;

            proc.on('error', (error) => {
                this._emitLog(instanceId, `Failed to start process: ${error}`, 'system');
                this._processes.delete(instanceId);
                em.emit('spawn-error', { error, instanceId });
                if (!settled) {
                    settled = true;
                    reject(error);
                }
            });

            proc.on('close', (code) => {
                this._emitLog(instanceId, `Server process exited with code ${code}`, 'system');
                this._processes.delete(instanceId);
                em.emit('close', { code, instanceId });
                if (!settled) {
                    settled = true;
                    reject(new Error(`Process exited during spawn with code ${code}`));
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

    async stop(instanceId, timeoutMs = 1000) {
        const proc = this._processes.get(instanceId);
        if (!proc || proc.killed) return;

        proc.kill('SIGTERM');
        await new Promise((resolve) => {
            const timer = setTimeout(() => {
                if (!proc.killed) {
                    proc.kill('SIGKILL');
                }
                resolve();
            }, timeoutMs);

            proc.on('close', () => {
                clearTimeout(timer);
                resolve();
            });
        });

        this._processes.delete(instanceId);
    }

    logs(instanceId) {
        const em = this._emitters.get(instanceId);
        if (!em) {
            throw new Error(`No instance found: ${instanceId}`);
        }
        return em;
    }

    async waitForReady(instanceId, timeoutMs = 300000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Server failed to start within the timeout period'));
            }, timeoutMs);

            const em = this._emitters.get(instanceId);
            if (!em) {
                clearTimeout(timeout);
                reject(new Error(`No instance found: ${instanceId}`));
                return;
            }

            const onLog = (entry) => {
                const line = entry.data || '';
                if (this._isReadyMarker(line)) {
                    clearTimeout(timeout);
                    em.removeListener('log', onLog);
                    resolve();
                }
            };

            em.on('log', onLog);
        });
    }

    buildArgs(config) {
        return config.args || [];
    }

    async cleanup(instanceId) {
        this._processes.delete(instanceId);
        this._emitters.delete(instanceId);
        this._logBuffers.delete(instanceId);
    }

    getProcess(instanceId) {
        return this._processes.get(instanceId) || null;
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

    _processMultiPartArgs(args) {
        const processedArgs = [];
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-m' && i + 1 < args.length) {
                let modelPath = args[i + 1];
                const multiPartPattern = /^(.*)-\d{1,5}-of-\d{1,5}\.gguf$/i;
                const match = modelPath.match(multiPartPattern);
                if (match) {
                    const basePath = match[1] + '.gguf';
                    console.log(`Multi-part model detected: ${modelPath} -> ${basePath}`);
                    processedArgs.push(args[i], basePath);
                } else {
                    processedArgs.push(args[i], modelPath);
                }
                i++;
            } else {
                processedArgs.push(args[i]);
            }
        }
        return processedArgs;
    }

    _isReadyMarker(line) {
        if (/llama server listening/i.test(line)) return true;
        if (/HTTP server is listening/i.test(line)) return true;
        if (/server started on/i.test(line)) return true;
        if (/listening on port/i.test(line)) return true;
        if (/all slots are idle/i.test(line)) return true;
        return false;
    }

    _parsePerformanceMetrics(instanceId, logData) {
        const em = this._emitters.get(instanceId);
        if (!em) return;

        const speedPatterns = [
            /([\d.]+)\s*(?:tokens?\/s|t\/s)/i,
            /speed:\s*([\d.]+)\s*(?:tokens?\/s|t\/s)/i,
            /([\d.]+)\s*tok\/s/i,
            /generated.*?([\d.]+)\s*(?:tokens?\/s|t\/s)/i,
            /eval\s+time\s+=.*?([\d.]+)\s*tokens?\/s/i
        ];

        for (const pattern of speedPatterns) {
            const match = logData.match(pattern);
            if (match) {
                const speed = parseFloat(match[1]);
                if (speed > 0 && speed < 1000) {
                    em.emit('metrics', { type: 'token-speed', speed });
                    break;
                }
            }
        }

        this._parseContextUsage(instanceId, logData);
    }

    _parseContextUsage(instanceId, logData) {
        const em = this._emitters.get(instanceId);
        if (!em) return;

        const contextPatterns = [
            { re: /slot.*?n_past\s*=\s*(\d+).*?n_ctx_slot\s*=\s*(\d+)/is, extract: (m) => ({ used: parseInt(m[1]), total: parseInt(m[2]) }) },
            { re: /slot.*?n_ctx_slot\s*=\s*(\d+).*?n_past\s*=\s*(\d+)/is, extract: (m) => ({ used: parseInt(m[2]), total: parseInt(m[1]) }) },
            { re: /slot.*?n_past\s*=\s*(\d+).*?truncated\s*=\s*\d+/i, extract: (m) => ({ used: parseInt(m[1]), total: this._detectedContextSize }) },
            { re: /generated\s+(\d+)\s+tokens.*?context\s*(?:size|length)?\s*(?:of\s*)?(\d+)/is, extract: (m) => ({ used: parseInt(m[1]), total: parseInt(m[2]) }) },
            { re: /completion.*?(\d+)\s*\/\s*(\d+)\s+tokens/i, extract: (m) => ({ used: parseInt(m[1]), total: parseInt(m[2]) }) },
            { re: /n_ctx\s*=\s*(\d+).*?n_past\s*=\s*(\d+)/is, extract: (m) => ({ used: parseInt(m[2]), total: parseInt(m[1]) }) },
            { re: /context\s+size:\s*(\d+).*?tokens\s+processed:\s*(\d+)/is, extract: (m) => ({ used: parseInt(m[2]), total: parseInt(m[1]) }) },
            { re: /ctx_size:\s*(\d+).*?n_past:\s*(\d+)/is, extract: (m) => ({ used: parseInt(m[2]), total: parseInt(m[1]) }) },
            { re: /context.*?(\d+)\s*\/\s*(\d+)/i, extract: (m) => ({ used: parseInt(m[1]), total: parseInt(m[2]) }) },
            { re: /used:\s*(\d+),?\s*total:\s*(\d+)/i, extract: (m) => ({ used: parseInt(m[1]), total: parseInt(m[2]) }) },
            { re: /tokens?:\s*(\d+)\s*\/\s*(\d+)/i, extract: (m) => ({ used: parseInt(m[1]), total: parseInt(m[2]) }) },
            { re: /kv\s+cache:\s*(\d+)\s*\/\s*(\d+)/i, extract: (m) => ({ used: parseInt(m[1]), total: parseInt(m[2]) }) },
            { re: /prompt\s+eval\s+count:\s*(\d+).*?context\s+size:\s*(\d+)/i, extract: (m) => ({ used: parseInt(m[1]), total: parseInt(m[2]) }) },
            { re: /prompt\s+tokens\s+=\s*(\d+).*?eval\s+count\s+=\s*(\d+)/is, extract: (m) => ({ used: parseInt(m[1]) + parseInt(m[2]), total: 32768 }) },
            { re: /n_tokens\s*=\s*(\d+).*?n_ctx\s*=\s*(\d+)/is, extract: (m) => ({ used: parseInt(m[1]), total: parseInt(m[2]) }) },
            { re: /processed\s+(\d+)\s*\/\s*(\d+)\s+tokens/i, extract: (m) => ({ used: parseInt(m[1]), total: parseInt(m[2]) }) },
        ];

        for (const { re, extract } of contextPatterns) {
            const match = logData.match(re);
            if (match) {
                const { used, total } = extract(match);
                if (total > 0) {
                    this._detectedContextSize = total;
                }
                if (used >= 0 && total > 0 && used <= total) {
                    const percentage = (used / total) * 100;
                    em.emit('metrics', {
                        type: 'context-update',
                        used,
                        total,
                        percentage: percentage.toFixed(1)
                    });
                    return;
                }
            }
        }

        const contextSizePattern = /context\s+size:\s*(\d+)/i;
        const sizeMatch = logData.match(contextSizePattern);
        if (sizeMatch) {
            const contextSize = parseInt(sizeMatch[1]);
            this._detectedContextSize = contextSize;
            em.emit('metrics', { type: 'context-size', contextSize });
        }
    }
}

module.exports = LlamaCppAdapter;
