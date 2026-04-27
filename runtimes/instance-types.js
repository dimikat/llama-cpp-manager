'use strict';

/**
 * Instance lifecycle states.
 *
 * Transitions:
 *   IDLE → LOADING       (user clicks Load; adapter.spawn() called)
 *   LOADING → RUNNING    (readiness confirmed via log marker or /health 200)
 *   LOADING → ERROR      (spawn fails, process exits immediately)
 *   RUNNING → STOPPING   (user clicks Stop)
 *   RUNNING → ERROR      (process exits unexpectedly)
 *   STOPPING → STOPPED   (adapter confirms process terminated)
 *   ERROR → IDLE         (user clicks Restart/Dismiss; resets entry, keeps config)
 *   STOPPED → IDLE       (user restarts the instance)
 *
 * @readonly
 * @enum {string}
 */
const InstanceStatus = Object.freeze({
    IDLE: 'IDLE',
    LOADING: 'LOADING',
    RUNNING: 'RUNNING',
    STOPPING: 'STOPPING',
    ERROR: 'ERROR',
    STOPPED: 'STOPPED',
});

/**
 * @typedef {Object} InstanceMapEntry
 * @property {string} instanceId           - UUID, generated at tab creation
 * @property {'llamacpp'|'vllm'} runtime  - Which runtime adapter to use
 * @property {import('./adapter-interface').RuntimeAdapter} adapter - Adapter instance
 * @property {InstanceStatus} status       - Current lifecycle state
 * @property {number} port                 - Port the server listens on
 * @property {InstanceConfig} config       - Resolved configuration at start time
 * @property {string|null} containerName   - vLLM only: "vllm-{instanceId}"
 * @property {import('child_process').ChildProcess|null} process - llama.cpp only
 * @property {string[]} logBuffer          - Last 500 log lines (ring buffer)
 * @property {NodeJS.Timeout|null} metricsInterval - Metrics polling timer
 * @property {Date|null} startedAt         - When the instance entered RUNNING
 * @property {string|null} errorMessage    - Last error message (ERROR state)
 */

/**
 * Base configuration shape shared by all runtimes. Each adapter extends this
 * with its own runtime-specific fields.
 *
 * LlamaCppAdapter extensions include: serverPath, contextSize, gpuLayers,
 * threads, batchSize, ropeFreqBase, ropeFreqScale, nParallel, slotPromptSimilarity,
 * slotSavePath, noContextShift, mlock, mmap, etc.
 *
 * VllmAdapter extensions include: modelName, modelDir, imageTag,
 * tensorParallelSize, pipelineParallelSize, dtype, quantization, maxModelLen,
 * gpuMemoryUtilization, maxNumSeqs, enablePrefixCaching, servedModelName,
 * apiKey, kvCacheDtype, kvOffloadingBackend, kvOffloadingSize, enforceEager,
 * tokenizer, seed, distributedExecutorBackend, enableSleepMode,
 * shutdownTimeout, hfToken, speculativeConfig, loraModules.
 *
 * @typedef {Object} InstanceConfig
 * @property {number} port       - Port the inference server will bind to
 * @property {string} [model]    - Model file path (llama.cpp) or model name (vLLM)
 * @property {number} [gpuLayers] - Number of GPU layers (llama.cpp: -ngl)
 */

module.exports = { InstanceStatus };
