# Work Ticket: Socket.io Event Bridge — Instance-Scoped Events

**Ticket ID:** `wt_pA_tA.4_cm`
**Phase:** A (Backend Instance Manager + LlamaCppAdapter Extraction)
**Complexity:** cm (Medium)
**Status:** Pending tA.3 approval

---

## Objective

Bridge the Instance Manager's EventEmitter-based events to Socket.io, routing all events by `instanceId`. Replace the current broadcast-to-all-cllients pattern (`connectedClients.forEach(client.emit(...))`) with instance-scoped rooms and the new event schema from ADR-001. Maintain backward compatibility with the existing UI during this phase.

---

## Scope

**What's included:**
- New Socket.io event handlers in server.js (or a new `socket-handlers.js` module):
  - **Browser → Server:** `instance:create`, `instance:start`, `instance:stop`, `instance:dismiss`
  - **Server → Browser:** `instance:status`, `instance:log`, `instance:metrics`, `instance:error`, `instance:ready`
- Socket.io room management — each instance gets a room keyed by `instanceId`. Browser joins/leaves rooms when switching tabs.
- Subscribe to Instance Manager events and emit to the correct Socket.io room
- Backward-compatible event translation:
  - Existing `log-stream` events → also emit as `instance:log` with instanceId
  - Existing `server-ended` → also emit as `instance:status` with status STOPPED
  - Existing `server-error` → also emit as `instance:error`
- Client connection tracking per instance (not just global list)
- Log buffer replay on connect — when a client joins an instance room, replay the last N log lines from the buffer

**What's explicitly excluded:**
- Frontend changes to consume the new event format (Phase C)
- Removing old event format — keep dual emission during Phase A for backward compatibility
- VllmAdapter-specific events (Phase B)

---

## Acceptance Criteria

1. **New Socket.io events are emitted** — `instance:status`, `instance:log`, `instance:metrics`, `instance:error`, `instance:ready` all carry `instanceId` as a top-level field
2. **Browser → Server events work** — `instance:create`, `instance:start`, `instance:stop`, `instance:dismiss` are received and processed by the Instance Manager
3. **Room-based routing** — Events for instance A are only sent to sockets that have joined room A
4. **Backward compatibility preserved** — Existing UI (`log-stream`, `server-ended`, `server-error`) still works without changes
5. **Log buffer replay** — When a client joins an instance room, it receives the last N log lines as a burst
6. **PM validates** by using the existing UI and confirming no behavioral changes

---

## Test Plan

1. **Start the application** — `npm start`, open browser
2. **Use existing UI to load a model** — Verify logs stream as before (`log-stream` events work)
3. **Check new events in browser console** — Open browser dev tools, verify `instance:log`, `instance:status` events are also being received
4. **Stop the model** — Verify both old and new stop events fire
5. **Test room isolation** — (Manual verification) Confirm events carry correct instanceId
6. **PM confirms** existing UI works identically, and new events are visible in dev tools

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Dual event emission (old + new format) doubles Socket.io traffic during Phase A
  - *Mitigation:* Acceptable overhead during migration; old events removed in Phase C when UI is updated

**Edge cases:**
- Client connects mid-instance-lifecycle — must replay log buffer and send current status
- Client disconnects and reconnects — must re-join instance rooms
- Multiple browser tabs for the same instance — all tabs should receive events via the same room

---

## Rollback Plan

If this ticket needs to be reverted:

1. Remove new event handlers from server.js
2. Revert to existing `connectedClients.forEach()` broadcast pattern

**Estimated rollback time:** Quick via git revert

---

## Notes

- The key pattern change: every event now carries `instanceId`. The existing events don't have this field.
- During Phase A, the browser sends `instance:start` with a fixed instanceId (e.g., `"default-llamacpp"`) to maintain the single-instance experience. The multi-tab UI in Phase C will generate UUIDs.
- Consider extracting socket handlers into a separate file (`socket-handlers.js`) to keep server.js manageable — it's already 2400+ lines.
- References: ADR-001 Socket.io Event Schema, server.js lines 2451-2463 (current WebSocket handling)
