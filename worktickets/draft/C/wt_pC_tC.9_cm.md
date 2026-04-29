# Work Ticket: Metrics Panel Redesign

**Ticket ID:** `wt_pC_tC.9_cm`
**Phase:** C (UI Overhaul — Instrument Panel Redesign)
**Complexity:** cm (Medium)
**Status:** Draft
**Depends on:** tC.5 (layout shell), tC.8 (status indicators)

---

## Objective

Redesign the metrics panel from the current right-side column into an inline per-instance panel that sits within the instance tab body. GPU temp indicators, VRAM usage bars, CPU/RAM graphs, and token speed — all styled with DESIGN.md status colors and mono fonts for values.

---

## Scope

**What's included:**
- **Inline metrics panel** positioned below the config form area, above the log stream, within the tab body (not a separate column)
- **Metrics content per instance:**
  - GPU temperature indicators (per GPU) with status-colored threshold markers
  - VRAM usage bars (6px progress bars from tC.8) showing used/total
  - CPU usage percentage
  - RAM usage percentage
  - Token generation speed (tok/s, mono font, label size)
  - KV cache utilization percentage
  - Context fill percentage
- **Layout:** Horizontal row of metric cards or compact inline gauges. Not a tall right-column — this is a horizontal strip.
- **Styling:**
  - Values in mono font (IBM Plex Mono)
  - Labels in label typography (12px, weight 500)
  - Status colors from threshold logic (tC.8)
  - surface-base background (same as main area — no extra surface layer)
  - Minimal chrome — metric name, value, optional bar, no card borders unless needed for separation
- **Socket.io data binding:** Metrics update in real-time from `instance:metrics` events
- **Per-instance isolation:** Each tab shows only its instance's metrics
- **vLLM vs llama.cpp metrics:** Both render relevant metrics. llama.cpp metrics from process stats; vLLM metrics from Prometheus endpoint (parsed in Phase B).

**What's explicitly excluded:**
- Historical metric graphs (time-series) — v1 shows current values only
- The old right-column metrics panel removal (handled in tC.5 layout restructure)

---

## Acceptance Criteria

1. **Metrics panel renders** inline within tab body, below config form, above log stream
2. **GPU temperature** shows per-GPU with status-colored indicator
3. **VRAM usage** shows progress bar with percentage and status color
4. **Token speed** displays in mono font with value and unit
5. **Real-time updates** — metrics refresh from Socket.io events without page reload
6. **Per-instance** — switching tabs shows correct instance metrics
7. **Mono font** for all numeric values, label font for metric names
8. **Status colors** applied per threshold logic from tC.8

---

## Test Plan

1. **Start the server** — `npm start`, open `http://localhost:3001`
2. **Metrics visible** — verify metrics panel appears in correct position within tab body
3. **Start an instance** — verify metrics populate with real values once running
4. **GPU metrics** — if NVIDIA GPU present, verify temperature and VRAM bars show
5. **Token speed** — verify tok/s displays in mono font
6. **Real-time** — watch metrics for 30 seconds, verify they update without flicker
7. **Status colors** — verify normal values are green, high values shift to amber/red
8. **Tab switching** — with two instances, switch tabs, verify metrics swap correctly

---

## Risks & Edge Cases

**Technical risks:**
- Risk: vLLM Prometheus metrics format differs significantly from llama.cpp metrics
  - *Mitigation:* Phase B already normalizes metrics into a common shape — consume that normalized format

**Edge cases:**
- No GPU detected — should show "No GPU" or omit GPU metrics gracefully
- Multiple GPUs — should show metrics per GPU, not just first
- Instance not started — metrics panel should show empty/zero state, not error
- Very high metric update frequency — throttle DOM updates to avoid jank (max 1 update/second)

---

## Rollback Plan

1. Restore original metrics panel from git (right-side column)

**Estimated rollback time:** Quick (< 2 minutes via git checkout)

---

## Notes

- The metrics panel is a horizontal strip, not a column — this is a key visual difference from the current design
- This ticket uses status indicators (dots, bars, threshold colors) from tC.8 — ensure that ticket is validated first
- For AMD/Intel GPUs without nvidia-smi, the existing simulated metrics continue to apply — this ticket doesn't change the data source, only the presentation
- Reference: ADR-003 layout diagram showing "Metrics Panel" position (lines 94-97)
