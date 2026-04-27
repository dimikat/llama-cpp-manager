'use strict';

const instanceManager = require('./instance-manager');
const { InstanceStatus } = require('./runtimes/instance-types');

function setupSocketHandlers(io) {
    const connectedClients = [];

    io.on('connection', (socket) => {
        console.log('Client connected for log streaming');
        connectedClients.push(socket);

        socket.on('disconnect', () => {
            console.log('Client disconnected from log streaming');
            const index = connectedClients.indexOf(socket);
            if (index > -1) {
                connectedClients.splice(index, 1);
            }
        });

        socket.on('instance:join', (instanceId) => {
            socket.join(`instance:${instanceId}`);

            const entry = instanceManager.getInstance(instanceId);
            if (entry) {
                socket.emit('instance:status', {
                    instanceId,
                    status: entry.status,
                });

                const logBuffer = entry.logBuffer || [];
                for (const line of logBuffer) {
                    socket.emit('instance:log', {
                        instanceId,
                        line,
                        timestamp: Date.now(),
                    });
                }
            }
        });

        socket.on('instance:leave', (instanceId) => {
            socket.leave(`instance:${instanceId}`);
        });

        socket.on('instance:create', (data) => {
            const { instanceId, runtime } = data;
            try {
                instanceManager.createInstance(instanceId, runtime || 'llamacpp');
                socket.join(`instance:${instanceId}`);
                socket.emit('instance:status', {
                    instanceId,
                    status: InstanceStatus.IDLE,
                });
            } catch (err) {
                socket.emit('instance:error', {
                    instanceId,
                    message: err.message,
                    lastLines: [],
                });
            }
        });

        socket.on('instance:start', async (data) => {
            const { instanceId, config } = data;
            try {
                await instanceManager.startInstance(instanceId, config);
            } catch (err) {
                // Instance Manager already transitioned to ERROR and emitted events
            }
        });

        socket.on('instance:stop', async (data) => {
            const { instanceId } = data;
            try {
                await instanceManager.stopInstance(instanceId);
            } catch (err) {
                // Swallow — state machine already enforced
            }
        });

        socket.on('instance:dismiss', (data) => {
            const { instanceId } = data;
            try {
                instanceManager.dismissError(instanceId);
            } catch (err) {
                // Swallow
            }
        });
    });

    instanceManager.on('status-changed', ({ instanceId, oldStatus, newStatus }) => {
        io.to(`instance:${instanceId}`).emit('instance:status', {
            instanceId,
            status: newStatus,
        });

        if (newStatus === InstanceStatus.STOPPED) {
            connectedClients.forEach(client => {
                client.emit('server-ended', { message: 'Server process has ended' });
            });
        }
    });

    instanceManager.on('log', ({ instanceId, line, timestamp }) => {
        io.to(`instance:${instanceId}`).emit('instance:log', {
            instanceId,
            line,
            timestamp,
        });

        const entry = instanceManager.getInstance(instanceId);
        const type = 'stdout';
        connectedClients.forEach(client => {
            client.emit('log-stream', { type, data: line });
        });
    });

    instanceManager.on('error', ({ instanceId, message, lastLines }) => {
        io.to(`instance:${instanceId}`).emit('instance:error', {
            instanceId,
            message,
            lastLines,
        });

        connectedClients.forEach(client => {
            client.emit('server-error', { message });
        });
    });

    instanceManager.on('ready', ({ instanceId, port }) => {
        io.to(`instance:${instanceId}`).emit('instance:ready', {
            instanceId,
            port,
        });
    });

    instanceManager.on('adapter-metrics', ({ instanceId, metrics }) => {
        io.to(`instance:${instanceId}`).emit('instance:metrics', {
            instanceId,
            metrics,
        });

        if (metrics.type === 'token-speed') {
            connectedClients.forEach(client => {
                client.emit('token-speed', { speed: metrics.speed });
            });
        } else if (metrics.type === 'context-update') {
            connectedClients.forEach(client => {
                client.emit('context-update', {
                    used: metrics.used,
                    total: metrics.total,
                    percentage: metrics.percentage,
                });
            });
        } else if (metrics.type === 'context-size') {
            connectedClients.forEach(client => {
                client.emit('context-size', { contextSize: metrics.contextSize });
            });
        }
    });

}

module.exports = { setupSocketHandlers };
