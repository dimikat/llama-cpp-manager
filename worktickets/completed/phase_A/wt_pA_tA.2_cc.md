# Work Ticket: Extract LlamaCppAdapter from server.js

**Ticket ID:** `wt_pA_tA.2_cc`
**Phase:** A (Backend Instance Manager + LlamaCppAdapter Extraction)
**Complexity:** cc (Complex)
**Status:** Pending tA.1 approval

---

## Objective

Extract all llama.cpp process lifecycle logic from server.js into a `LlamaCppAdapter` class that implements the `RuntimeAdapter` interface (tA.1). This is the largest and most critical refactor in Phase A — it moves ~400 lines of spawn/stop/log/metrics logic out of the monolithic server.js into a self-contained adapter without breaking existing functionality.

---

## Scope

**What's included:**
- New file `runtimes/llamacpp-adapter.js` implementing `RuntimeAdapter` for llama.cpp:
  - `spawn()` — wraps the existing `/start` endpoint logic (server.js lines 2249-2367): process spawn, multi-part model path handling, stdout/stderr streaming, close/error event handling
  - `stop()` — wraps the existing `/stop` endpoint logic (server.js lines 2369-2400): SIGTERM → SIGKILL escalation
  - `logs()` — provides log line streaming via EventEmitter
  - `waitForReady()` — detects llama.cpp server readiness from stdout (existing log marker patterns from `parsePerformanceMetrics`)
  - `buildArgs()` — maps an `InstanceConfig` to llama.cpp CLI arguments (including multi-part model handling)
  - `cleanup()` — no-op for llama.cpp (process-based, no containers to clean)
- Port existing `parsePerformanceMetrics()` function (server.js lines 251-296) into the adapter as a private method
- Port existing `parseContextUsage()` function (server.js lines 486-593) into the adapter as a private method
- Port existing `broadcastContextUpdate()` function (server.js lines 594-607) into the adapter (emit events instead of direct socket broadcast)
- Log buffer management (ring buffer, last 500 lines per instance) — currently implicit, make explicit per-adapter

**What's explicitly excluded:**
- Changes to the existing Socket.io event format (that's tA.4)
- Changes to the UI (script.js)
- VllmAdapter implementation (Phase B)
- Config file discovery, GGUF scanning, updater logic — those remain in server.js for now

---

## Acceptance Criteria

1. **`runtimes/llamacpp-adapter.js` exists** and extends `RuntimeAdapter` from tA.1
2. **All 6 interface methods are implemented** with real llama.cpp behavior (no stubs)
3. **spawn() correctly handles** multi-part model paths, stdout/stderr streaming, and process lifecycle events (close, error)
4. **stop() correctly handles** SIGTERM → SIGKILL escalation with 1-second timeout
5. **Performance metrics parsing** (prompt eval, eval tokens, context usage) is moved from server.js into the adapter
6. **Existing server.js `/start` and `/stop` endpoints still work** — they delegate to the adapter internally, but the HTTP API contract is unchanged
7. **No behavioral regression** — PM can start server, load a model, see logs and metrics, and stop the server exactly as before
8. **PM validates** by running the full existing workflow

---

## Test Plan

1. **Start the application** — `npm start`, verify no startup errors
2. **Load a model** — Use the existing UI to select a GGUF model and click Start. Verify model loads successfully.
3. **View logs** — Verify stdout/stderr log streaming works in the UI as before
4. **Check performance metrics** — Send a prompt and verify token/s metrics appear in the UI
5. **Stop the model** — Click Stop, verify the process terminates cleanly
6. **Test error case** — Start with an invalid model path, verify error handling works
7. **PM confirms** no behavioral differences from the pre-refactor version

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Extracting spawn logic may break the process reference tracking (runningProcess global is used in updater, status endpoint, etc.)
  - *Mitigation:* During Phase A, keep backward-compatible delegation in server.js. The adapter manages its own process reference; server.js can query it.
- Risk: `parsePerformanceMetrics` has side effects (emits socket events directly). Moving it into the adapter requires replacing direct socket access with event emission.
  - *Mitigation:* Adapter emits typed events; the Instance Manager (tA.3) will bridge those to Socket.io. For this ticket, emit via EventEmitter and have server.js subscribe.

**Edge cases:**
- Multi-part model path handling (`-00001-of-00005.gguf` → base `.gguf`) must be preserved exactly
- stderr sometimes contains performance data (not just stdout) — both streams must be parsed
- Process may exit during spawn before listeners are attached — handle race condition

---

## Rollback Plan

If this ticket needs to be reverted:

1. Revert server.js to pre-extraction state (git)
2. Delete `runtimes/llamacpp-adapter.js`

**Estimated rollback time:** Quick via git revert

---

## Notes

- This is the highest-risk ticket in Phase A — it touches the core process management flow
- Keep the existing HTTP API (`/start`, `/stop`) working during this refactor. They become thin wrappers that delegate to the adapter.
- The adapter should NOT import `io` (Socket.io) directly. It communicates via EventEmitter. Socket.io bridging happens in tA.4.
- The `runningProcess` global in server.js is temporarily kept for backward compatibility with the updater and status endpoints. It will be removed when the Instance Manager (tA.3) takes over.
- References: server.js lines 2248-2400 (spawn/stop), lines 251-607 (parsing functions)
