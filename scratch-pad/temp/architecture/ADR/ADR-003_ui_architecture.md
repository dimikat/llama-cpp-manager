# ADR-003: UI Architecture — Instrument Panel Design System

**Status:** Updated with design system (Phase C planning)
**Date:** 2026-04-28 (originally 2026-04-27)
**Deciders:** PM (Dimitri), AI Technical Lead
**Design references:** `PRODUCT.md`, `DESIGN.md`

---

## Context

The current UI organizes content into persistent tabs that represent flag groups (e.g., "Basic", "GPU", "Advanced"), uses a Material Design aesthetic with Roboto/blue accent, and has a light/dark theme toggle. This design does not scale to multiple simultaneous instances and the visual language does not match the product personality (precise, calm, technical). The redesigned UI introduces tabs-as-instances, a single-page accordion config form per instance, viewport-aware tooltips, and a complete visual overhaul to the "Instrument Panel" design system defined in DESIGN.md.

---

## Decision Summary

| Concern | Decision |
|---|---|
| Tab meaning | Each tab = one running (or configured) instance |
| Config form layout | Single page with collapsible left sidebar outline + accordion flag groups |
| Flag groupings | Concept-based, shared taxonomy; runtime-specific flags rendered within groups |
| Tooltip positioning | Floating UI library (`@floating-ui/dom`) |
| Runtime picker | Shown once at tab creation (new instance flow); not changeable after |
| Tab header | Status dot + runtime badge + model name (no emojis) |
| Visual system | DESIGN.md: dark theme, warm-tinted neutrals, amber-gold accent (#C89038), flat tonal surfaces |
| Typography | Plus Jakarta Sans (UI), IBM Plex Mono (paths/values/logs) |
| Icons | SVG only (16/20px), no emojis in UI |
| Elevation | Flat + tonal layering (Base/Raised/Overlay/Hover); shadows only for floating elements |
| Theme | Dark only in v1 (no light/dark toggle); warm amber hue direction throughout |

---

## Tab Structure

### Tab Bar
The top-level tab bar contains one tab per instance plus a `[+ New Instance]` button.

```
[ ● vLLM  Qwen3-30B ] [ ● llama  Mistral-7B ] [ + New Instance ]
```

Each tab header shows:
- Status dot (8px circle): green (running), amber (loading), red (error), gray (idle/stopped)
- Runtime badge (label-text chip, text-secondary color): `vLLM` or `llama.cpp`
- Model name in text-primary (or "Untitled" until a model is selected)

No live metrics in the tab header — keeps the tab strip scannable at 4+ instances.

### New Instance Flow
Clicking `[+ New Instance]` opens a **runtime picker modal** — a floating dialog (surface-overlay background, shadow per Shadow-Is-Floating rule) with two options:

```
┌──────────────────────────────────────────────────────┐
│  Start a new inference instance                       │
│  (headline typography, text-primary)                  │
│                                                       │
│  ┌─────────────────┐  ┌─────────────────┐            │
│  │  vLLM            │  │  llama.cpp       │            │
│  │  (title, accent) │  │  (title, accent) │            │
│  │                  │  │                  │            │
│  │  Docker + vLLM   │  │  Native llama   │            │
│  │  For dense models│  │  For GGUF and   │            │
│  │  and TP workloads│  │  custom quant   │            │
│  └─────────────────┘  └─────────────────┘            │
└──────────────────────────────────────────────────────┘
```

Options styled as surface-base cards with border (#3A3937), hover shifts to surface-hover. Selected option gets accent border. Runtime cannot be changed after this point in v1.

---

## Single-Page Instance Tab Layout

Each instance tab is a single-page view — no sub-tabs. Layout:

```
┌──────────────────────────────────────────────────────────────┐
│ ● [vLLM] Qwen3-30B — Running               [Stop] [Save]  │
├───────────────────┬──────────────────────────────────────────┤
│ Outline           │ Config Form                              │
│ (surface-raised)  │ (surface-base)                           │
│                   │                                          │
│ ▸ Model    ←────  │  ▼ Model                                 │
│ ▸ Performance     │    Model path: [___________] [Browse]   │
│ ▸ Memory          │    Model name alias: [___________]      │
│ ▸ Concurrency     │    HF token: [from secrets]             │
│ ▸ Networking      │                                          │
│ ▸ Speculative     │  ▶ Performance  (collapsed)             │
│ ▸ KV Transfer     │  ▶ Memory       (collapsed)             │
│ ▸ Advanced        │  ▶ Concurrency  (collapsed)             │
│                   │  ...                                     │
│                   ├──────────────────────────────────────────┤
│                   │ Metrics Panel                            │
│                   │  Gen: 42 tok/s  │  KV: 67%  │  VRAM:   │
│                   │  (mono font, status colors)              │
│                   ├──────────────────────────────────────────┤
│                   │ Log Stream (surface-base, mono, 500 ln)  │
└───────────────────┴──────────────────────────────────────────┘
```

**Left sidebar (collapsible):** Fixed-position outline on surface-raised background with 1px right border in border color (#3A3937). Active section highlighted via scroll-spy (text-primary + accent left indicator or text-primary highlight). Section labels in title typography (15px, weight 600). Hidden by default on small viewports; toggle button in form header (ghost button style).

**Accordion groups:** Each group has a `▼/▶` toggle header. All groups start collapsed except "Model" (always open on first load). State persists per-instance in localStorage.

---

## Accordion Flag Groups

Both runtimes use the same group taxonomy. The flags rendered inside each group differ by runtime.

| Group | llama.cpp flags | vLLM flags |
|---|---|---|
| **Model** | `-m` path, `--mmproj` | `--model`, `--tokenizer`, `--served-model-name`, `--hf-token` (from secrets) |
| **Performance** | `-ngl`, `-t`, `--tensor-split`, `--main-gpu` | `--tensor-parallel-size`, `--pipeline-parallel-size`, `--distributed-executor-backend`, `--dtype`, `--enforce-eager` |
| **Memory** | `-c`, `--mlock`, `--cache-type-k/v` | `--max-model-len`, `--gpu-memory-utilization`, `--kv-cache-dtype`, `--enforce-eager` |
| **Concurrency** | `-np`, `--slot-save-path`, `-sps` | `--max-num-seqs`, `--enable-prefix-caching`, `--prefix-caching-hash-algo` |
| **Speculative** | (llama.cpp speculative decoding flags) | `--speculative-config` |
| **KV Transfer** | _(not applicable)_ | `--kv-offloading-backend`, `--kv-offloading-size`, `--kv-transfer-config` (sub-fields) |
| **Networking** | `--port`, `--host` | `--port`, `--host`, `--api-key` |
| **Advanced** | Remaining flags | `--seed`, `--shutdown-timeout`, `--enable-sleep-mode`, `--lora-modules`, remaining |

Groups that have no flags for a given runtime are hidden entirely (not shown as empty).

---

## Presets

Presets appear as buttons above the config form. Each runtime has its own preset set.

**vLLM presets:**
- **Agentic Coding** — sets `--enable-prefix-caching`, `--max-num-seqs 8`, `--gpu-memory-utilization 0.95`
- **High Throughput** — sets `--tensor-parallel-size 2`, `--gpu-memory-utilization 0.95`, `--dtype bfloat16`
- **Low VRAM** — sets `--gpu-memory-utilization 0.75`, `--enforce-eager`

**llama.cpp presets:** Unchanged from current implementation, re-rendered in the new layout.

---

## Tooltip Implementation

**Problem:** Current tooltips spawn at the element's position and get clipped by the viewport edge ~40% of the time.

**Solution:** Replace current CSS tooltip system with `@floating-ui/dom`. Tooltip visual style per DESIGN.md: surface-overlay background (#2A2928), text-primary text, 6px radius, 8px 12px padding, max-width 320px. Shadow: 0 4px 16px rgba(0,0,0,0.4) — the only non-flat shadow, because tooltips float (Shadow-Is-Floating Rule). Body typography (13px).

```javascript
import { computePosition, flip, shift, offset } from "@floating-ui/dom";

async function showTooltip(referenceEl, tooltipEl) {
  const { x, y } = await computePosition(referenceEl, tooltipEl, {
    placement: "top",
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });
  Object.assign(tooltipEl.style, { left: `${x}px`, top: `${y}px` });
}
```

`flip()` — flips to opposite side if not enough room.
`shift()` — slides tooltip to stay within viewport with 8px padding.
`offset()` — gap between element and tooltip.

This is a self-contained change with no behavioral side effects on existing flags. The tooltip content (text, links) is unchanged.

---

## Error State Banner

When an instance enters ERROR state, a persistent banner appears at the top of the tab body. Styled per DESIGN.md: surface-overlay background, 3px left border in status-error (#CC4F4F), body typography, status-error text for the message. Actions as ghost buttons (text-secondary, hover text-primary).

```
┌──────────────────────────────────────────────────────────────────┐
│ ▎ This instance stopped unexpectedly.  [View Logs]  [Restart]   │
└──────────────────────────────────────────────────────────────────┘
```

The banner is dismissible (closes the error state, returns tab to IDLE). "View Logs" scrolls to the log panel. "Restart" resets status to IDLE and pre-fills config from the last-used config.

A toast notification fires separately at the moment of crash — surface-overlay, 3px left border in status-error, auto-dismiss 4 seconds for info, persist for errors until dismissed.

---

## Dependency: Floating UI

- Package: `@floating-ui/dom` (vanilla JS — no framework required)
- Bundle size: ~12 KB gzipped
- Installation: `npm install @floating-ui/dom`, or load from CDN in `index.html`
- No other new dependencies introduced in v1

---

## Rejected Alternatives

**Keep tabs as flag groups, add a runtime picker at the top:** Rejected — doesn't support multiple simultaneous instances, which is a v1 requirement.

**Full floating table-of-contents:** Rejected by PM in favor of collapsible sidebar panel (simpler, less visual noise).

**Concept-based groups vs runtime-specific groups:** PM selected concept-based (shared taxonomy) with runtime-conditional content inside each group. Runtime-specific-only groups (empty for the other runtime) are hidden.

**CSS-only tooltip positioning:** Rejected by PM — a library dependency is acceptable, and CSS-only solutions for tooltip overflow handling are fragile and harder to maintain.

**Light/dark theme toggle in v1:** Rejected — the design system is dark-only (warm-tinted neutrals, amber accent). Adding a light theme doubles the CSS token surface and visual QA burden. Can be added in a later phase if needed.

**Keep emoji icons:** Rejected — emojis do not render consistently across platforms, cannot be color-controlled, and clash with the "precise, technical" brand personality. SVG icons are consistent, small, and follow the design token color system.

**Card-based layout for instances:** Rejected — cards would introduce unnecessary nesting and visual noise. The Instrument Panel metaphor calls for flat, tonal surfaces with clear spatial hierarchy, not repeated card containers.
