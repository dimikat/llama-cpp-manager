# Work Ticket: Floating UI Tooltips

**Ticket ID:** `wt_pC_tC.7_cs`
**Phase:** C (UI Overhaul — Instrument Panel Redesign)
**Complexity:** cs (Simple)
**Status:** Draft
**Depends on:** tC.1 (design tokens)

---

## Objective

Replace the current CSS tooltip system with `@floating-ui/dom` for viewport-aware tooltip positioning. Tooltip style per DESIGN.md: surface-overlay background, text-primary text, 6px radius, max-width 320px, floating shadow. This eliminates the ~40% viewport-clipping issue with the current implementation.

---

## Scope

**What's included:**
- Install `@floating-ui/dom` (or load from CDN in `index.html`)
- Replace current tooltip CSS classes (`.tooltip`, `::after`/`::before` pseudo-elements) with a single `.tooltip` element rendered in the DOM
- Tooltip visual style per DESIGN.md:
  - Background: surface-overlay (#2A2928)
  - Text: text-primary (#E8E4DC)
  - Radius: 6px
  - Padding: 8px 12px
  - Max-width: 320px
  - Shadow: 0 4px 16px rgba(0,0,0,0.4) — Shadow-Is-Floating rule
  - Typography: body size (13px)
  - Arrow: 6px CSS triangle matching background color
- Positioning with Floating UI:
  - `computePosition` with `placement: "top"` as default
  - Middleware: `offset(6)`, `flip()`, `shift({ padding: 8 })`
  - Flip to opposite side when not enough room
  - Shift to stay within viewport with 8px padding
- Show tooltip on hover/focus of elements with `[data-tooltip]` attribute
- Hide tooltip on mouse leave / blur
- Transition: fade in/out with opacity, ease-out-quart

**What's explicitly excluded:**
- Tooltip content changes — same text/descriptions as current, just repositioned
- New tooltips for new fields (that's the responsibility of whatever ticket adds those fields)

---

## Acceptance Criteria

1. **Floating UI loaded** — `@floating-ui/dom` is available (npm or CDN)
2. **Tooltips position correctly** — no clipping at any viewport edge
3. **Tooltip style** matches DESIGN.md specs (surface-overlay bg, text-primary, 6px radius, shadow)
4. **Flip behavior** — tooltip flips to opposite side when not enough room above
5. **Shift behavior** — tooltip slides to stay within viewport
6. **Arrow** — 6px CSS triangle pointing to trigger element
7. **Fade transition** — smooth opacity transition with ease-out-quart
8. **All existing tooltip elements** still show their content

---

## Test Plan

1. **Start the server** — `npm start`, open `http://localhost:3001`
2. **Hover a tooltip** — verify it appears above the element, fully visible
3. **Viewport edge** — scroll so a tooltip element is near the top of viewport, hover, verify tooltip flips below
4. **Right edge** — hover a tooltip element at the far right, verify it shifts to stay visible
5. **Visual style** — verify surface-overlay bg, correct text color, 6px radius, floating shadow
6. **Multiple tooltips** — hover several different tooltip triggers, verify all work
7. **Focus trigger** — tab to a tooltip trigger, verify tooltip appears on focus

---

## Risks & Edge Cases

**Technical risks:**
- Risk: CDN dependency may not load in offline PWA usage
  - *Mitigation:* Prefer npm install and serve locally via Express static

**Edge cases:**
- Tooltips on elements inside scrollable containers — Floating UI needs the scroll container as a boundary
- Tooltips on disabled elements — disabled inputs don't fire hover; may need wrapper element
- Multiple tooltips open simultaneously — ensure only one is visible at a time

---

## Rollback Plan

1. Restore original CSS tooltip system from git
2. Remove `@floating-ui/dom` dependency if npm-installed

**Estimated rollback time:** Quick (< 2 minutes)

---

## Notes

- Self-contained change — no impact on other components beyond the tooltip system
- This is one of the simplest Phase C tickets — well-scoped, minimal dependencies
- Reference: ADR-003 Tooltip Implementation section (lines 140-162)
- Reference: DESIGN.md Tooltips component (lines 217-221)
