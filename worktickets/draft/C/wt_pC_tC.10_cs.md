# Work Ticket: Log Stream Panel

**Ticket ID:** `wt_pC_tC.10_cs`
**Phase:** C (UI Overhaul — Instrument Panel Redesign)
**Complexity:** cs (Simple)
**Status:** Draft
**Depends on:** tC.5 (layout shell), tC.1 (design tokens)

---

## Objective

Redesign the log output panel to sit at the bottom of each instance tab body. Warm-tinted dark surface (not green-on-black), mono font, scrollable, 500-line buffer. Per-instance log streams driven by Socket.io `instance:log` events.

---

## Scope

**What's included:**
- **Log panel** positioned at the bottom of the tab body, below the metrics panel
- **Visual style:**
  - Background: surface-base (#1A1917) — same as main area, NOT green-on-black
  - Text: text-primary (#E8E4DC) — warm off-white, NOT terminal green
  - Font: IBM Plex Mono (mono typography token) at 12px
  - No "hacker terminal" aesthetic — this is warm-tinted dark, matching the rest of the Instrument Panel
- **Scrollable container:** Fixed height (configurable, ~200px default), overflow-y scroll
  - Auto-scrolls to bottom on new log lines (unless user has scrolled up)
  - When user scrolls up, auto-scroll pauses — resume when scrolled to bottom
- **Line buffer:** Last 500 lines per instance. Older lines removed from DOM to prevent memory growth.
- **Per-instance isolation:** Each tab shows only its instance's log stream
- **Socket.io binding:** `instance:log` events append lines to the correct instance's log panel
- **Timestamp formatting:** Optional — show timestamp per line if the backend provides it (currently it does for llama.cpp)
- **Line styling:** Error/warning lines can use status-error/status-warn text color for visual scanning

**What's explicitly excluded:**
- Log filtering/searching (future enhancement)
- Log export/download (future enhancement)
- Log line expansion (click to expand long lines — future)

---

## Acceptance Criteria

1. **Log panel renders** at bottom of tab body, below metrics panel
2. **Surface-base background** — no green-on-black, warm-tinted dark
3. **Mono font** — IBM Plex Mono at 12px for all log text
4. **Scrollable** — panel scrolls vertically, auto-scrolls to bottom on new lines
5. **Auto-scroll pauses** when user scrolls up, resumes when scrolled back to bottom
6. **500-line buffer** — older lines removed from DOM
7. **Per-instance** — switching tabs shows correct instance logs
8. **Error lines** use status-error text color for visibility

---

## Test Plan

1. **Start the server** — `npm start`, open `http://localhost:3001`
2. **Log panel visible** — verify log area at bottom of tab body with surface-base bg
3. **Start an instance** — verify log lines stream into the panel in real-time
4. **Auto-scroll** — let logs accumulate, verify panel scrolls to show latest
5. **Pause auto-scroll** — scroll up in the log panel, verify new logs don't force scroll
6. **Resume auto-scroll** — scroll back to bottom, verify auto-scroll resumes
7. **Line buffer** — generate 500+ lines, verify oldest lines are removed
8. **Tab switching** — with two instances running, switch tabs, verify each shows its own logs
9. **Error lines** — trigger an error, verify error log line appears in status-error color

---

## Risks & Edge Cases

**Technical risks:**
- Risk: High-frequency log output during model loading may overwhelm DOM updates
  - *Mitigation:* Batch log updates — append to DOM every 100ms rather than on every event. Buffer lines in JS, flush periodically.

**Edge cases:**
- Very long log lines (e.g., a full JSON blob) — should wrap or truncate with horizontal scroll
- Multiple rapid events from different instances — ensure logs route to correct panels
- Log panel hidden when tab is inactive — buffer logs and flush when tab becomes active
- Empty log state (instance not started yet) — show subtle placeholder text ("No logs yet")

---

## Rollback Plan

1. Restore original log panel from git

**Estimated rollback time:** Quick (< 2 minutes)

---

## Notes

- This is the simplest Phase C ticket — scoped, self-contained, minimal dependencies
- The key design constraint: warm-tinted dark, NOT terminal green. This is explicitly called out in REDESIGN_PHASES.md C9
- The 500-line buffer prevents memory issues in long-running sessions
- Reference: REDESIGN_PHASES.md C9 (lines 89-91)
- Reference: DESIGN.md Mono Context Rule — log output is mono context (machine-readable text)
