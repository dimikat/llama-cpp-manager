# Work Ticket: Per-Instance Single-Page Layout

**Ticket ID:** `wt_pC_tC.5_cc`
**Phase:** C (UI Overhaul — Instrument Panel Redesign)
**Complexity:** cc (Complex)
**Status:** Complete
**Depends on:** tC.1 (tokens), tC.2 (icons), tC.4 (tab bar)

---

## Objective

Restructure the main content area from the current 3-column absolute-positioned layout (config panel / main / metrics) into the Instrument Panel single-page layout defined in ADR-003. Each instance tab contains: collapsible left outline sidebar (surface-raised), main config area (surface-base), inline metrics panel, and log stream. This is the largest structural change in Phase C.

---

## Scope

**What's included:**
- **Remove the 3-column layout** — eliminate the current absolute-positioned `.config-panel`, `.main-content`, `.metrics-panel` structure
- **Remove the old config sidebar** — the left config list panel is replaced by instance tabs (tC.4)
- **New layout structure per instance tab:**
  ```
  ┌──────────────────────────────────────────────────────────────┐
  │ Tab body (instance content)                                   │
  ├─────────────────┬────────────────────────────────────────────┤
  │ Outline sidebar │ Main content area                          │
  │ (surface-raised)│ (surface-base)                             │
  │                 │                                             │
  │ ▸ Model         │  [Config form area — filled by tC.6]       │
  │ ▸ Performance   │                                             │
  │ ▸ Memory        │                                             │
  │ ▸ Concurrency   │                                             │
  │ ▸ Networking    │                                             │
  │ ▸ Speculative   │                                             │
  │ ▸ KV Transfer   │                                             │
  │ ▸ Advanced      │                                             │
  │                 ├────────────────────────────────────────────┤
  │                 │ Metrics panel (filled by tC.9)             │
  │                 ├────────────────────────────────────────────┤
  │                 │ Log stream (filled by tC.10)               │
  └─────────────────┴────────────────────────────────────────────┘
  ```
- **Left outline sidebar:**
  - Fixed-width (200px), surface-raised background, 1px right border in border color
  - Collapsible via ghost button (sidebar-toggle icon) in the form header area
  - Section labels in title typography (15px, weight 600)
  - Active section highlighted: text-primary + accent left indicator or background highlight
  - Scroll-spy: active section updates as user scrolls through config form
  - Hidden by default on viewports < 1200px
- **Main content area:** Fills remaining width. Scrollable vertically. Surface-base background.
- **Config form placeholder:** Structural container for accordion groups (tC.6). Empty shell in this ticket.
- **Metrics panel placeholder:** Structural container at bottom of main area (tC.9 fills content).
- **Log stream placeholder:** Structural container at bottom of main area (tC.10 fills content).
- **Instance header bar:** Top of tab body shows instance name/status + action buttons (Stop, Save, etc.)
- **Responsive behavior:** Sidebar collapses on narrow viewports. Main content fills full width.

**What's explicitly excluded:**
- Accordion flag group content (tC.6)
- Tooltip wiring (tC.7)
- Status indicators implementation (tC.8)
- Metrics panel content (tC.9)
- Log stream content (tC.10)
- Error state banner (tC.8)

---

## Acceptance Criteria

1. **3-column layout removed** — no more absolute-positioned config/metrics panels
2. **Per-instance layout** — each tab shows sidebar + main content structure per ADR-003
3. **Sidebar** is surface-raised with 1px right border, collapsible via toggle button
4. **Main area** fills remaining width, surface-base background, scrollable
5. **Scroll-spy** — as user scrolls main area, sidebar active section updates
6. **Instance header** shows model name, status, and action buttons (Stop/Save)
7. **Placeholder containers** exist for config form, metrics, and log stream (empty but correctly sized)
8. **Responsive** — sidebar hides below 1200px viewport width

---

## Test Plan

1. **Start the server** — `npm start`, open `http://localhost:3001`
2. **Layout structure** — verify sidebar on left (surface-raised), main content on right (surface-base)
3. **Sidebar toggle** — click toggle button, verify sidebar collapses/expands
4. **Scroll-spy** — if main content is tall enough to scroll, verify sidebar active section updates
5. **Instance header** — verify model name and action buttons appear at top of tab body
6. **Tab switching** — switch between instance tabs, verify each shows its own layout
7. **Responsive** — narrow browser to < 1200px, verify sidebar collapses
8. **No broken references** — no console errors from removed DOM elements

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Heavy JS coupling to old DOM structure — selectors, event listeners, element references
  - *Mitigation:* Audit `script.js` for all DOM queries referencing removed elements. Map each to new structure. This is the core of the complexity.

**Edge cases:**
- Old code may reference `.config-panel`, `.metrics-panel`, `.main-content` by class — all need updating
- The old config list (saved configs sidebar) is removed here; it returns in Phase D
- Scroll-spy requires Intersection Observer or scroll event listener — test performance with long config forms
- Multiple instances sharing the same layout template — verify state isolation between tabs

---

## Rollback Plan

1. Restore original `index.html`, `styles.css`, `script.js` from git
2. This is a large structural change — full file revert is cleanest

**Estimated rollback time:** Quick (< 2 minutes via git checkout)

---

## Notes

- This is the most complex ticket in Phase C — it touches nearly every line of layout HTML and much of the JS
- The old `index.html` has ~907 lines, much of it structural. Expect significant rewrite
- The approach should be: (1) build the new layout shell, (2) migrate existing form fields into placeholder containers, (3) remove old structure. Don't try to do all three at once.
- Reference: ADR-003 Single-Page Instance Tab Layout (lines 73-105)
- The sidebar section list matches the accordion group names (Model, Performance, Memory, etc.)
