# Work Ticket: Design Token Foundation

**Ticket ID:** `wt_pC_tC.1_cm`
**Phase:** C (UI Overhaul — Instrument Panel Redesign)
**Complexity:** cm (Medium)
**Status:** Draft
**Depends on:** Phase B complete (backend ready)

---

## Objective

Replace all hardcoded color, typography, spacing, and radius values in `public/styles.css` with CSS custom properties derived from the DESIGN.md frontmatter. Establish the warm-tinted dark-only surface hierarchy, status color scale, and typography stack. This is the foundation ticket — every subsequent Phase C ticket depends on these tokens being in place.

---

## Scope

**What's included:**
- Replace the existing `:root` and `[data-theme="dark"]` variable blocks with a single `:root` block containing all design tokens from DESIGN.md:
  - **Colors:** accent, accent-hover, surface-base, surface-raised, surface-overlay, surface-hover, border, border-strong, text-primary, text-secondary, text-muted, status-ok, status-warn, status-error
  - **Typography:** headline, title, body, label, mono (font-family, font-size, font-weight, line-height, letter-spacing where applicable)
  - **Spacing:** xs (4px), sm (8px), md (12px), lg (16px), xl (24px), xxl (32px)
  - **Rounded:** sm (4px), md (6px), lg (8px)
- Remove the light theme entirely — no `[data-theme]` selector, no theme toggle
- Remove the Roboto font import; add Plus Jakarta Sans and IBM Plex Mono via Google Fonts
- Update `body` to use body typography token (13px, Plus Jakarta Sans)
- Update `index.html` `<meta name="theme-color">` to `#1A1917` (surface-base)
- Replace all hardcoded hex values throughout `styles.css` with `var(--token-name)` references
- Remove the theme toggle button from `index.html` and its related JS handler in `script.js`
- Verify no pure grays (#333, #808080, #ccc, #fff, #000) remain — all neutrals must carry warm amber tint

**What's explicitly excluded:**
- Component-level redesign (tabs, accordions, etc. — later tickets)
- Layout restructuring (later tickets)
- SVG icon replacement (tC.2)
- New HTML structure (tC.5)

---

## Acceptance Criteria

1. **Single `:root` block** contains all design tokens from DESIGN.md frontmatter — no `[data-theme]` blocks exist
2. **No hardcoded hex colors** remain in `styles.css` except inside `:root` token definitions
3. **No pure grays** — every neutral color uses a warm-tinted token value (chroma in amber direction)
4. **Theme toggle removed** — button gone from HTML, handler gone from JS
5. **Font stack updated** — Plus Jakarta Sans loaded, IBM Plex Mono loaded, Roboto import removed
6. **Visual baseline preserved** — existing UI renders without broken layout (colors will shift to warm-tinted dark; this is expected and correct)

---

## Test Plan

1. **Start the server** — `npm start`, open `http://localhost:3001`
2. **Verify dark-only** — page renders in dark theme with warm-tinted neutrals (no pure grays)
3. **No theme toggle** — confirm the moon/sun button is gone
4. **Verify fonts** — open DevTools, confirm body uses Plus Jakarta Sans, mono elements use IBM Plex Mono
5. **No console errors** — all CSS loads cleanly
6. **Spot-check tokens** — use DevTools to confirm elements reference `var(--*)` custom properties

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Some hardcoded values may be in inline styles in `index.html` (style attributes)
  - *Mitigation:* Search for inline `style=` attributes containing colors and migrate them to classes

**Edge cases:**
- `index.html` has `style="..."` attributes with hardcoded colors/positions — these need CSS class extraction
- Some JS code may reference theme state (e.g., `document.documentElement.dataset.theme`) — remove or neutralize those references
- The `.code-block` / log area currently uses green-on-black terminal aesthetic — this should shift to warm-tinted dark (but full redesign is tC.10)

---

## Rollback Plan

1. Restore original `styles.css` from git
2. Restore original `index.html` head and theme toggle
3. Restore original `script.js` theme handler

**Estimated rollback time:** Quick (< 2 minutes via git checkout)

---

## Notes

- This is the first Phase C ticket and must complete before any other Phase C work
- The visual result after this ticket is a "warm-tinted dark migration" — same layout, different color/typography system. Components will look odd (Material buttons with warm dark colors) but this is temporary until component tickets land
- Reference: DESIGN.md frontmatter (lines 1-84) for all token values
- Reference: ADR-003 for design system decisions
