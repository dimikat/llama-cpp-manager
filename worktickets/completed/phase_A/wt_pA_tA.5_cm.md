# Work Ticket: Wire Existing HTTP API Endpoints Through Instance Manager

**Ticket ID:** `wt_pA_tA.5_cm`
**Phase:** A (Backend Instance Manager + LlamaCppAdapter Extraction)
**Complexity:** cm (Medium)
**Status:** Pending tA.3 & tA.4 approval

---

## Objective

Refactor the existing HTTP API endpoints (`/start`, `/stop`, `/status`, `/metrics`, `/models`) in server.js to delegate through the Instance Manager instead of using the `runningProcess` global directly. The API contract remains identical — this is purely an internal routing change.

---

## Scope

**What's included:**
- Refactor `POST /start` — creates a default instance (if not exists) and calls `instanceManager.startInstance()` instead of spawning directly
- Refactor `POST /stop` — calls `instanceManager.stopInstance()` instead of killing `runningProcess` directly
- Refactor `GET /status` — queries `instanceManager.listInstances()` instead of checking `runningProcess`
- Refactor `GET /metrics` — delegates to per-instance metrics + existing system metrics
- Refactor `GET /models` — no change needed (model discovery is global, not per-instance)
- Remove the `runningProcess` global variable — replaced by Instance Manager state
- Remove the `connectedClients` array — replaced by Socket.io room-based tracking (tA.4)
- Updater (`/api/updater/*`) compatibility — updater checks if any instance is running instead of checking `runningProcess`

**What's explicitly excluded:**
- New instance-scoped API endpoints (e.g., `POST /api/instances/:id/start`) — deferred to Phase C
- VllmAdapter-specific endpoints (Phase B)
- Changes to the frontend (script.js) — the HTTP contract is unchanged

---

## Acceptance Criteria

1. **`POST /start` works** — Sends a model load request via existing UI, model loads successfully via Instance Manager
2. **`POST /stop` works** — Stops the running model via Instance Manager
3. **`GET /status` works** — Returns correct running/stopped state from Instance Manager
4. **`GET /metrics` works** — Returns system metrics as before
5. **Updater compatibility** — Updater correctly detects "server is running" and prevents updates during runtime
6. **`runningProcess` global is removed** from server.js — no direct process references remain
7. **`connectedClients` array is removed** from server.js — replaced by Socket.io rooms
8. **No API contract changes** — Existing script.js works without modification

---

## Test Plan

1. **Start the application** — `npm start`, verify no startup errors
2. **Full lifecycle via existing UI** — Select model → Start → verify logs stream → verify metrics → Stop → verify clean shutdown
3. **Status endpoint** — Visit `http://localhost:7112/status` — should show `{"running": false}`, then `{"running": true}` after starting a model
4. **Metrics endpoint** — Visit `http://localhost:7112/metrics` — should return system metrics JSON
5. **Updater block** — While a model is running, attempt to apply an update via `/api/updater/apply` — should be blocked with "Cannot apply update while server is running"
6. **Error handling** — Start with an invalid model path, verify error response
7. **PM confirms** the entire existing workflow works identically to before

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Updater checks `runningProcess` directly in multiple places (lines 2060, 2371, 2381, 2446) — all must be updated to query Instance Manager
  - *Mitigation:* Grep for all `runningProcess` references and update each one
- Risk: Default instance ID strategy — the existing UI doesn't send an instanceId, so the server must create a default one
  - *Mitigation:* If no instanceId provided, use a fixed default like `"default-llamacpp"`. The new UI (Phase C) will send UUIDs.

**Edge cases:**
- Existing saved configs in `user_configs.json` don't include `instanceId` — the default instance must be created implicitly on first `/start` call
- Multiple concurrent `/start` calls — Instance Manager state machine should prevent (LOADING→LOADING is invalid)

---

## Rollback Plan

If this ticket needs to be reverted:

1. `git revert` the server.js changes
2. Restore `runningProcess` global and `connectedClients` array

**Estimated rollback time:** Quick via git revert

---

## Notes

- This is the final wiring ticket that makes the Instance Manager the actual source of truth
- After this ticket, server.js no longer manages any process directly — it's purely an HTTP/Socket.io layer over the Instance Manager
- The default instance ID pattern (`"default-llamacpp"`) is temporary — it allows the existing single-instance UI to work with the multi-instance backend. Phase C replaces this with proper UUID generation.
- References: server.js lines 2248-2468 (all HTTP endpoints and WebSocket handling)
