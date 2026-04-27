# ADR-002: vLLM Runtime Adapter (Docker Desktop)

**Status:** Proposed — Pending PM Review
**Date:** 2026-04-27
**Deciders:** PM (Dimitri), AI Technical Lead

---

## Context

The instance manager (ADR-001) delegates all runtime-specific behavior to adapter implementations. This ADR defines the `VllmAdapter` — how the manager spawns, monitors, and stops vLLM inference servers running inside the official `vllm/vllm-openai` Docker container via Docker Desktop on Windows.

Deployment path selected and validated: see `docs/research/vllm_deployment_triage.md`.

---

## Spawn Interface

The adapter issues `docker run` from Node.js `child_process.spawn` on the Windows host. Docker Desktop with WSL2 backend translates Windows paths and handles GPU passthrough automatically.

```javascript
// VllmAdapter.spawn(instanceId, config)
const containerName = `vllm-${instanceId}`;

const args = [
  "run",
  "--name", containerName,
  "--runtime", "nvidia",
  "--gpus", "all",
  "--ipc=host",                          // required for NCCL shared memory
  "-v", `${config.modelDir}:/models`,    // Windows path, Docker Desktop translates
  "-p", `${config.port}:${config.port}`,
  "-e", "PYTHONUNBUFFERED=1",
  "--rm",                                 // auto-remove container on exit
  `vllm/vllm-openai:${config.imageTag}`,
  ...this.buildArgs(config),
];

const proc = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
```

**Notes:**
- `--rm` ensures containers don't accumulate on the host between sessions.
- `--name` is deterministic (`vllm-{instanceId}`) so `docker stop` can target by name regardless of PID.
- `--ipc=host` is mandatory for `--tensor-parallel-size > 1`; without it NCCL hangs.
- `-v` uses the Windows path directly (e.g., `E:\models\vllm`). Docker Desktop handles the WSL2 translation — no manual `/mnt/e/` conversion needed.

---

## CLI Argument Mapping

```javascript
// VllmAdapter.buildArgs(config) — maps InstanceConfig to vLLM CLI flags
buildArgs(config) {
  const args = ["--model", `/models/${config.modelName}`];

  // Core
  if (config.tensorParallelSize)     args.push("--tensor-parallel-size", config.tensorParallelSize);
  if (config.pipelineParallelSize)   args.push("--pipeline-parallel-size", config.pipelineParallelSize);
  if (config.dtype)                  args.push("--dtype", config.dtype);
  if (config.quantization)           args.push("--quantization", config.quantization);
  if (config.maxModelLen)            args.push("--max-model-len", config.maxModelLen);
  if (config.gpuMemoryUtilization)   args.push("--gpu-memory-utilization", config.gpuMemoryUtilization);

  // Concurrency
  if (config.maxNumSeqs)             args.push("--max-num-seqs", config.maxNumSeqs);
  if (config.enablePrefixCaching)    args.push("--enable-prefix-caching");
  if (config.prefixCachingHashAlgo)  args.push("--prefix-caching-hash-algo", config.prefixCachingHashAlgo);

  // Identity
  if (config.servedModelName)        args.push("--served-model-name", config.servedModelName);
  if (config.apiKey)                 args.push("--api-key", config.apiKey);
  args.push("--host", "127.0.0.1");
  args.push("--port", config.port);

  // Memory / KV
  if (config.kvCacheDtype)           args.push("--kv-cache-dtype", config.kvCacheDtype);
  if (config.kvOffloadingBackend)    args.push("--kv-offloading-backend", config.kvOffloadingBackend);
  if (config.kvOffloadingSize)       args.push("--kv-offloading-size", config.kvOffloadingSize);
  if (config.kvTransferConfig)       args.push("--kv-transfer-config", JSON.stringify(config.kvTransferConfig));

  // Advanced
  if (config.enforceEager)           args.push("--enforce-eager");
  if (config.tokenizer)              args.push("--tokenizer", config.tokenizer);
  if (config.seed !== undefined)     args.push("--seed", config.seed);
  if (config.distributedExecutorBackend) args.push("--distributed-executor-backend", config.distributedExecutorBackend);
  if (config.enableSleepMode)        args.push("--enable-sleep-mode");
  if (config.shutdownTimeout)        args.push("--shutdown-timeout", config.shutdownTimeout);
  if (config.speculativeConfig)      args.push("--speculative-config", JSON.stringify(config.speculativeConfig));
  if (config.loraModules)            args.push("--lora-modules", ...config.loraModules);
  if (config.hfToken)                args.push("--hf-token", config.hfToken);

  return args;
}
```

---

## Readiness Detection

vLLM takes 30–120 seconds to load weights. The adapter uses belt-and-suspenders readiness detection:

1. **Log marker (primary):** Watch stdout for `Application startup complete.` — fires as soon as the HTTP server is accepting requests.
2. **HTTP poll (backup):** Poll `GET http://localhost:{port}/health` every 2 seconds. Resolve when it returns 200.
3. **Timeout:** After 300 seconds without readiness, transition instance to ERROR state with message "Server failed to start within 5 minutes."

