# Work Ticket: Status Indicators & Feedback

**Ticket ID:** `wt_pC_tC.8_cm`
**Phase:** C (UI Overhaul — Instrument Panel Redesign)
**Complexity:** cm (Medium)
**Status:** Draft
**Depends on:** tC.1 (design tokens), tC.2 (SVG icons), tC.5 (layout)

---

## Objective

Implement the complete status indicator and feedback system: status dots, progress bars, token speed display, error state banner, and toast notifications. All per DESIGN.md component specifications.

---

## Scope

**What's included:**
- **Status dots:** 8px solid circles, no border. Color maps to status-ok (green), status-warn (amber), status-error (red), text-muted (gray for idle). Used in tab headers and instance header area.
- **Progress bars:** 6px height, surface-base background track. Filled portion uses single solid status color (no gradient). Color shifts through status scale (green → amber → red) based on threshold. Used for VRAM usage, context fill, GPU temperature.
- **Token speed display:** Mono font, label size. Value in status-ok color when performing normally. Shows `tok/s` format.
- **Error state banner:**
  - Persistent banner at top of tab body when instance enters ERROR state
  - surface-overlay background, 3px left border in status-error (#CC4F4F)
  - Body typography, status-error text for the message
  - Dismissible (closes error state, returns tab to IDLE)
  - Two ghost button actions: "View Logs" (scrolls to log panel) and "Restart" (resets to IDLE, pre-fills last config)
- **Toast notifications:**
  - surface-overlay background, 6px radius
  - 3px left border for type: status-ok (success), status-warn (warning), status-error (error)
  - Default informational: no left border
  - Auto-dismiss after 4 seconds for success/info
  - Persist for errors until dismissed manually
  - Stack vertically if multiple toasts fire
  - Dismiss button (x icon, ghost style)
- **Status-driven color logic:** JS helper that maps numeric thresholds to status colors (e.g., GPU temp < 70°C = ok, 70-85°C = warn, > 85°C = error)

**What's explicitly excluded:**
- Metrics panel layout (tC.9) — this ticket provides the building blocks, tC.9 assembles them
- Log stream panel (tC.10)

---

## Acceptance Criteria

1. **Status dots** render as 8px circles with correct color per state
2. **Progress bars** show 6px height, solid status color fill, no gradient
3. **Token speed** displays in mono font with status-ok color
4. **Error banner** appears when instance enters ERROR state, dismissible, with View Logs and Restart actions
5. **Toasts** appear with correct left border color per type, auto-dismiss for info, persist for errors
6. **Toast stacking** works when multiple toasts fire simultaneously
7. **Threshold color logic** correctly maps numeric values to ok/warn/error colors

---

## Test Plan

1. **Start the server** — `npm start`, open `http://localhost:3001`
2. **Status dots** — start/stop an instance, verify dot color changes (gray → amber → green → gray)
3. **Progress bar** — check VRAM usage bar appears with correct fill percentage and status color
4. **Error banner** — force an error (invalid model path), verify banner appears with error message
5. **Error dismiss** — click dismiss on error banner, verify it closes and status returns to IDLE
6. **View Logs** — click "View Logs" in error banner, verify page scrolls to log area
7. **Toast info** — trigger an informational toast (e.g., config saved), verify it auto-dismisses after 4s
8. **Toast error** — trigger an error toast, verify it persists until manually dismissed
9. **Toast stack** — trigger multiple toasts rapidly, verify they stack vertically

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Error state transitions may race with Socket.io events — banner flickers on rapid state changes
  - *Mitigation:* Debounce error banner display (100ms delay before showing)

**Edge cases:**
- Instance crashes during startup — error banner should show immediately in tab body
- Multiple error toasts from different instances — each toast should identify the instance
- Progress bars at 0% and 100% — should render correctly (empty bar, full bar)
- Toast during page load — should queue and display after DOM is ready

---

## Rollback Plan

1. Remove error banner, toast, and status indicator HTML/CSS/JS from this ticket
2. Original status display (if any) remains in git history

**Estimated rollback time:** Medium (< 5 minutes)

---

## Notes

- This ticket provides reusable status components consumed by tC.4 (tab dots), tC.9 (metrics), and tC.10 (log errors)
- Status dots in tab headers are wired in tC.4 but styled here — coordinate the 8px spec
- The error banner pattern replaces any existing error/alert UI in the current design
- Reference: DESIGN.md Status Indicators (lines 201-205), Toast Notifications (lines 223-226)
- Reference: ADR-003 Error State Banner (lines 166-178)
