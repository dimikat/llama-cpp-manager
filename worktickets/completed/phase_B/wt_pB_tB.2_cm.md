# Work Ticket: VllmAdapter Spawn + Docker Log Streaming

**Ticket ID:** `wt_pB_tB.2_cm`
**Phase:** B (VllmAdapter + Docker Integration)
**Complexity:** cm (Medium)
**Status:** Pending tB.1 approval

---

## Objective

Implement `spawn()` and `logs()` in VllmAdapter. This is the core "make a container run and stream its output" work — constructing the `docker run` command, handling container lifecycle, and piping stdout/stderr into the adapter's event system.

---

## Scope

**What's included:**
- `spawn(instanceId, config)` implementation:
  - Construct `docker run` args per ADR-002: `--name vllm-{instanceId}`, `--runtime nvidia`, `--gpus all`, `--ipc=host`, `-v` mount, `-p` port, `-e PYTHONUNBUFFERED=1`, `--rm`, image tag, + buildArgs output
  - Spawn via `child_process.spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] })`
  - Handle process events: `error` (docker not found), `close` (container exited)
  - Store spawned process reference in `_containers` map
- `logs(instanceId)` implementation:
  - Return the per-instance EventEmitter (same pattern as LlamaCppAdapter)
  - Emit `log` events with `{ data, type, timestamp }`
- Log buffer management (ring buffer, 500 lines) — reuse the same pattern from LlamaCppAdapter
- `_emitLog()` helper for consistent log handling

**What's explicitly excluded:**
- `waitForReady` (tB.3)
- `stop` and `cleanup` (tB.3)
- Pre-flight checks (tB.4) — spawn assumes Docker is available; pre-flights gate before spawn is called
- Metrics collection (tB.5)

---

## Acceptance Criteria

1. **`spawn()` constructs correct docker run command** — container name, GPU passthrough, IPC mode, volume mount, port mapping, env var, auto-remove flag, image tag, and vLLM args all present
2. **Volume mount uses host path from config** — `-v E:\models\vllm:/models` style (Docker Desktop translates Windows paths)
3. **`--ipc=host` is always set** — required for multi-GPU NCCL, unconditional
4. **`PYTHONUNBUFFERED=1` env var set** — ensures Python flushes stdout immediately
5. **`--rm` flag set** — auto-remove container on exit
6. **Stdout/stderr are piped and emitted as log events** — both streams produce `log` events
7. **`logs()` returns EventEmitter** — same interface contract as LlamaCppAdapter
8. **Process error/close events emit adapter events** — `spawn-error` and `close` events on the emitter
9. **PM reviews** the docker run construction against ADR-002

---

## Test Plan

1. **Module loads** — Verify VllmAdapter can be instantiated
2. **Docker run args inspection** — Call spawn with a config, capture the spawned command (mock `child_process.spawn` or inspect adapter internals), verify all docker flags are present
3. **Volume mount path** — Verify Windows host path appears in the `-v` argument
4. **Port mapping** — Verify `-p {port}:{port}` format
5. **Container naming** — Verify `--name vllm-{instanceId}` format
6. **Log emission** — If Docker is available, attempt a real spawn with a small image and verify log events emit. If Docker is unavailable, verify the error path works (docker not found → spawn-error event)
7. **PM validates** spawn command construction matches ADR-002 expectations

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Docker Desktop not running during development/testing — spawn will fail with ENOENT or docker error
  - *Mitigation:* The error path is important to test. Verify that spawn failures emit `spawn-error` and do not leave stale state.

**Edge cases:**
- Port already in use by another container — Docker will return an error on spawn; adapter must surface it
- Container name collision (same instanceId spawned twice) — Docker will refuse; adapter must handle
- Very long model paths with spaces — ensure quoting is handled by spawn (array args, not string)

---

## Rollback Plan

1. Revert spawn/logs implementations to stubs in `vllm-adapter.js`

**Estimated rollback time:** Quick via git

---

## Notes

- The `docker` command is invoked as `spawn('docker', args)` — on Windows with Docker Desktop, `docker.exe` is on PATH
- Windows path handling: `config.modelDir` is a Windows path (e.g., `E:\models\vllm`). Docker Desktop handles WSL2 translation automatically — no manual `/mnt/e/` conversion needed (per ADR-002)
- The `_containers` map stores the ChildProcess from `spawn('docker', ...)` — this is the docker client process, not the container itself. `docker stop` targets by container name, not PID
- Reference: ADR-002 Spawn Interface section
