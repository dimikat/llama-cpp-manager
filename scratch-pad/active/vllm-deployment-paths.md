# vLLM Deployment Paths on Windows + WSL2 — Decision Document

**Date:** 2026-04-24  
**Status:** Research  
**Author:** AI Technical Lead  

---

## 1. Executive Summary

**Recommendation: Path 1 (Docker Desktop + `vllm/vllm-openai`).** The official Docker container driven via `docker.exe` from the Windows host is the strongest choice. It gives the manager the simplest spawn interface (`docker run` / `docker stop`), eliminates Python environment management, provides clean process isolation, and has the most predictable update story (`docker pull`). The user has already validated this container works with their GPU setup, which de-risks the single hardest unknown: dual-GPU tensor parallel under WSL2.

**Main tradeoff:** Docker Desktop is a heavyweight dependency (~2 GB RAM baseline, separate daemon) and adds one more layer between the Node.js host and the vLLM process. However, since the manager will hide all Docker commands from the user, the UX cost is zero. The reliability and isolation gains outweigh the overhead.

**Confidence: Medium.** Tensor parallel across two consumer 3090s on WSL2 is the critical risk. WSL2 does not support CUDA peer-to-peer (P2P) transfers. NCCL will fall back to SHM-based communication, which works but may be slower and has been a source of hangs in some vLLM versions. This must be validated hands-on before committing. The user's prior success with this exact container is encouraging.

**Paths eliminated:** Path 2 (docker-in-WSL without Docker Desktop) adds manual nvidia-container-toolkit setup for no real gain over Path 1. Path 4 (conda) offers no meaningful advantage over Path 3 (venv). Both bare-metal paths (3 & 4) saddle the manager with Python environment lifecycle management and CUDA dependency alignment — problems Docker solves by construction.

---

## 2. Comparison Table

