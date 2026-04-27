# ADR-003: UI Architecture — Instance Tabs, Accordion Config, Floating Tooltips

**Status:** Proposed — Pending PM Review
**Date:** 2026-04-27
**Deciders:** PM (Dimitri), AI Technical Lead

---

## Context

The current UI organizes content into persistent tabs that represent flag groups (e.g., "Basic", "GPU", "Advanced"). This design does not scale to multiple simultaneous instances and makes the config form hard to navigate. The redesigned UI introduces tabs-as-instances, a single-page accordion config form per instance, and viewport-aware tooltips.

---

## Decision Summary

| Concern | Decision |
|---|---|
| Tab meaning | Each tab = one running (or configured) instance |
| Config form layout | Single page with collapsible left sidebar outline + accordion flag groups |
| Flag groupings | Concept-based, shared taxonomy; runtime-specific flags rendered within groups |
| Tooltip positioning | Floating UI library (`@floating-ui/dom`) |
| Runtime picker | Shown once at tab creation (new instance flow); not changeable after |
| Tab header | `● [RUNTIME] Model Name` with color-coded status dot |

---

## Tab Structure

### Tab Bar
The top-level tab bar contains one tab per instance plus a `[+ New Instance]` button.

```
[ ● vLLM  Qwen3-30B ] [ ● llama  Mistral-7B ] [ + New Instance ]
```

Each tab header shows:
- Status dot: green (running), yellow (loading), red (error), grey (idle/stopped)
- Runtime badge: `vLLM` or `llama.cpp`
- Model name (or "Untitled" until a model is selected)

No live metrics in the tab header — keeps the tab strip scannable at 4+ instances.

### New Instance Flow
Clicking `[+ New Instance]` opens a **runtime picker modal** — a simple two-option screen:

```
┌─────────────────────────────────────┐
│  Start a new inference instance     │
│                                     │
│  [ vLLM ]        [ llama.cpp ]      │
│                                     │
│  Use Docker + vLLM  │  Native llama │
│  Recommended for    │  Recommended  │
│  dense models and   │  for GGUF     │
│  agentic workloads  │  and custom   │
│                     │  quantization │
└─────────────────────────────────────┘
```

Runtime cannot be changed after this point in v1. Selecting a runtime creates the instance and opens its tab.

---

## Single-Page Instance Tab Layout

Each instance tab is a single-page view — no sub-tabs. Layout:

```
┌──────────────────────────────────────────────────────────────┐
│ ● [vLLM] Qwen3-30B — Running               [Stop] [Save]     │
├───────────────────┬──────────────────────────────────────────┤
│ Outline           │ Config Form                              │
│ (collapsible)     │                                          │
│                   │  ▼ Model                                 │
│ ▸ Model           │    Model path: [___________] [Browse]   │
│ ▸ Performance     │    Model name alias: [___________]      │
│ ▸ Memory          │    HF token: [from secrets]             │
│ ▸ Concurrency     │                                          │
│ ▸ Networking      │  ▶ Performance  (collapsed)             │
│ ▸ Speculative     │  ▶ Memory       (collapsed)             │
│ ▸ KV Transfer     │  ▶ Concurrency  (collapsed)             │
│ ▸ Advanced        │  ...                                     │
│                   ├──────────────────────────────────────────┤
│                   │ Metrics Panel                            │
│                   │  Gen: 42 tok/s  │  KV: 67%  │  VRAM:    │
│                   │  Prompt: 120 t/s│  Running: 2 reqs       │
│                   ├──────────────────────────────────────────┤
│                   │ Log Stream (last 500 lines, scrollable)  │
└───────────────────┴──────────────────────────────────────────┘
```

**Left sidebar (collapsible):** Fixed-position outline. Clicking a section label scrolls the form to that accordion. Active section highlighted via scroll-spy. Hidden by default on small viewports; toggle button in form header.

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

**Solution:** Replace current tooltip positioning with `@floating-ui/dom`. Each flag label with a `data-tooltip` attribute gets Floating UI-managed positioning:

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

When an instance enters ERROR state, a persistent banner appears at the top of the tab body:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠  This instance stopped unexpectedly.  [View Logs]  [Restart]  │
└─────────────────────────────────────────────────────────────────┘
```

The banner is dismissible (closes the error state, returns tab to IDLE). "View Logs" scrolls to the log panel. "Restart" resets status to IDLE and pre-fills config from the last-used config.

A toast notification fires separately at the moment of crash (dismissible, auto-clears after 8 seconds).

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