```javascript
async waitForReady(instanceId, timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Startup timeout")), timeoutMs);

    // Log marker listener
    this.on(`log:${instanceId}`, (line) => {
      if (line.includes("Application startup complete")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    // HTTP poll backup
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:${this.getPort(instanceId)}/health`);
        if (res.ok) { clearInterval(poll); clearTimeout(timeout); resolve(); }
      } catch { /* not ready yet */ }
    }, 2000);
  });
}
```

---

## Log Streaming

Docker Desktop forwards container stdout/stderr to the spawned process's stdio pipes. With `PYTHONUNBUFFERED=1`, Python flushes immediately. The adapter reads line-by-line and emits to the instance manager:

```javascript
proc.stdout.on("data", (chunk) => {
  const lines = chunk.toString().split("\n").filter(Boolean);
  for (const line of lines) {
    this.emit(`log:${instanceId}`, line);
    instanceMap.get(instanceId).logBuffer.push(line);
    // ring buffer: keep last 500 lines
    if (instanceMap.get(instanceId).logBuffer.length > 500)
      instanceMap.get(instanceId).logBuffer.shift();
  }
});
```

---

## Metrics Collection

vLLM exposes Prometheus-format metrics at `GET http://localhost:{port}/metrics`. The adapter polls this endpoint every 2 seconds while the instance is RUNNING.

**Metrics extracted for v1:**

| vLLM Prometheus key | UI label |
|---|---|
| `vllm:avg_generation_throughput_toks_per_s` | Generation throughput (tok/s) |
| `vllm:avg_prompt_throughput_toks_per_s` | Prompt throughput (tok/s) |
| `vllm:gpu_cache_usage_perc` | KV cache usage (%) |
| `vllm:num_requests_running` | Concurrent requests |

Per-GPU VRAM is sourced from `nvidia-smi` (existing system metrics pipeline), not from the `/metrics` endpoint.

```javascript
async collectMetrics(instanceId) {
  const port = instanceMap.get(instanceId).port;
  const res = await fetch(`http://localhost:${port}/metrics`);
  const text = await res.text();
  return parsePrometheusText(text, [
    "vllm:avg_generation_throughput_toks_per_s",
    "vllm:avg_prompt_throughput_toks_per_s",
    "vllm:gpu_cache_usage_perc",
    "vllm:num_requests_running",
  ]);
}
```

---

## Stop Sequence

```javascript
async stop(instanceId, timeoutMs = 10_000) {
  const containerName = `vllm-${instanceId}`;
  // docker stop sends SIGTERM, waits timeoutMs, then SIGKILL
  await exec(`docker stop --time=${timeoutMs / 1000} ${containerName}`);
  // --rm on the run command ensures the container is removed automatically
}
```

Because `--rm` was set at spawn time, Docker removes the container after exit. No `docker rm` needed.

---

## Pre-flight Checks

The adapter runs these before every spawn attempt. Each failure produces a user-readable error message shown in the tab.

| Check | Command | Failure message |
|---|---|---|
| Docker Desktop running | `docker info` exits 0 | "Docker Desktop is not running. Please start Docker Desktop and try again." |
| NVIDIA driver on host | `nvidia-smi` exits 0 | "NVIDIA driver not detected. Ensure the GeForce driver is installed." |
| GPU count ≥ 1 | `nvidia-smi --query-gpu=count --format=csv,noheader` | "No NVIDIA GPU detected." |
| GPU passthrough works | `docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi` | "Docker GPU passthrough failed. Check NVIDIA Container Toolkit configuration." |
| Port available | Check `instanceMap` for port conflicts | "Port {port} is already in use by another instance." |
| Docker image present | `docker image inspect vllm/vllm-openai:{tag}` | "Image not found locally. Pull it first with the Update function." |
| Model path exists | `fs.existsSync(config.modelDir + "/" + config.modelName)` | "Model directory not found: {path}" |

GPU passthrough check is run **once at application startup**, not before every spawn (it takes ~5 seconds). Result is cached; a "Re-check" button is available in settings.

---

## Update Mechanism

The adapter exposes a version-check method that queries Docker Hub for available `vllm/vllm-openai` tags:

```javascript
async checkForUpdates(currentTag) {
  const res = await fetch(
    "https://hub.docker.com/v2/repositories/vllm/vllm-openai/tags?page_size=20&ordering=last_updated"
  );
  const data = await res.json();
  const tags = data.results.map(t => t.name).filter(t => t.match(/^v\d/));
  // Return the latest semantic version tag and whether it's newer than currentTag
  return { latestTag: tags[0], updateAvailable: tags[0] !== currentTag };
}

async pullImage(tag) {
  // Streams docker pull output as log lines to the UI
  return spawn("docker", ["pull", `vllm/vllm-openai:${tag}`], { stdio: "pipe" });
}
```

The pinned image tag is stored in `data/app_settings.json` alongside the llama.cpp version pin.

---

## Default Port

vLLM default port: **8000**. Stored as a default in the vLLM instance config template. Configurable per instance.

---

## Rejected Alternatives

**Bare vLLM in WSL venv:** Rejected. Process cleanup on WSL2 is unreliable (zombie workers after SIGINT, vLLM issue #39093). Docker provides clean container-level cleanup by construction. See `docs/research/vllm_deployment_triage.md`.

**`wsl.exe`-wrapped docker:** Rejected. Adds a quoting/proxy layer and requires manual nvidia-container-toolkit setup in the WSL distro. Docker Desktop handles all of this automatically.
