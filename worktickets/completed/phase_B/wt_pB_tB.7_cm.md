# Work Ticket: Phase B Integration Validation

**Ticket ID:** `wt_pB_tB.7_cm`
**Phase:** B (VllmAdapter + Docker Integration)
**Complexity:** cm (Medium)
**Status:** Pending tB.1–tB.6 completion

---

## Objective

Register the `vllm` runtime in the adapter factory and validate the complete VllmAdapter lifecycle end-to-end. This is the Phase B gate — PM must confirm vLLM instances can be created, started, monitored, and stopped through the Instance Manager before Phase C (UI) begins.

---

## Scope

**What's included:**
- Register `vllm` in Instance Manager's `ADAPTER_FACTORIES` map
- End-to-end validation of the full VllmAdapter lifecycle through Instance Manager:
  - Create instance → start → waitForReady → collect metrics → stop → cleanup
- Validate pre-flight checks block invalid configurations
- Validate error paths: Docker not running, invalid image, invalid model path
- Validate Socket.io event flow: `instance:status`, `instance:log`, `instance:metrics`, `instance:error`, `instance:ready` all carry correct `instanceId`
- Verify update mechanism: checkForUpdates and pullImage are callable from the adapter
- Validate mixed runtime scenario: a llama.cpp instance and a vLLM instance running concurrently (if hardware allows)

**What's explicitly excluded:**
- UI changes (Phase C)
- Config persistence (Phase D)
- New HTTP API endpoints for vLLM-specific operations

---

## Acceptance Criteria

1. **`instanceManager.createInstance(id, 'vllm')` works** — creates entry with vllm adapter, no errors
2. **Full lifecycle works** — create → start → running → metrics flowing → stop → stopped
3. **Pre-flight checks block bad configs** — missing image, invalid path, Docker down all produce clear errors
4. **Metrics flow through Socket.io** — `instance:metrics` events carry vLLM Prometheus data
5. **Error recovery works** — failed start transitions to ERROR, dismissError resets to IDLE, can retry
6. **Mixed runtime** — llama.cpp instance and vLLM instance can coexist in the instance map without interference
7. **Update check works** — `checkForUpdates()` returns current Docker Hub state
8. **PM validates** the complete vLLM lifecycle and signs off on Phase B

---

## Test Plan

1. **Register vllm** — `node -e "const im = require('./instance-manager'); im.createInstance('test-vllm', 'vllm'); console.log(im.getInstance('test-vllm').runtime)"` → `vllm`
2. **Create vllm instance** — Via Node REPL or test script, create a vllm instance
3. **Preflight check** — Run preflight with a valid config, verify result
4. **Start vllm instance** — If Docker is available with a pulled image, start a vllm instance. Verify:
   - Status transitions: IDLE → LOADING → RUNNING
   - Log lines stream via `instance:log` events
   - Metrics poll and emit via `instance:metrics` events
5. **Stop vllm instance** — Stop the running instance. Verify:
   - Status transitions: RUNNING → STOPPING → STOPPED
   - Container is removed (`docker ps` shows no vllm-test container)
6. **Error path** — Attempt start with Docker stopped or invalid image. Verify ERROR state and clear error message.
7. **Mixed runtime** — Start a llama.cpp instance AND a vllm instance (if hardware allows). Verify both run independently, each with its own logs/metrics/status.
8. **Update check** — Call checkForUpdates with current pinned tag, verify result.
9. **PM signs off** — Confirms vLLM lifecycle is complete and reliable.

---

## Risks & Edge Cases

**Technical risks:**
- Risk: No Docker/GPU available for PM testing — can't validate the full lifecycle
  - *Mitigation:* Test the code paths that don't require Docker (create, preflight error, factory registration). For the full lifecycle, PM can validate when Docker is available.

**Edge cases:**
- Creating a vllm instance while a llama.cpp instance is running — should work (instance map is independent)
- Starting a vllm instance on the same port as a llama.cpp instance — preflight should catch the port conflict
- vLLM container crashes during weight loading — should transition to ERROR with relevant log lines

---

## Rollback Plan

If Phase B validation reveals fundamental issues:

1. Remove `vllm` from `ADAPTER_FACTORIES` in instance-manager.js
2. Phase B code remains but is inert (no runtime can invoke it)

**Estimated rollback time:** Quick

---

## Notes

- This is the final wiring + validation ticket — no new adapter code, just registration and testing
- The mixed-runtime test (llama.cpp + vLLM concurrently) is the key validation that the Phase A architecture supports multiple runtimes as designed
- If the PM doesn't have Docker Desktop + a vLLM image available, we can validate the registration, preflight error paths, and mock the lifecycle. Full E2E validation happens when Docker is set up.
- Phase C (UI) cannot start until this ticket is validated — the UI needs a working backend for both runtimes
