# ulti-Runtime Redesign: Phase Breakdown

**Date:** 2026-04-28 (updated with design system context)
**Status:** Phases A-B complete. Phase C pending.

**Design references:** `PRODUCT.md` (strategic), `DESIGN.md` (visual system)

---

## Overview

The multi-runtime redesign is decomposed into 5 sequential phases. Each phase is a hard gate — all work must complete and be PM-validated before the next phase begins. The breakdown follows the principle of "build foundation first, then add runtimes, then overhaul UI."

---

## Phase A: Backend Instance Manager + LlamaCppAdapter Extraction

**Status:** Complete

**Goal:** Refactor the single-process server.js into a multi-instance architecture while preserving 100% of existing llama.cpp functionality.

**Key deliverables:**

- Instance Manager module (instanceMap, lifecycle state machine, Socket.io event routing by instanceId)
- LlamaCppAdapter class (extract all llama.cpp spawn/stop/log/metrics logic from server.js into adapter)
- Runtime Adapter interface definition
- Backward-compatible Socket.io events (existing UI continues to work during this phase)
- Instance config data structures

**Why first:** Every subsequent phase depends on this foundation. The adapter interface must exist before VllmAdapter can be built. The instance map must exist before multi-tab UI makes sense.

**Estimated tickets:** 5-6

---

## Phase B: VllmAdapter + Docker Integration

**Status:** Complete

**Goal:** Implement the vLLM runtime adapter, enabling Docker-based vLLM instance spawning, monitoring, and stopping alongside llama.cpp.

**Key deliverables:**

- VllmAdapter class implementing the Runtime Adapter interface
- Docker Desktop pre-flight checks
- vLLM Prometheus metrics parsing
- vLLM readiness detection (log marker + HTTP health poll)
- vLLM update mechanism (Docker Hub tag polling + image pull)
- vLLM-specific CLI argument builder

**Depends on:** Phase A (adapter interface, instance manager)

**Estimated tickets:** 4-5

---

## Phase C: UI Overhaul — Instrument Panel Redesign

**Status:** Pending

**Goal:** Replace the current single-instance, Material Design UI with the multi-instance "Instrument Panel" design system defined in DESIGN.md. Dark theme, warm-tinted neutrals, amber-gold accent, flat tonal surfaces, accordion config forms, and Floating UI tooltips.

**Design system:** This phase implements the full visual system from DESIGN.md. All frontend work must conform to the tokens, components, and rules defined there. Key constraints:

