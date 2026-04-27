'use strict';

const { EventEmitter } = require('events');
const { InstanceStatus } = require('./runtimes/instance-types');
const LlamaCppAdapter = require('./runtimes/llamacpp-adapter');

const LOG_BUFFER_MAX = 500;

const VALID_TRANSITIONS = {
    [InstanceStatus.IDLE]: [InstanceStatus.LOADING],
    [InstanceStatus.LOADING]: [InstanceStatus.RUNNING, InstanceStatus.ERROR],
    [InstanceStatus.RUNNING]: [InstanceStatus.STOPPING, InstanceStatus.ERROR],
    [InstanceStatus.STOPPING]: [InstanceStatus.STOPPED],
    [InstanceStatus.ERROR]: [InstanceStatus.IDLE],
    [InstanceStatus.STOPPED]: [InstanceStatus.IDLE],
};

const ADAPTER_FACTORIES = {
    llamacpp: () => new LlamaCppAdapter(),
};

class InstanceManager extends EventEmitter {
    constructor() {
        super();
        this._instanceMap = new Map();
    }

    createInstance(instanceId, runtime) {
        if (this._instanceMap.has(instanceId)) {
            throw new Error(`Instance already exists: ${instanceId}`);
        }

        const factory = ADAPTER_FACTORIES[runtime];
        if (!factory) {
            throw new Error(`Unknown runtime: ${runtime}. Supported: ${Object.keys(ADAPTER_FACTORIES).join(', ')}`);
        }

        const adapter = factory();

        const entry = {
            instanceId,
            runtime,
            adapter,
            status: InstanceStatus.IDLE,
            port: null,
            config: null,
            containerName: null,
            process: null,
            logBuffer: [],
            metricsInterval: null,
            startedAt: null,
            errorMessage: null,
        };

        this._instanceMap.set(instanceId, entry);
        return entry;
    }

    async startInstance(instanceId, config) {
        const entry = this._getOrThrow(instanceId);
        this._transition(instanceId, InstanceStatus.LOADING);

        entry.config = config;
        entry.port = config.port || null;
        entry.errorMessage = null;

        let subscribed = false;

        try {
            await entry.adapter.spawn(instanceId, config);

            const adapterLogEmitter = entry.adapter.logs(instanceId);
            this._subscribeAdapterLogs(instanceId, adapterLogEmitter);
            subscribed = true;

            entry.process = entry.adapter.getProcess ? entry.adapter.getProcess(instanceId) : null;

            if (entry.runtime === 'vllm') {
                entry.containerName = `vllm-${instanceId}`;
            }

            await entry.adapter.waitForReady(instanceId, 300000);

            this._transition(instanceId, InstanceStatus.RUNNING);
            entry.startedAt = new Date();
            this.emit('ready', { instanceId, port: entry.port });
        } catch (err) {
            if (!subscribed) {
                try {
                    const adapterLogEmitter = entry.adapter.logs(instanceId);
                    this._subscribeAdapterLogs(instanceId, adapterLogEmitter);
                } catch {
                    // emitter may not exist if spawn itself threw
                }
            }

            entry.errorMessage = err.message;
            this._transition(instanceId, InstanceStatus.ERROR);
            const lastLines = entry.logBuffer.slice(-10);
            this.emit('error', { instanceId, message: err.message, lastLines });
        }
    }

    async stopInstance(instanceId) {
        const entry = this._getOrThrow(instanceId);

        if (entry.status === InstanceStatus.STOPPING || entry.status === InstanceStatus.STOPPED) {
            return;
        }

        this._transition(instanceId, InstanceStatus.STOPPING);

        try {
            await entry.adapter.stop(instanceId);
        } catch (err) {
            entry.errorMessage = err.message;
        }

        entry.process = null;
        entry.metricsInterval = null;
        entry.startedAt = null;
        this._transition(instanceId, InstanceStatus.STOPPED);
    }

    dismissError(instanceId) {
        const entry = this._getOrThrow(instanceId);
        if (entry.status !== InstanceStatus.ERROR) {
            throw new Error(`Cannot dismiss error from state ${entry.status}. Instance must be in ERROR state.`);
        }
        entry.errorMessage = null;
        this._transition(instanceId, InstanceStatus.IDLE);
    }

