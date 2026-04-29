# Work Ticket: vLLM Pre-flight Validation Checks

**Ticket ID:** `wt_pB_tB.4_cm`
**Phase:** B (VllmAdapter + Docker Integration)
**Complexity:** cm (Medium)
**Status:** Pending tB.1 approval (independent of tB.2/tB.3)

---

## Objective

Implement all 7 pre-flight validation checks from ADR-002. These run before every spawn attempt and produce clear, user-readable error messages shown in the instance tab. Without pre-flights, users get cryptic Docker errors with no guidance.

---

## Scope

**What's included:**
- New method on VllmAdapter: `preflight(config)` — runs all checks, returns `{ ok: true }` or `{ ok: false, errors: string[] }`
- 7 checks, each with a specific command and failure message:

| Check | Command | Failure message |
|---|---|---|
| Docker Desktop running | `docker info` exits 0 | "Docker Desktop is not running. Please start Docker Desktop and try again." |
| NVIDIA driver on host | `nvidia-smi` exits 0 | "NVIDIA driver not detected. Ensure the GeForce driver is installed." |
| GPU count >= 1 | `nvidia-smi --query-gpu=count --format=csv,noheader` | "No NVIDIA GPU detected." |
| Port available | Check instanceMap for port conflicts | "Port {port} is already in use by another instance." |
| Docker image present | `docker image inspect vllm/vllm-openai:{tag}` | "Image not found locally. Pull it first with the Update function." |
| Model path exists | `fs.existsSync(config.modelDir + "/" + config.modelName)` | "Model directory not found: {path}" |

- GPU passthrough check (runs once at app startup, cached):
  - `docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi`
  - Cached result with "Re-check" button support
  - Failure: "Docker GPU passthrough failed. Check NVIDIA Container Toolkit configuration."
- Expose `checkGpuPassthrough(force)` for the startup cache and re-check button
- Integration: Instance Manager calls `preflight()` before `spawn()` in `startInstance()`

**What's explicitly excluded:**
- UI for the Re-check button (Phase C)
- Changes to spawn/stop/waitForReady (tB.2, tB.3)

---

## Acceptance Criteria

1. **`preflight(config)` returns structured result** — `{ ok, errors }` format
2. **All 7 checks are implemented** with correct commands and error messages per ADR-002
3. **Checks run in order** — early exits on first failure (don't waste time on later checks if Docker isn't running)
4. **GPU passthrough check is cached** — runs once at startup, stored in a module-level variable
5. **`checkGpuPassthrough(force=false)` uses cache** — returns cached result unless `force=true`
6. **Port conflict check queries Instance Manager** — not just Docker, but the instanceMap for other instances using the same port
7. **Error messages are user-readable** — no stack traces or technical jargon in the returned messages
8. **Instance Manager integration** — `startInstance()` calls preflight before spawn, transitions to ERROR with preflight errors if checks fail

---

## Test Plan

1. **Preflight with Docker stopped** — Stop Docker Desktop, run preflight, verify "Docker Desktop is not running" error
2. **Preflight with Docker running but no image** — Run preflight with an image tag that isn't pulled, verify "Image not found locally" error
3. **Preflight with invalid model path** — Run preflight with a nonexistent modelDir, verify "Model directory not found" error
4. **Port conflict** — Create two instances with the same port, verify port conflict error on the second
5. **GPU passthrough cache** — Call checkGpuPassthrough twice, verify second call returns cached result (no Docker invocation)
6. **GPU passthrough force recheck** — Call checkGpuPassthrough(true), verify it re-runs the Docker test
7. **All checks pass** — With valid config and Docker + image ready, verify preflight returns `{ ok: true }`
8. **PM validates** error messages are clear enough for a non-technical user

---

## Risks & Edge Cases

**Technical risks:**
- Risk: GPU passthrough check takes ~5 seconds (spawns a container) — blocking startup
  - *Mitigation:* Run async at startup, don't block server start. Store as pending until resolved. `preflight()` waits for the result.
- Risk: `docker info` can take 2-3 seconds if Docker is starting up
  - *Mitigation:* Set a 10-second timeout on each check command

**Edge cases:**
- Docker is "starting" (exists but not ready) — `docker info` may hang or return partial output
- Multiple instances trying to use port 8000 — second one should fail preflight
- Image tag is empty/undefined — preflight should catch this before the docker image inspect

---

## Rollback Plan

1. Remove `preflight()` method and startup cache from VllmAdapter
2. Remove preflight call from Instance Manager's `startInstance()`

**Estimated rollback time:** Quick via git

---

## Notes

- This ticket can be developed in parallel with tB.2/tB.3 — it only depends on tB.1 (the adapter skeleton)
- Pre-flight checks are the user's first experience with vLLM — good error messages here prevent frustration
- The GPU passthrough check is expensive (~5 seconds). Running it once at startup and caching is critical for UX
- The port conflict check needs access to the Instance Manager's instanceMap — this means the adapter needs a reference to the manager, or the check is called from the manager itself. Design decision: keep preflight on the adapter but pass a `getInstances` callback, OR move port checking to the Instance Manager. Recommend the latter — the Instance Manager already has the data.
- Reference: ADR-002 Pre-flight Checks section