- **Dark theme only** (no light/dark toggle in v1; warm-tinted neutral palette, amber hue direction)
- **Restrained color strategy** — single accent (amber #C89038), less than 10% of any screen
- **Flat + tonal elevation** — no decorative shadows; surface hierarchy via Base/Raised/Overlay/Hover
- **Plus Jakarta Sans** for UI, **IBM Plex Mono** for paths/values/logs
- **No emojis as UI icons** — SVG icons at 16/20px throughout
- **Ease-out-quart** for all transitions; no bounce, no pulse, no shimmer

**Key deliverables:**

C1. **Design token foundation** — CSS custom properties from DESIGN.md frontmatter (colors, typography, spacing, rounded). Replace all hardcoded hex values in styles.css. Establish the surface hierarchy (base, raised, overlay, hover) and status color scale.

C2. **Tab bar with instance tabs** — Horizontal tab bar: one tab per instance + `[+ New Instance]` button. Each tab shows status dot (8px, green/amber/red/gray), runtime badge (label-text chip), and model name. Active tab: 2px bottom border in accent (#C89038). No emojis, no rounded corners on tabs. Runtime picker modal for new instances (floating, surface-overlay background, shadow per Shadow-Is-Floating rule).

C3. **Per-instance single-page layout** — Each tab is a self-contained view: collapsible left outline sidebar (surface-raised, 1px right border), main config area (surface-base), inline metrics panel, and log stream. No sub-tabs. See ADR-003 for layout.

C4. **Accordion flag groups** — Collapsible sections for Model/Performance/Memory/Concurrency/Speculative/KV Transfer/Networking/Advanced. Headers in title typography (15px, weight 600), chevron icon rotates 90deg on expand. All groups start collapsed except Model. Runtime-conditional flags rendered within groups; empty groups hidden.

C5. **Floating UI tooltips** — Replace current CSS tooltip system with `@floating-ui/dom`. Tooltip style: surface-overlay background, text-primary, 6px radius, max-width 320px. Shadow: 0 4px 16px rgba(0,0,0,0.4). Arrow: 6px CSS triangle.

C6. **Status indicators and feedback** — Status dots (8px solid circles), progress bars (6px height, single solid status color, no gradient), token speed display (mono font, label size). Error state banner at top of tab body (dismissible, with View Logs and Restart actions). Toast notifications (surface-overlay, 3px left border for type, auto-dismiss 4s for info/persist for errors).

C7. **Form controls redesign** — Inputs: surface-base background, 1px border (#3A3937), 6px radius. Focus: border shifts to accent, no glow. Buttons: primary (amber bg, dark text), secondary (transparent, text-primary, 1px border), ghost (transparent, text-secondary), danger (transparent, status-error text). Checkboxes: custom styled, accent fill when checked. Selects: match input styling. Preset buttons per runtime, rendered above the config form.

C8. **Metrics panel redesign** — Inline per-instance metrics (not a separate right column). GPU temp indicators, VRAM usage bars, CPU/RAM graphs. Status colors for thresholds. Mono font for values. See DESIGN.md Status Indicators and progress bar specs.

C9. **Log stream panel** — Per-instance log output at bottom of tab. Surface-base background, mono font, text-primary. Scrollable, last 500 lines buffered. No green-on-black terminal aesthetic — this is warm-tinted dark, not hacker aesthetic.

C10. **SVG icon system** — Replace all emoji icons (tab icons, status indicators, buttons) with consistent SVG icons at 16px or 20px. Icons follow text-secondary color by default, text-primary on active/hover, accent for emphasis.

**Depends on:** Phase A (Socket.io events with instanceId), Phase B (vLLM metrics/events for UI rendering)

**Estimated tickets:** 8-10 (increased from 5-7 due to design system implementation scope)

---

## Phase D: Config & Secrets Storage

**Status:** Pending

**Goal:** Implement named instance config persistence, secrets storage, and the saved configs UI.

**Design system alignment:**

- Saved configs list UI uses ghost button style for items, surface-hover on hover, accent border on active
- Rename/Delete actions use ghost and danger button variants from DESIGN.md
- HF token field uses mono font per Mono Context Rule
- Config names in text-primary, metadata (last used, runtime type) in text-secondary

**Key deliverables:**

- `data/instance_configs.json` read/write
- `data/secrets.json` read/write with .gitignore protection
- `data/app_settings.json` vLLM fields
- Saved configs list UI (sorted by lastUsed, with Load/Rename/Delete actions)
- HF token form integration (read from secrets, inject at spawn, never persist in config)

**Depends on:** Phase A (instance config data structures), Phase C (config list UI and design tokens)

**Estimated tickets:** 3-4

---

## Phase E: Integration Testing & Polish

**Status:** Pending

**Goal:** End-to-end validation of the complete multi-runtime system, design system conformance, edge case handling, and documentation.

**Design system validation criteria (added):**

- Verify all colors match DESIGN.md frontmatter tokens (no hardcoded hex in CSS)
- Verify accent color occupies less than 10% of each screen (The 10% Rule)
- Verify all neutrals carry warm amber tint (no pure grays)
- Verify no decorative shadows on non-floating elements (Shadow-Is-Floating Rule)
- Verify no emojis in UI icons (SVG icons only)
- Verify all transitions use ease-out-quart
- Verify WCAG 2.1 AA contrast ratios for text-primary, text-secondary against their backgrounds
- Verify keyboard navigation works across tabs, accordions, and form controls
- Verify reduced-motion preference disables all transitions

**Key deliverables:**

- E2E validation of mixed llama.cpp + vLLM concurrent instances
- Resource exhaustion edge case handling
- Reconnection behavior (browser disconnect/reconnect, log buffer replay)
- Error recovery flows (container crash, process kill, Docker Desktop stop)
- Performance validation (metrics polling overhead at 3+ instances)
- Design system conformance audit (automated where possible)
- Documentation updates (README, architecture docs, CLAUDE.md)

**Depends on:** All prior phases

**Estimated tickets:** 4-5 (increased from 3-4 due to design conformance testing)

---

## Dependency Graph

```
Phase A ──→ Phase B ──→ Phase C ──→ Phase D ──→ Phase E
                                        ↑
                              (D also depends on A)
```

Phase C depends on both A and B because the UI needs to render vLLM-specific content.
Phase D depends on A (data structures) and C (UI for config management).
Phase E validates design system conformance across all phases.

---

## Total Estimate

| Phase           | Tickets         | Est. Sessions   | Status   |
| --------------- | --------------- | --------------- | -------- |
| A               | 5-6             | 3-4             | Complete |
| B               | 4-5             | 2-3             | Complete |
| C               | 8-10            | 5-6             | Pending  |
| D               | 3-4             | 2               | Pending  |
| E               | 4-5             | 2-3             | Pending  |
| **Total** | **24-30** | **14-18** |          |

Phase C estimate increased from 5-7 to 8-10 tickets because the design system implementation (token migration, icon system, full component redesign) is substantial and was not scoped in the original estimate. Phase E increased from 3-4 to 4-5 to cover design conformance validation.

This replaces the charter's original Phase 1-5 structure for the redesign work. The original Phase 1 maintenance tasks (t1.1-t1.5) should be evaluated: some may be subsumed by the redesign (e.g., t1.4 config schema is addressed by Phase D), while others remain independent (e.g., t1.5 release tracking).