    getInstance(instanceId) {
        const entry = this._instanceMap.get(instanceId);
        if (!entry) return null;
        return {
            instanceId: entry.instanceId,
            runtime: entry.runtime,
            status: entry.status,
            port: entry.port,
            config: entry.config ? { ...entry.config } : null,
            containerName: entry.containerName,
            process: entry.process,
            logBuffer: [...entry.logBuffer],
            metricsInterval: entry.metricsInterval,
            startedAt: entry.startedAt,
            errorMessage: entry.errorMessage,
        };
    }

    listInstances() {
        const result = [];
        for (const [, entry] of this._instanceMap) {
            result.push({
                instanceId: entry.instanceId,
                runtime: entry.runtime,
                status: entry.status,
                port: entry.port,
                startedAt: entry.startedAt,
                errorMessage: entry.errorMessage,
            });
        }
        return result;
    }

    removeInstance(instanceId) {
        const entry = this._instanceMap.get(instanceId);
        if (!entry) return;

        if (entry.status === InstanceStatus.RUNNING || entry.status === InstanceStatus.LOADING) {
            throw new Error(`Cannot remove instance ${instanceId} in state ${entry.status}. Stop it first.`);
        }

        if (entry.adapter && typeof entry.adapter.cleanup === 'function') {
            entry.adapter.cleanup(instanceId).catch(() => {});
        }

        this._instanceMap.delete(instanceId);
    }

    getAdapter(instanceId) {
        const entry = this._instanceMap.get(instanceId);
        return entry ? entry.adapter : null;
    }

    get instanceMap() {
        return this._instanceMap;
    }

    _getOrThrow(instanceId) {
        const entry = this._instanceMap.get(instanceId);
        if (!entry) {
            throw new Error(`Instance not found: ${instanceId}`);
        }
        return entry;
    }

    _transition(instanceId, newStatus) {
        const entry = this._instanceMap.get(instanceId);
        if (!entry) return;

        const oldStatus = entry.status;
        const allowed = VALID_TRANSITIONS[oldStatus];

        if (!allowed || !allowed.includes(newStatus)) {
            throw new Error(
                `Invalid state transition: ${oldStatus} → ${newStatus} for instance ${instanceId}`
            );
        }

        entry.status = newStatus;
        this.emit('status-changed', { instanceId, oldStatus, newStatus });
    }

    _subscribeAdapterLogs(instanceId, emitter) {
        if (!emitter) return;

        const entry = this._instanceMap.get(instanceId);
        if (!entry) return;

        const onLog = (logEntry) => {
            const line = logEntry.data || '';
            entry.logBuffer.push(line);
            if (entry.logBuffer.length > LOG_BUFFER_MAX) {
                entry.logBuffer.shift();
            }
            this.emit('log', { instanceId, line, timestamp: logEntry.timestamp || Date.now() });
        };

        const onClose = ({ code }) => {
            if (entry.status === InstanceStatus.STOPPING) {
                this._transition(instanceId, InstanceStatus.STOPPED);
            } else if (entry.status === InstanceStatus.RUNNING || entry.status === InstanceStatus.LOADING) {
                entry.errorMessage = `Process exited unexpectedly with code ${code}`;
                this._transition(instanceId, InstanceStatus.ERROR);
                this.emit('error', {
                    instanceId,
                    message: entry.errorMessage,
                    lastLines: entry.logBuffer.slice(-10),
                });
            }
        };

        const onError = ({ error }) => {
            if (entry.status === InstanceStatus.LOADING) {
                entry.errorMessage = error.message;
                this._transition(instanceId, InstanceStatus.ERROR);
                this.emit('error', {
                    instanceId,
                    message: error.message,
                    lastLines: entry.logBuffer.slice(-10),
                });
            }
        };

        const onSpawnError = ({ error }) => {
            if (entry.status === InstanceStatus.LOADING) {
                entry.errorMessage = error.message;
                this._transition(instanceId, InstanceStatus.ERROR);
                this.emit('error', {
                    instanceId,
                    message: error.message,
                    lastLines: entry.logBuffer.slice(-10),
                });
            }
        };

        const onMetrics = (data) => {
            this.emit('adapter-metrics', { instanceId, metrics: data });
        };

        emitter.on('log', onLog);
        emitter.on('close', onClose);
        emitter.on('error', onError);
        emitter.on('spawn-error', onSpawnError);
        emitter.on('metrics', onMetrics);

        entry._unsubscribeAdapter = () => {
            emitter.removeListener('log', onLog);
            emitter.removeListener('close', onClose);
            emitter.removeListener('error', onError);
            emitter.removeListener('spawn-error', onSpawnError);
            emitter.removeListener('metrics', onMetrics);
        };
    }
}

module.exports = new InstanceManager();
