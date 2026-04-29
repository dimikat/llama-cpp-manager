# Work Ticket: SVG Icon System

**Ticket ID:** `wt_pC_tC.2_cm`
**Phase:** C (UI Overhaul — Instrument Panel Redesign)
**Complexity:** cm (Medium)
**Status:** Draft
**Depends on:** tC.1 (design token foundation)

---

## Objective

Replace all emoji icons throughout the UI with a consistent SVG icon system. Icons use `text-secondary` color by default, `text-primary` on active/hover, and `accent` for emphasis. All icons are 16px or 20px. This eliminates the emoji inconsistency across platforms and enables color control through CSS.

---

## Scope

**What's included:**
- Create an SVG icon sprite or inline SVG helper system in the frontend
- Define the complete icon set needed by Phase C components:
  - **Navigation/Actions:** chevron-down, chevron-right, plus, x (close), stop, play, refresh, save, settings, trash, edit, copy, external-link
  - **Status:** circle-solid (for status dots — or use pure CSS), warning-triangle, info-circle, error-circle
  - **Runtime:** cpu-chip (llama.cpp), container (vLLM/Docker)
  - **Config:** folder (browse), link, shield (secrets), sliders, terminal, chart-bar
  - **Sidebar:** sidebar-toggle, outline-section
- SVG icons follow DESIGN.md rules: 16px for inline/compact contexts, 20px for standalone/toolbar
- Color via `currentColor` CSS — icons inherit parent text color, making them respond to state classes
- Replace all emoji usage in `index.html` (tab icons like 🎯 ⚡ 🔧 🌐 💾 etc.)
- Replace emoji in any JS-generated content (toast messages, status labels, buttons)

**What's explicitly excluded:**
- Icon design/illustration — icons are simple geometric SVGs (stroke-based or filled, not illustrated)
- External icon library dependency — inline SVGs, no npm icon package
- Animation on icons (no spinning, no pulse)

---

## Acceptance Criteria

1. **Zero emojis in UI** — no emoji characters in buttons, tabs, labels, or status indicators
2. **SVG icons render at 16px or 20px** — consistent sizing per context
3. **Color via CSS** — icons use `currentColor` and respond to `color:` / `var(--text-secondary)` etc.
4. **Icon set covers all current emoji uses** — every replaced emoji has an SVG equivalent
5. **No external dependencies** — SVGs are inline or sprite, no npm icon library
6. **Hover/active states work** — icons shift from text-secondary to text-primary on hover

---

## Test Plan

1. **Start the server** — `npm start`, open `http://localhost:3001`
2. **No emojis visible** — scan every button, tab, and label for emoji characters; all should be SVG
3. **Icon sizing** — use DevTools to confirm icons are 16px or 20px as appropriate
4. **Color inheritance** — hover over icon buttons, verify color shifts from text-secondary to text-primary
5. **Visual consistency** — all icons appear in the same visual style (stroke width, weight)

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Some emojis convey meaning that simple SVGs can't replace (e.g., the moon/sun theme toggle — but this is already removed in tC.1)
  - *Mitigation:* Audit all emoji uses before designing SVG set

**Edge cases:**
- Dynamic content (JS-generated toasts, status updates) may inject emojis — search `script.js` for emoji unicode patterns
- The model file browser dialog may use emoji — check and replace

---

## Rollback Plan

1. Restore original emoji references in `index.html` and `script.js` from git

**Estimated rollback time:** Quick (< 2 minutes via git checkout)

---

## Notes

- This ticket should land early — tC.4 (tab bar) and tC.6 (accordion) both need SVG chevron and status icons
- Keep SVG paths simple — 1-2 stroke paths, not complex illustrations. The Instrument Panel aesthetic is precise and minimal
- Prefer stroke-based icons at 1.5px stroke width for consistency with the clean, flat design
