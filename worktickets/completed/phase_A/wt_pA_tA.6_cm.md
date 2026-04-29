# Work Ticket: Integration Validation — Phase A End-to-End

**Ticket ID:** `wt_pA_tA.6_cm`
**Phase:** A (Backend Instance Manager + LlamaCppAdapter Extraction)
**Complexity:** cm (Medium)
**Status:** Pending tA.1–tA.5 completion

---

## Objective

Validate that the Phase A refactor is complete and the existing llama.cpp workflow is fully preserved. This is the gate ticket — the PM must confirm that every existing feature works before Phase B (VllmAdapter) begins.

---

## Scope

**What's included:**
- Full end-to-end validation of existing features through the refactored backend:
  - Model discovery (GGUF scanning, multi-part detection)
  - Model loading (spawn, log streaming, readiness detection)
  - Performance metrics parsing (prompt eval, eval, context usage)
  - Model stopping (SIGTERM/SIGKILL, clean shutdown)
  - System metrics (CPU, RAM, GPU, VRAM)
  - Auto-updater (check, download, apply — blocked during runtime)
  - Configuration save/load (`user_configs.json`)
  - PWA functionality (manifest, service worker)
- Verify Instance Manager internals:
  - State machine transitions are correct (IDLE→LOADING→RUNNING→STOPPING→STOPPED)
  - Log buffer per instance works (replay on connect)
  - Error handling (invalid model path, spawn failure)
  - Socket.io room routing (new events carry instanceId)
- Verify backward compatibility:
  - Old events (`log-stream`, `server-ended`, `server-error`) still emitted
  - New events (`instance:log`, `instance:status`, etc.) also emitted
  - Existing script.js works without changes

**What's explicitly excluded:**
- New features (vLLM, multi-tab UI)
- Performance optimization
- Code cleanup beyond what Phase A tickets already specify

---

## Acceptance Criteria

1. **Full model lifecycle works** — Load a GGUF model, see logs, see metrics, stop it. All through existing UI.
2. **System metrics work** — CPU, RAM, GPU per-card metrics display correctly in UI
3. **Auto-updater works** — Check for updates, verify update is blocked while model is running
4. **Configuration works** — Save and load a config, verify it persists
5. **Instance Manager state is correct** — Verify via `GET /status` that instance status tracks the actual process state
6. **No regressions** — PM confirms every feature they currently use still works identically
7. **PM signs off** — This is the Phase A gate. Phase B cannot begin until PM validates.

---

## Test Plan

1. **Start application** — `npm start`, open `http://localhost:7112`
2. **Load a model** — Select a GGUF model from the list, configure basic params, click Start. Verify:
   - Logs appear in the UI log panel
   - Status changes to "running"
   - Performance metrics appear after sending a prompt
3. **Stop the model** — Click Stop. Verify:
   - Status changes to "stopped"
   - Process terminates
4. **System metrics** — Verify CPU, RAM, GPU metrics update in real-time
5. **Save a config** — Configure a model, save the config with a name
6. **Load saved config** — Load the saved config, verify form is populated
7. **Updater check** — Click "Check for updates". Verify it works.
8. **Browser dev tools** — Open console, verify both old and new Socket.io events are present
9. **PM final validation** — Confirm all of the above works as expected

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Subtle behavioral difference that wasn't caught by individual ticket validation
  - *Mitigation:* This ticket is specifically designed to catch those differences

**Edge cases:**
- Rapid start/stop cycling — verify state machine handles this correctly
- Browser refresh during model loading — verify reconnection and log buffer replay work

---

## Rollback Plan

If Phase A validation fails and the issues cannot be fixed quickly:

1. `git revert` all Phase A commits
2. Restore original server.js

**Estimated rollback time:** Moderate (requires re-validating the revert doesn't break anything)

---

## Notes

- This ticket does not involve writing new code — it's purely validation
- If validation reveals issues, they should be fixed as amendments to the relevant Phase A tickets (tA.1–tA.5), not as new tickets
- The PM should test with a real model (not just the UI shell) — the whole point is that llama.cpp integration is preserved
- Phase B cannot start until this ticket is marked complete by the PM
