# Work Ticket: Tab Bar with Instance Tabs

**Ticket ID:** `wt_pC_tC.4_cm`
**Phase:** C (UI Overhaul — Instrument Panel Redesign)
**Complexity:** cm (Medium)
**Status:** Draft
**Depends on:** tC.1 (design tokens), tC.2 (SVG icons)

---

## Objective

Replace the current config-tab navigation (Model, Performance, Multi-GPU, etc.) with a horizontal instance tab bar. Each tab represents one inference instance and shows a status dot, runtime badge, and model name. Includes a `[+ New Instance]` button and the runtime picker modal for new instance creation.

---

## Scope

**What's included:**
- **Tab bar HTML/CSS:** Horizontal bar at the top of the main content area. Full-width tabs flush to the bar, no rounded corners.
  - Active tab: text-primary color, 2px bottom border in accent (#C89038), transparent background
  - Inactive tab: text-secondary color, no bottom border, transparent background
  - Hover: text brightens to text-primary, subtle surface-hover background
- **Tab content per instance:**
  - Status dot: 8px solid circle, left of tab label. Green (running), amber (loading), red (error), gray (idle/stopped)
  - Runtime badge: small label-text chip (text-secondary, surface-raised bg) — `llama.cpp` or `vLLM`
  - Model name: text-primary, truncated with ellipsis if too long. "Untitled" when no model selected
- **`[+ New Instance]` button:** Right-aligned in tab bar, ghost button style, plus SVG icon + text
- **Runtime picker modal:** Floating dialog triggered by `[+ New Instance]`
  - surface-overlay background, shadow per Shadow-Is-Floating rule (0 4px 16px rgba(0,0,0,0.4))
  - Two options: vLLM card and llama.cpp card
  - Cards: surface-base bg, 1px border (#3A3937), hover shifts to surface-hover, selected gets accent border
  - Each card shows runtime name (title typography), short description (body typography)
  - Modal dismissed on selection or clicking outside
- **Tab switching logic in JS:** Clicking a tab shows that instance's content panel, hides others. Active tab styling updates.
- **Socket.io integration:** Tab state reflects instance status from backend (`instance:status` events drive the status dot color)

**What's explicitly excluded:**
- Tab body content (config form, metrics, logs — tC.5, tC.6, tC.8, tC.9)
- Instance creation backend logic (already exists from Phase A/B)
- Config persistence (Phase D)

---

## Acceptance Criteria

1. **Tab bar renders** horizontally at top of main content with correct styling (no rounded corners, correct spacing)
2. **Active tab** shows 2px accent bottom border, text-primary
3. **Inactive tab** shows text-secondary, no border, hover shows surface-hover bg
4. **Status dots** are 8px circles with correct color per instance state
5. **Runtime badges** show `llama.cpp` or `vLLM` as label chips
6. **`[+ New Instance]`** opens runtime picker modal with two options
7. **Runtime picker** closes on selection or outside click, creates a new tab
8. **Tab switching** shows/hides instance content panels correctly
9. **Socket.io driven** — status dot color updates on `instance:status` events

---

## Test Plan

1. **Start the server** — `npm start`, open `http://localhost:3001`
2. **Default tab** — verify one tab exists (the current llama.cpp instance) with gray status dot and runtime badge
3. **New instance** — click `[+ New Instance]`, verify modal appears with two runtime cards
4. **Select runtime** — click `llama.cpp`, verify new tab appears with correct badge
5. **Tab switching** — click between tabs, verify content panels swap correctly
6. **Status dot** — start an instance, verify dot turns green (running), then stop, verify gray (stopped)
7. **Hover states** — hover inactive tabs, verify text-primary + surface-hover
8. **Modal dismiss** — open runtime picker, click outside, verify it closes without creating a tab

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Current `script.js` tab logic is tightly coupled to config-tab names ("model", "performance", etc.)
  - *Mitigation:* Refactor tab data model to use instance IDs as keys. Existing tab switching code is replaced, not extended.

**Edge cases:**
- Many instances (5+) may overflow the tab bar — should scroll horizontally or truncate
- Tab for a crashed instance should show red dot but remain clickable
- Closing the last tab should show an empty state or auto-open new instance modal

---

## Rollback Plan

1. Restore original tab navigation HTML/CSS/JS from git
2. Old config-tab buttons return as before

**Estimated rollback time:** Medium (< 5 minutes via git checkout)

---

## Notes

- This is the first structural change — old config tabs (Model, Performance, Multi-GPU, etc.) are completely replaced by instance tabs. The config content that was in those tabs moves into accordion groups (tC.6)
- The tab bar replaces the current `.config-tabs` / `.tab-nav` section in `index.html`
- Reference: ADR-003 Tab Structure section (lines 34-69)
- Reference: DESIGN.md Instance Tabs component (lines 182-188)
