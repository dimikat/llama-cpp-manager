# Work Ticket: VllmAdapter Stop, Cleanup & waitForReady

**Ticket ID:** `wt_pB_tB.3_cm`
**Phase:** B (VllmAdapter + Docker Integration)
**Complexity:** cm (Medium)
**Status:** Pending tB.2 approval

---

## Objective

Implement the remaining lifecycle methods: `stop()`, `cleanup()`, and `waitForReady()`. This gives VllmAdapter a complete lifecycle — spawn it, know when it's ready, stop it, and clean up.

---

## Scope

**What's included:**
- `stop(instanceId, timeoutMs)` implementation:
  - Execute `docker stop --time={seconds} vllm-{instanceId}`
  - `--rm` on the original `docker run` ensures auto-removal after stop
  - Grace period defaults to 10 seconds (configurable via timeoutMs)
  - If container doesn't exist, no-op (not an error)
- `cleanup(instanceId)` implementation:
  - Clear internal state: remove from `_containers`, `_emitters`, `_logBuffers` maps
  - No `docker rm` needed (handled by `--rm`)
- `waitForReady(instanceId, timeoutMs)` implementation:
  - **Primary:** Watch log lines for `Application startup complete.` marker
  - **Backup:** Poll `GET http://localhost:{port}/health` every 2 seconds
  - **Timeout:** Default 300 seconds (5 minutes) — vLLM weight loading is slow
  - Both mechanisms run in parallel; first one to trigger wins
  - Reject with clear error message on timeout

**What's explicitly excluded:**
- Changes to spawn() or logs() (tB.2)
- Pre-flight checks (tB.4)
- Metrics collection (tB.5)

---

## Acceptance Criteria

1. **`stop()` issues `docker stop` with correct container name** — `vllm-{instanceId}`
2. **`stop()` timeout is configurable** — defaults to 10s, passed through to `--time` flag
3. **`stop()` is a no-op if container doesn't exist** — no error thrown
4. **`cleanup()` clears all internal maps** — _containers, _emitters, _logBuffers for the instance
5. **`waitForReady` resolves on log marker** — `Application startup complete.` in any stdout/stderr line
6. **`waitForReady` resolves on health poll** — GET /health returns 200
7. **`waitForReady` rejects on timeout** — after 300s default, with descriptive error
8. **Only one resolution mechanism fires** — if log marker fires first, health poll is cleaned up, and vice versa

---

## Test Plan

1. **stop with running container** — Spawn a container (if Docker available), call stop(), verify `docker stop` is issued and process resolves
2. **stop with no container** — Call stop() on an instanceId with no running container, verify it returns without error
3. **waitForReady with mock log** — Subscribe to the emitter, emit a fake log line containing `Application startup complete.`, verify waitForReady resolves
4. **waitForReady timeout** — Call waitForReady with a short timeout (e.g., 500ms), verify it rejects with timeout error
5. **cleanup clears state** — Call cleanup, verify internal maps no longer contain the instanceId
6. **PM validates** lifecycle completeness — spawn → waitForReady → stop → cleanup flows correctly

---

## Risks & Edge Cases

**Technical risks:**
- Risk: `waitForReady` health poll uses `fetch()` — ensure Node.js version supports it (18+). If not, use `http.get` fallback.
  - *Mitigation:* Check Node version. The project likely runs Node 18+ given the stack.
- Risk: Race between log marker and health poll — both could resolve simultaneously
  - *Mitigation:* Use a `settled` flag (same pattern as LlamaCppAdapter spawn)

**Edge cases:**
- Container exits during waitForReady — should reject with the exit info, not hang
- Multiple calls to stop() — second call should be a no-op
- Port not yet bound when health poll starts — fetch will fail, which is expected; poll retries

---

## Rollback Plan

1. Revert stop/cleanup/waitForReady to stubs in `vllm-adapter.js`

**Estimated rollback time:** Quick via git

---

## Notes

- `waitForReady` is the most complex method — it runs two concurrent detection mechanisms and must clean up both on resolution
- The 300s default timeout is deliberately generous — vLLM with 30B+ models on dual GPU can take 60-120 seconds for weight loading
- `docker stop` sends SIGTERM to the container's PID 1, waits the grace period, then SIGKILL. Combined with `--rm`, this provides clean lifecycle management
- Reference: ADR-002 Readiness Detection and Stop Sequence sections
