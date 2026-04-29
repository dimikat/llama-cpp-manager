# Validation: wt_pA_tA.6_cm — Phase A Integration Validation

**Ticket:** Integration Validation — Phase A End-to-End
**Date:** 2026-04-27

---

## Automated Pre-Checks (All PASS)

| Check | Result |
|-------|--------|
| No stale references (`runningProcess`, `connectedClients`, `llamacppAdapter`, `parsePerformanceMetrics`, etc.) in server.js | PASS |
| `runtimes/` module loads (RuntimeAdapter, InstanceStatus, LlamaCppAdapter) | PASS |
| LlamaCppAdapter extends RuntimeAdapter, all 6 methods present | PASS |
| `socket-handlers.js` exports setupSocketHandlers | PASS |
| Server starts on `http://localhost:7112` | PASS |
| `GET /status` returns `{"running":false}` | PASS |
| `GET /metrics` returns cpu/ram/history | PASS |
| `GET /models` returns `{success: true, models: [...]}` | PASS |
| Instance Manager: error path (invalid binary) → ERROR state, errorMessage set | PASS |
| Instance Manager: dismissError → IDLE | PASS |
| Instance Manager: removeInstance cleans up | PASS |
| State machine: IDLE→LOADING→ERROR transition fires correct events | PASS |
| Retry after error: dismiss + re-start works | PASS |

---

## PM Manual Validation Steps

### 1. Start the application
```
npm start
```
Open `http://localhost:7112` in browser.
**Expected:** UI loads normally, no console errors.

### 2. Load a model
- Select a GGUF model from the list
- Click Start
**Expected:**
- Logs appear in the UI log panel
- Status changes to "running"
- `http://localhost:7112/status` returns `{"running":true}`

### 3. Verify performance metrics
- Send a prompt to the loaded model
**Expected:** Token/s speed and context usage metrics appear in the UI

### 4. Stop the model
- Click Stop
**Expected:**
- Status changes to "stopped"
- Process terminates cleanly
- `http://localhost:7112/status` returns `{"running":false}`

### 5. System metrics
- Verify CPU, RAM, GPU metrics update in real-time in the UI sidebar

### 6. Configuration save/load
- Configure a model, save the config with a name
- Load the saved config, verify form is populated

### 7. Updater check
- Click "Check for updates" — verify it works

### 8. Browser DevTools — verify both old and new events
Open browser console (F12) and run:
```javascript
socket = io();
socket.on('instance:status', d => console.log('NEW instance:status', d));
socket.on('instance:log', d => console.log('NEW instance:log', d));
socket.on('log-stream', d => console.log('OLD log-stream', d.type));
socket.emit('instance:join', 'default-llamacpp');
```
Then load a model. **Expected:** Both old (`log-stream`) and new (`instance:log`, `instance:status`) events appear.

### 9. Error handling
- Start with an invalid model path
**Expected:** Error is shown in UI, server recovers gracefully. Can retry with valid path.

### 10. PM Final Sign-Off
- Confirm every feature works identically to the pre-Phase-A version
- Phase B (VllmAdapter) cannot begin until this ticket is validated

---

## Files Changed in Phase A

| File | Action | Ticket |
|------|--------|--------|
| `runtimes/adapter-interface.js` | Created | tA.1 |
| `runtimes/instance-types.js` | Created | tA.1 |
| `runtimes/index.js` | Created | tA.1 |
| `runtimes/llamacpp-adapter.js` | Created | tA.2 |
| `instance-manager.js` | Created | tA.3 |
| `socket-handlers.js` | Created | tA.4 |
| `server.js` | Modified | tA.2–tA.5 |

## Key Architectural Changes

- **Before:** Single `runningProcess` global, direct `child_process.spawn`, broadcast to all clients
- **After:** Instance Manager with state machine, RuntimeAdapter interface, Socket.io room-based routing, per-instance log buffers
- **Backward compatible:** Old event names (`log-stream`, `server-ended`, `server-error`, `token-speed`, `context-update`, `context-size`) still emitted alongside new instance-scoped events
