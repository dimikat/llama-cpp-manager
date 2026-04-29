# Work Ticket: Instance Manager Module

**Ticket ID:** `wt_pA_tA.3_cc`
**Phase:** A (Backend Instance Manager + LlamaCppAdapter Extraction)
**Complexity:** cc (Complex)
**Status:** Pending tA.1 & tA.2 approval

---

## Objective

Create the Instance Manager module that replaces the single `runningProcess` global with a keyed map of concurrent instances. This module is the central orchestrator: it manages instance lifecycle state machines, delegates to runtime adapters, and provides the API surface that server.js and Socket.io will consume.

---

## Scope

**What's included:**
- New file `instance-manager.js` containing:
  - `instanceMap` — Map<instanceId, InstanceMapEntry>
  - `createInstance(instanceId, runtime)` — creates a new entry with status IDLE, instantiates the correct adapter
  - `startInstance(instanceId, config)` — validates config, transitions IDLE→LOADING, calls adapter.spawn(), calls adapter.waitForReady(), transitions to RUNNING or ERROR
  - `stopInstance(instanceId)` — transitions RUNNING→STOPPING, calls adapter.stop(), transitions to STOPPED
  - `dismissError(instanceId)` — transitions ERROR→IDLE (keeps config, clears errorMessage)
  - `getInstance(instanceId)` — returns a read-only view of the instance entry
  - `listInstances()` — returns summary list of all instances
  - `removeInstance(instanceId)` — removes entry entirely (tab closed)
  - Lifecycle state machine enforcement (valid transitions only per ADR-001)
  - Log buffer management per instance (ring buffer, 500 lines)
  - Metrics interval management per instance (start/stop polling on state transitions)
- Event emission for all state transitions:
  - `status-changed` { instanceId, oldStatus, newStatus }
  - `log` { instanceId, line, timestamp }
  - `error` { instanceId, message, lastLines }
  - `ready` { instanceId, port }

**What's explicitly excluded:**
- Socket.io integration (tA.4)
- VllmAdapter registration (Phase B)
- HTTP API endpoints (tA.4 creates the bridge)
- UI changes

---

## Acceptance Criteria

1. **`instance-manager.js` exists** and exports the Instance Manager class/singleton
2. **instanceMap operations work** — create, get, list, remove entries correctly
3. **Lifecycle state machine is enforced** — invalid transitions throw (e.g., RUNNING→LOADING)
4. **startInstance delegates to adapter** — calls spawn() then waitForReady(), handles errors
5. **stopInstance delegates to adapter** — calls stop(), handles errors, ensures STOPPED state
6. **Log buffer per instance** — each instance maintains an independent 500-line ring buffer
7. **Events emit correctly** — state transitions and log lines emit typed events that a subscriber can listen to
8. **PM reviews** the module API and confirms it matches ADR-001

---

## Test Plan

1. **Create an instance** — Call `createInstance('test-123', 'llamacpp')`, verify entry exists in instanceMap with status IDLE
2. **List instances** — Verify `listInstances()` returns the created instance
3. **State machine validation** — Attempt invalid transitions (e.g., stopInstance on an IDLE instance), verify errors
4. **Full lifecycle** — Create → start (with a real llama.cpp config) → verify RUNNING → stop → verify STOPPED
5. **Error path** — Start with invalid config → verify ERROR state and error event
6. **Dismiss error** — Call `dismissError()` on an ERROR instance → verify IDLE state
7. **Log buffer** — Start an instance, generate logs, verify buffer contains lines and caps at 500
8. **PM confirms** the module interface matches expectations from ADR-001

---

## Risks & Edge Cases

**Technical risks:**
- Risk: waitForReady() timeout handling — if the server never becomes ready, the instance must transition to ERROR, not hang in LOADING forever
  - *Mitigation:* Implement configurable timeout (default 300s per ADR-002) with a clear error message
- Risk: Race condition between stop() and unexpected process exit
  - *Mitigation:* If process exits during STOPPING, treat as STOPPED (not ERROR)

**Edge cases:**
- User calls startInstance on an already-RUNNING instance — should be blocked by state machine (RUNNING→LOADING is invalid)
- Adapter emits log lines before the Instance Manager subscribes — use EventEmitter's buffered approach or subscribe before calling spawn()
- Multiple calls to stopInstance for the same instance — second call should be a no-op or return current status

---

## Rollback Plan

If this ticket needs to be reverted:

1. Delete `instance-manager.js`
2. Revert any server.js changes (should be minimal — just imports)

**Estimated rollback time:** Quick (< 2 minutes)

---

## Notes

- The Instance Manager is a singleton — one instance shared across the entire server process
- For Phase A, only `llamacpp` runtime is registered. VllmAdapter registration happens in Phase B.
- The adapter factory pattern: when `createInstance(id, runtime)` is called, it instantiates `LlamaCppAdapter` for `"llamacpp"`. The VllmAdapter mapping is added in Phase B.
- References: ADR-001 (full specification), server.js lines 19-21 (current runningProcess + connectedClients pattern being replaced)
