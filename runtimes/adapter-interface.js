'use strict';

/**
 * Abstract base class for runtime adapters. The Instance Manager calls only
 * these six methods — every runtime (llama.cpp, vLLM, future runtimes) must
 * implement all of them.
 *
 * See ADR-001 for the full interface specification.
 */
class RuntimeAdapter {
    /**
     * Spawn the server process or container. Resolves when the spawn is
     * confirmed (not when the server is ready to accept requests).
     *
     * @param {string} instanceId - Unique instance identifier
     * @param {import('./instance-types').InstanceConfig} config - Resolved instance configuration
     * @returns {Promise<void>}
     */
    async spawn(instanceId, config) {
        throw new Error('Not implemented');
    }

    /**
     * Stop the server. Graceful first (SIGTERM / docker stop), then forced
     * after timeoutMs.
     *
     * @param {string} instanceId - Unique instance identifier
     * @param {number} [timeoutMs=10000] - Grace period before force-kill
     * @returns {Promise<void>}
     */
    async stop(instanceId, timeoutMs) {
        throw new Error('Not implemented');
    }

    /**
     * Return an EventEmitter for log lines for the given instance.
     * Emits: 'log' ({ data, type, timestamp }), 'close' ({ code, instanceId }),
     * 'error' ({ error, instanceId }), 'metrics' (object).
     *
     * @param {string} instanceId - Unique instance identifier
     * @returns {import('events').EventEmitter}
     */
    logs(instanceId) {
        throw new Error('Not implemented');
    }

    /**
     * Block until the server is ready to accept inference requests.
     * Resolves on readiness; rejects on timeout.
     *
     * @param {string} instanceId - Unique instance identifier
     * @param {number} timeoutMs - Maximum wait time in milliseconds
     * @returns {Promise<void>}
     */
    async waitForReady(instanceId, timeoutMs) {
        throw new Error('Not implemented');
    }

    /**
     * Translate an InstanceConfig into runtime-specific CLI arguments.
     *
     * @param {import('./instance-types').InstanceConfig} config - Resolved instance configuration
     * @returns {string[]} Array of CLI arguments
     */
    buildArgs(config) {
        throw new Error('Not implemented');
    }

    /**
     * Clean up any runtime resources (containers, temp files, saved slots)
     * associated with this instance.
     *
     * @param {string} instanceId - Unique instance identifier
     * @returns {Promise<void>}
     */
    async cleanup(instanceId) {
        throw new Error('Not implemented');
    }
}

module.exports = RuntimeAdapter;
