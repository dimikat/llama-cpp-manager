# Work Ticket: Form Controls Redesign

**Ticket ID:** `wt_pC_tC.3_cm`
**Phase:** C (UI Overhaul — Instrument Panel Redesign)
**Complexity:** cm (Medium)
**Status:** Draft
**Depends on:** tC.1 (design tokens), tC.2 (SVG icons)

---

## Objective

Redesign all form controls (inputs, selects, checkboxes, buttons) to match the DESIGN.md component specifications. Surface-base backgrounds, 1px borders, 6px radius, accent focus rings, and the four button variants (primary, secondary, ghost, danger). This creates the control library that tC.6 (accordion) and tC.5 (layout) will consume.

---

## Scope

**What's included:**
- **Input fields:** surface-base background (#1A1917), 1px border in border color (#3A3937), 6px radius, 8px 12px padding. Focus: border shifts to accent (#C89038), no glow. Error: border shifts to status-error. Disabled: surface-raised background, text-muted color, opacity 0.6
- **Buttons — four variants:**
  - Primary: amber bg (#C89038), dark text (#1A1917), 6px radius, 8px 16px padding, weight 500. Hover: #D4A04C. No translate-y, no scale.
  - Secondary: transparent bg, text-primary, 1px border in border color. Hover: surface-hover bg.
  - Ghost: transparent bg, text-secondary, no border. Hover: text-primary.
  - Danger: transparent bg, status-error text, 1px border in status-error at 30% opacity. Hover: surface-hover bg.
- **Checkboxes:** custom-styled, accent fill when checked, 6px radius or rounded-square
- **Selects:** match input field styling (surface-base, 1px border, 6px radius)
- **Focus ring:** 2px offset focus ring in accent color on keyboard navigation (all interactive controls)
- **Disabled state:** opacity 0.4, cursor not-allowed across all controls
- **Transitions:** all state transitions use ease-out-quart (cubic-bezier(0.25, 1, 0.5, 1))
- **Preset buttons:** runtime-specific preset buttons rendered above config form, using ghost variant with accent text on hover

**What's explicitly excluded:**
- Accordion component (tC.6)
- Tab bar component (tC.4)
- Tooltip component (tC.7)
- New instance modal (part of tC.4)

---

## Acceptance Criteria

1. **All four button variants** render correctly with DESIGN.md specs
2. **Input fields** use surface-base bg, 1px border, 6px radius, accent focus
3. **No glow on focus** — clean border color shift only
4. **Checkboxes** custom-styled with accent fill when checked
5. **Selects** match input styling
6. **Disabled controls** show opacity 0.4, cursor not-allowed
7. **All transitions** use ease-out-quart
8. **Focus rings** visible on keyboard navigation (2px offset, accent color)

---

## Test Plan

1. **Start the server** — `npm start`, open `http://localhost:3001`
2. **Button audit** — locate each button variant, verify color, padding, radius, hover behavior
3. **Input focus** — tab through inputs, verify accent border appears, no box-shadow glow
4. **Error state** — if any validation exists, trigger error, verify red border
5. **Disabled state** — verify any disabled controls show muted appearance
6. **Checkbox** — check/uncheck, verify custom style with accent fill
7. **Select dropdown** — open a select, verify styling matches inputs
8. **Keyboard navigation** — tab through all controls, verify focus rings

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Existing JS adds/removes classes on controls dynamically — new CSS classes must account for this
  - *Mitigation:* Review script.js for dynamic class toggling on form elements

**Edge cases:**
- Browser default select dropdown styling is hard to override — may need a custom select wrapper
- File input (model path browse) may need custom styling since `<input type="file">` resists CSS
- Number inputs with spinners may need spinner styling or hiding

---

## Rollback Plan

1. Restore original form control styles from git

**Estimated rollback time:** Quick (< 2 minutes via git checkout)

---

## Notes

- This ticket creates the reusable control classes that later tickets consume. The HTML doesn't need to be fully restructured yet — apply new CSS classes to existing form elements
- The `.btn-primary`, `.btn-secondary` class names can be kept; their definitions change to match DESIGN.md
- Reference: DESIGN.md Components section (lines 170-199)