| Dimension | Path 1: Docker Desktop | Path 2: Docker-in-WSL | Path 3: Bare venv | Path 4: Conda |
|---|---|---|---|---|
| **Spawn simplicity** | Excellent. `docker run` from Windows. Single command string. | Good. `wsl.exe -d <distro> -- docker run`. Extra quoting layer. | Fair. `wsl.exe -d <distro> -- /path/to/venv/bin/python -m vllm ...`. Fragile quoting. | Same as venv. No meaningful difference. |
| **Log drivability** | Good. `docker logs -f <container>` streams stdout/stderr. Docker adds minimal buffering. | Same as Path 1 once docker is inside WSL. | Fair. `wsl.exe` pipes stdout/stderr with line buffering. Must set `PYTHONUNBUFFERED=1`. | Same as venv. |
| **Model file access** | `-v /mnt/e/models:/models` mount. Known to be ~30-50% slower than native WSL fs for large sequential reads. Same issue for all paths that read from `/mnt/e/`. | Same mount, same performance. | `/mnt/e/models/...` direct access via 9P filesystem. Slow for multi-GB loads. | Same as venv. |
| **Dual-GPU reliability** | `--gpus all` + `--ipc=host`. Docker Desktop WSL2 backend handles GPU passthrough. User has prior success. | Same GPU passthrough, but must manually install nvidia-container-toolkit in the distro. More failure points. | Works if NCCL is installed. No P2P on WSL2 regardless of path — NCCL falls back to SHM. `--ipc=host` equivalent is default in bare-metal. | Same as venv. |
| **Lifecycle cleanliness** | Excellent. `docker stop` (SIGTERM) then `docker rm`. Container isolation guarantees cleanup. Lingering processes stay in container. | Same as Path 1. | Poor. vLLM spawns multiple child processes (EngineCore, workers). On WSL2, SIGINT often leaves zombie processes requiring `pkill -9` (issue #39093). | Same as venv. |
| **Update ease** | `docker pull vllm/vllm-openai:<tag>`. Pin by tag, rollback by pulling previous tag. No dependency conflicts. | Same Docker pull. | `pip install vllm==<version>`. Can break if CUDA/PyTorch versions drift. Slower (may recompile kernels). | Same as venv but with conda solver overhead. |
| **Pre-flight complexity** | Check: Docker Desktop running, NVIDIA driver, WSL2 kernel, container toolkit (bundled with Docker Desktop). | All of Path 1 plus: docker daemon in WSL, nvidia-container-toolkit in distro. | Check: WSL distro exists, Python version, venv exists, vllm installed, CUDA libs present, NCCL present. | Same as venv plus conda runtime. |
| **Install footprint** | Docker Desktop (~4 GB), NVIDIA Windows driver. That's it. | NVIDIA driver, WSL distro, Docker CE in WSL, nvidia-container-toolkit. | NVIDIA driver, WSL distro, Python 3.10-3.13, venv with vllm+deps (~5-10 GB), CUDA toolkit (optional). | Same as venv but with miniconda (~400 MB) instead of venv. |
| **Overall rating** | **Recommended** | Acceptable fallback | Viable but fragile | Eliminated (no advantage) |

---

## 3. Per-Path Detail

### Path 1: Docker Desktop + `vllm/vllm-openai`

#### 3.1.1 Spawn Interface

```
spawn("docker", [
  "run",
  "--name", "vllm-manager-instance",
  "--runtime", "nvidia",
  "--gpus", "all",
  "-v", "E:\\models\\vllm:/models",
  "-p", "8000:8000",
  "--ipc=host",
  "-e", "PYTHONUNBUFFERED=1",
  "--rm",
  "vllm/vllm-openai:v0.19.0",
  "--model", "/models/Qwen3-30B-A3B",
  "--tensor-parallel-size", "2",
  "--dtype", "auto",
  "--api-key", "token-abc123"
])
```

Notes:
- `--runtime nvidia` is the Docker flag for NVIDIA GPU passthrough. On Docker Desktop with WSL2 backend, this is auto-configured.
- `--ipc=host` is **required** for tensor parallel. vLLM uses PyTorch multiprocessing with shared memory. Without this, NCCL and tensor parallel will hang or OOM ([vLLM Docker docs](https://docs.vllm.ai/en/stable/deployment/docker.html)).
- `--rm` auto-removes the container on exit. Use a fixed `--name` so the manager can target `docker stop` by name.
- `-v E:\\models\\vllm:/models`: Docker Desktop auto-translates Windows paths to WSL2 mounts. The path `E:\models\vllm` on Windows becomes accessible inside the container at `/models`. No manual `/mnt/e/` needed in the volume flag.
- `PYTHONUNBUFFERED=1`: Ensures Python stdout/stderr is not line-buffered, critical for real-time log streaming.

#### 3.1.2 stdout/stderr Behavior

`docker logs -f vllm-manager-instance` streams stdout and stderr from the container's main process. Docker captures these with minimal buffering. The manager can also stream logs by reading the spawned process's stdout directly — `docker run` without `-d` forwards container stdout to the caller's stdout.

**Live token/sec signal:** vLLM logs contain throughput metrics. On startup, look for lines like:
```
INFO:     Application startup complete.
```
This is the readiness signal. During inference, vLLM emits stats lines (if `--disable-log-stats` is not set) containing `avg_generation_throughput` and `avg_prompt_throughput`. These can be parsed from the live log stream.

**Buffering:** Docker adds a thin buffer layer but does not introduce significant latency for line-oriented output. With `PYTHONUNBUFFERED=1`, Python flushes after each line.

#### 3.1.3 Model File Access

Docker Desktop with WSL2 backend mounts Windows drives via the 9P protocol at `/mnt/e/` inside the WSL2 VM. When you use `-v E:\models\vllm:/models`, Docker translates this to a bind mount from the WSL2 VM's `/mnt/e/models/vllm` into the container.

**Performance concern:** The 9P filesystem used for `/mnt/` paths in WSL2 is significantly slower than the native ext4 filesystem inside WSL2. For sequential reads of multi-GB safetensors files, expect 30-50% slower I/O compared to files stored on the WSL2 native filesystem (`/home/<user>/models/`). However, this only affects model loading time (a one-time cost at startup), not inference throughput once weights are in GPU memory.

**Mitigation:** If startup time becomes unacceptable, the manager can offer an optional "stage to WSL filesystem" step: copy model files from `E:\` to a directory inside the WSL2 filesystem, then mount that directory instead. This is a future optimization, not a blocker.

#### 3.1.4 Dual-3090 / Tensor Parallel

**What's required:**
- `--gpus all` flag (passes both GPUs through)
- `--ipc=host` flag (shared memory for NCCL)
- `--tensor-parallel-size 2` flag to vLLM

**NCCL on WSL2:** WSL2 does **not** support CUDA peer-to-peer (P2P) memory access between GPUs. This is a fundamental WSL2 limitation documented by NVIDIA and Microsoft. NCCL detects the absence of P2P and falls back to shared-memory (SHM) transport, which uses the CPU as an intermediary. This works but is slower than P2P NVLink.

**No NVLink on ZOTAC 3090 Trinity:** The RTX 3090 supports NVLink in theory, but consumer cards require an NVLink bridge physically installed. The ZOTAC Gaming Trinity SKU does not ship with one, and the bridge connector position may not align across two cards depending on motherboard slot spacing. Without the bridge, P2P is PCIe-only, which WSL2 blocks anyway. Conclusion: **P2P will not be available regardless of path chosen.**

**Shared memory:** Docker's `--ipc=host` gives the container access to the host's (WSL2 VM's) shared memory segment, which is critical for NCCL's SHM fallback. Alternative: `--shm-size=8g` allocates a dedicated SHM segment. Either works; `--ipc=host` is simpler.

**3090-specific issues:** No known 3090-specific vLLM bugs. The 3090 has compute capability 8.6 (Ampere), which is well-supported by vLLM (minimum is 7.5). The main concern is 24 GB VRAM per card limiting model size — with TP=2 you get 48 GB total, enough for ~30B parameter models at FP16 or ~70B models at 4-bit quantization.

#### 3.1.5 Lifecycle Primitives

| Operation | Command | Notes |
|---|---|---|
| **Start** | `docker run --name vllm-manager-instance ...` | Returns immediately; manager must poll for readiness |
| **Stop (graceful)** | `docker stop vllm-manager-instance` | Sends SIGTERM, waits 10s, then SIGKILL |
| **Stop (forced)** | `docker kill vllm-manager-instance` | Sends SIGKILL immediately |
| **Health check** | `GET http://localhost:8000/health` | Returns 200 when server is ready |
| **Log tail** | `docker logs -f vllm-manager-instance` | Streams from container start |
| **Readiness detection** | Parse stdout for `Application startup complete` OR poll `GET /v1/models` until 200 | Both work; HTTP poll is more reliable |

**Readiness is the key lifecycle concern.** vLLM takes 30-120 seconds to load weights and initialize. During this time, the `/health` endpoint may return 503 or not respond at all. The manager should:
1. Spawn `docker run` and capture stdout.
2. Watch for `Application startup complete` in the log stream.
3. As a backup, poll `GET http://localhost:8000/health` every 2 seconds until it returns 200.
4. Only then transition the GUI to "running" state.

**Cleanup advantage:** When the container exits (gracefully or killed), all child processes are cleaned up by the container runtime. This avoids the WSL2 zombie-process problem documented in vLLM issue #39093.

#### 3.1.6 Update Mechanism

```
docker pull vllm/vllm-openai:v0.19.0    # pin specific version
docker pull vllm/vllm-openai:latest      # track latest
```

Version pinning is natural: use a specific tag. Rollback is `docker pull` of the previous tag. Docker images are self-contained — no dependency conflicts between versions.

The manager can check available versions by querying the Docker Hub API:
```
GET https://hub.docker.com/v2/repositories/vllm/vllm-openai/tags?page_size=20
```

#### 3.1.7 Pre-flight Checks

| Check | Command | Failure mode |
|---|---|---|
| Docker Desktop running | `docker info` exits 0 | Docker Desktop not started |
| WSL2 available | `wsl --status` contains "WSL2" | WSL not installed or v1 only |
| NVIDIA driver installed | `nvidia-smi` exits 0 on Windows | Driver missing or corrupted |
| GPU count >= 2 | `nvidia-smi --query-gpu=count --format=csv,noheader` returns 2+ | Only one GPU detected |
| GPU compute capability >= 7.5 | `nvidia-smi --query-gpu=compute_cap --format=csv,noheader` | GPU too old |
| Docker GPU passthrough | `docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi` exits 0 | nvidia-container-toolkit misconfigured |
| Port 8000 free | `netstat -an | findstr :8000` | Another process on port |
| Docker image available | `docker image inspect vllm/vllm-openai:v0.19.0` exits 0 | Need to pull image |
| Model file exists | `if exist "E:\models\vllm\<model_name>"` on Windows | Model path wrong |
| WSL2 memory adequate | Parse `%USERPROFILE%\.wslconfig` for `[wsl2]\n memory=` or default (50% host RAM) | Need >= 16 GB for large models |

#### 3.1.8 Common Failure Modes

1. **NCCL init hang** — NCCL fails to initialize across GPUs. Symptom: process hangs after "Initializing NCCL" with no further output. Cause: insufficient shared memory. Fix: `--ipc=host` or `--shm-size=8g`.
2. **CUDA driver/userspace mismatch** — Docker image CUDA version is newer than host driver. Symptom: `CUDA driver version is insufficient`. Fix: update NVIDIA Windows driver.
3. **OOM on weight loading** — Model exceeds GPU VRAM. Symptom: `torch.cuda.OutOfMemoryError` during `load_weights`. Fix: use smaller model or quantization.
4. **nvidia-container-toolkit missing** — Docker can't access GPUs. Symptom: `could not select device driver "" with capabilities: [[gpu]]`. Fix: ensure Docker Desktop's WSL2 backend is enabled (it bundles the toolkit).
5. **WSL2 memory limit** — Default WSL2 config allocates 50% of host RAM. For large models, NCCL buffers and weight loading may need more. Fix: set `memory=24GB` or higher in `%USERPROFILE%\.wslconfig`.
6. **Docker Desktop not running** — Most common pre-flight failure. The manager should check `docker info` before any spawn attempt.
7. **Port conflict** — Another vLLM instance or service on port 8000. The manager should use a configurable port.

Sources: [vLLM issue #39093](https://github.com/vllm-project/vllm/issues/39093), [vLLM issue #37883](https://github.com/vllm-project/vllm/issues/37883), [NVIDIA CUDA on WSL User Guide](https://docs.nvidia.com/cuda/wsl-user-guide/index.html), [vLLM Docker docs](https://docs.vllm.ai/en/stable/deployment/docker.html)

#### 3.1.9 Install / Provisioning Footprint

**Required (one-time user setup):**
1. **NVIDIA Windows driver** — Standard GeForce driver from nvidia.com. Must be recent enough for CUDA 12.x (R495+). The user already has this for llama.cpp.
2. **WSL2** — `wsl --install` (one command). The user has this already.
3. **Docker Desktop** — Download from docker.com, enable WSL2 backend in settings. ~4 GB install.
4. **Pull vLLM image** — `docker pull vllm/vllm-openai:v0.19.0`. ~10 GB download.

**Manager could validate all of the above** via the pre-flight checks. The manager could even bootstrap steps 3-4: check for Docker Desktop, prompt to install if missing, pull the image on first use.

**No CUDA toolkit needed in WSL.** The Docker image contains all CUDA libraries. No Python needed in WSL. No venv management. This is the key advantage.

---

### Path 2: Docker-in-WSL (no Docker Desktop)

Same as Path 1 in almost every dimension, with these differences:

#### 3.2.1 Spawn Interface

```
spawn("wsl.exe", [
  "-d", "Ubuntu",
  "--", "docker", "run",
  "--runtime", "nvidia",
  "--gpus", "all",
  "-v", "/mnt/e/models/vllm:/models",
  "-p", "8000:8000",
  "--ipc=host",
  "-e", "PYTHONUNBUFFERED=1",
  "vllm/vllm-openai:v0.19.0",
  "--model", "/models/Qwen3-30B-A3B",
  "--tensor-parallel-size", "2"
])
```

Key differences from Path 1:
- Invoked through `wsl.exe -d <distro>` — adds a quoting/proxy layer.
- Volume mount uses Linux path `/mnt/e/models/vllm` instead of Windows `E:\models\vllm`.
- User must install Docker CE + nvidia-container-toolkit **inside the WSL distro** manually. This is non-trivial and not something the manager can easily bootstrap.

#### 3.2.2 Why This Path Is Weaker

- **nvidia-container-toolkit installation inside WSL** requires adding NVIDIA's apt repository, installing `nvidia-container-toolkit`, configuring the Docker daemon, and restarting it. This is error-prone and distro-version-dependent.
- **Docker daemon lifecycle** — The user (or manager) must ensure `dockerd` is running inside WSL before issuing commands. Docker Desktop handles this automatically.
- **No gain over Path 1.** Docker Desktop's WSL2 backend runs containers in the same WSL2 VM. There is no performance difference.

**Verdict:** Keep as a documented alternative but do not recommend.

---

### Path 3: Bare vLLM in WSL venv

#### 3.3.1 Spawn Interface

```
spawn("wsl.exe", [
  "-d", "Ubuntu",
  "--",
  "/home/<user>/.venvs/vllm/bin/python",
  "-m", "vllm.entrypoints.openai.api_server",
  "--model", "/mnt/e/models/vllm/Qwen3-30B-A3B",
  "--tensor-parallel-size", "2",
  "--dtype", "auto",
  "--api-key", "token-abc123",
  "--host", "0.0.0.0",
  "--port", "8000"
], {
  env: { ...process.env, PYTHONUNBUFFERED: "1" }
})
```

Notes:
- `PYTHONUNBUFFERED=1` is **essential** — without it, Python buffers stdout and the manager won't see log lines in real-time.
- Path to venv Python must be exact and pre-validated.
- `wsl.exe` command-line quoting is finicky — arguments with spaces or special characters may need escaping.

#### 3.3.2 stdout/stderr Behavior

`wsl.exe` forwards the child process's stdout/stderr to the Windows caller. With `PYTHONUNBUFFERED=1`, lines appear in near-real-time. However, `wsl.exe` itself can introduce buffering at high volume. In practice, vLLM's log output is moderate (a few lines per second during startup, less during inference) so this is rarely an issue.

#### 3.3.3 Model File Access

Uses `/mnt/e/models/vllm/...` via the WSL2 9P filesystem. Same performance characteristics as Path 1 — slower than native ext4 but only affects model load time.

#### 3.3.4 Dual-GPU / Tensor Parallel

NCCL is installed as a Python package (`nccl` on PyPI, or bundled with vLLM). No P2P on WSL2 (same as all paths). The bare-metal path has no `--ipc=host` equivalent because it's not in a container — shared memory is already available.

**Known WSL2 issue:** vLLM detects WSL and sets `pin_memory=False` automatically (logged as `Using 'pin_memory=False' as WSL is detected. This may slow down the performance.`). This disables CUDA pinned memory, which can reduce data transfer throughput between CPU and GPU.

#### 3.3.5 Lifecycle — The Key Weakness

**Process cleanup on WSL2 is unreliable.** vLLM issue #39093 documents that after SIGINT, vLLM logs "Shutdown complete" and "Application shutdown complete" but leaves worker processes alive. The user must `pkill -9` to clean up.

For the manager, this means:
- Graceful stop (`SIGTERM` via `proc.kill()` on the Node.js `ChildProcess`) may not kill all vLLM workers.
- The manager must implement a **forced cleanup step**: after stopping the main process, run `wsl.exe -d Ubuntu -- pkill -f vllm` to ensure no orphans.
- This is a significant operational complexity that Docker avoids (containers clean up automatically).

#### 3.3.6 Update Mechanism

```
wsl.exe -d Ubuntu -- /home/<user>/.venvs/vllm/bin/pip install vllm==<version>
```

Pinning: `pip install vllm==0.19.0`. Rollback: `pip install vllm==0.18.0`.

**Risk:** pip may need to recompile CUDA kernels if the pre-built wheel's CUDA version doesn't match the installed PyTorch CUDA version. This can take 10-30 minutes on WSL2 (which has limited RAM by default). The vLLM docs explicitly warn: "it is recommended to install vLLM with a **fresh new** environment" to avoid binary incompatibility.

#### 3.3.7 Pre-flight Checks

Additional checks beyond Path 1:
- WSL distro exists and is running: `wsl.exe -l -v`
- Python version in venv: `wsl.exe -d Ubuntu -- /path/to/venv/bin/python --version`
- vLLM installed and importable: `wsl.exe -d Ubuntu -- /path/to/venv/bin/python -c "import vllm; print(vllm.__version__)"`
- NCCL available: `wsl.exe -d Ubuntu -- /path/to/venv/bin/python -c "import torch; print(torch.cuda.nccl.version())"`

The manager must also manage venv creation if it doesn't exist, adding provisioning complexity.

#### 3.3.8 Install Footprint

- NVIDIA Windows driver (already present)
- WSL2 + Ubuntu distro (already present)
- Python 3.10-3.13 in WSL
- venv with vLLM + dependencies (~5-10 GB)
- Potentially CUDA toolkit in WSL (if building from source)

**The manager cannot easily bootstrap this.** Python version management, venv creation, and CUDA library alignment are all manual steps. The vLLM installation docs recommend using `uv` for environment management, but this adds another dependency.

#### 3.3.9 Common Failure Modes (Additional to Path 1)

- **CUDA/PyTorch version mismatch** — vLLM wheel compiled against CUDA 12.9, but installed PyTorch was built for CUDA 12.4. Symptom: `OSError: libcuda.so.12: cannot open shared object file` or kernel crash. Fix: install matching PyTorch version.
- **NCCL not found** — vLLM tries to use NCCL but it's not in the venv. Symptom: `ModuleNotFoundError: No module named 'nccl'`. Fix: `pip install nccl`.
- **Build-from-source required** — If pre-built wheel doesn't match CUDA version, pip triggers source build. On WSL2 with default 50% memory limit, this can OOM during compilation. Fix: increase WSL2 memory in `.wslconfig`.

---

### Path 4: Bare vLLM in WSL conda env — Eliminated

No meaningful difference from Path 3 (venv) for our use case. Conda adds:
- ~400 MB for miniconda installer
- Slower environment solving
- A second package manager the manager must drive

The vLLM installation docs explicitly warn that conda can cause NCCL issues: "PyTorch installed via conda will statically link NCCL library, which can cause issues when vLLM tries to use NCCL."

**Verdict: Eliminated.** No advantage over venv, potential NCCL conflicts, and one more dependency to manage.

---

## 4. Open Questions

These require hands-on testing or user input to resolve:

1. **Confirm tensor parallel works on 2x RTX 3090 under WSL2.** The user reports success with the Docker container, but it's unclear if that was with `--tensor-parallel-size 2` or single-GPU. **Test:** `docker run --runtime nvidia --gpus all --ipc=host vllm/vllm-openai:latest --model <small-model> --tensor-parallel-size 2` and verify both GPUs are utilized via `nvidia-smi` inside the container.

2. **Verify NCCL SHM fallback performance.** Without P2P, tensor parallel goes through SHM. Measure actual throughput with and without TP=2 to quantify the benefit. If SHM fallback is too slow, TP=2 may not be worth the complexity and a single-GPU configuration may be preferable.

3. **Quantify `/mnt/e/` vs WSL-native filesystem performance for model loading.** Load a 15 GB safetensors model from `/mnt/e/models/` vs from `/home/<user>/models/` (copied to ext4) and measure the time difference. If the gap is >2x, consider an optional model staging step.

4. **Docker Desktop startup latency.** How long does `docker run` take from the moment Node.js spawns it to when the vLLM process starts inside the container? Docker Desktop's daemon adds overhead vs bare process launch. Measure this end-to-end.

5. **Port forwarding reliability.** Docker Desktop forwards container ports to `localhost` via its WSL2 integration. Verify that `http://localhost:8000` is reliably accessible from the Windows host (Node.js process) even after Docker Desktop restarts or the WSL2 VM recycles.

6. **WSL2 memory configuration.** What is the current `.wslconfig` memory setting? With 2x 3090 (48 GB combined VRAM), NCCL buffers, and model loading, the WSL2 VM may need >= 16 GB RAM allocated. Default is 50% of host RAM. If host has 32 GB RAM, default is 16 GB — may be tight.

7. **vLLM startup readiness signal reliability.** Does `Application startup complete` always appear in stdout, or can it be suppressed by logging configuration? The health endpoint (`GET /health`) is more reliable but requires HTTP polling. Which approach should the adapter use?

---

## 5. Sources

- [vLLM Docker deployment docs](https://docs.vllm.ai/en/stable/deployment/docker.html) — official Docker run flags, `--ipc=host` requirement for TP
- [vLLM GPU installation docs](https://docs.vllm.ai/en/stable/getting_started/installation/gpu.html) — OS requirements ("Linux"), CUDA compatibility, WSL memory warning
- [vLLM OpenAI-compatible server docs](https://docs.vllm.ai/en/stable/serving/openai_compatible_server.html) — server flags, API endpoints
- [NVIDIA CUDA on WSL User Guide](https://docs.nvidia.com/cuda/wsl-user-guide/index.html) — WSL2 GPU limitations, no P2P, no NVLink, NCCL version requirements
- [Microsoft: Enable NVIDIA CUDA on WSL2](https://learn.microsoft.com/en-us/windows/ai/directml/gpu-cuda-in-wsl) — setup requirements
- [Microsoft: Working across file systems](https://learn.microsoft.com/en-us/windows/wsl/filesystems) — `/mnt/` performance vs native WSL fs
- [vLLM issue #39093](https://github.com/vllm-project/vllm/issues/39093) — WSL2 process cleanup failure, zombie processes after SIGINT
- [vLLM issue #37883](https://github.com/vllm-project/vllm/issues/37883) — WSL2 `pin_memory=False` causing UVA offload crashes
- [vLLM issue #25837](https://github.com/vllm-project/vllm/issues/25837) — WSL2 EngineCore v1 initialization failure
