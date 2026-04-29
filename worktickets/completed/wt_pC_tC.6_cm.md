# Work Ticket: Accordion Flag Groups

**Ticket ID:** `wt_pC_tC.6_cm`
**Phase:** C (UI Overhaul — Instrument Panel Redesign)
**Complexity:** cm (Medium)
**Status:** Draft
**Depends on:** tC.3 (form controls), tC.5 (layout shell)

---

## Objective

Implement the collapsible accordion flag groups that replace the current tab-based config sections. Each group (Model, Performance, Memory, Concurrency, Speculative, KV Transfer, Networking, Advanced) is a collapsible section with a header and content area. Runtime-conditional flags are rendered within groups; empty groups are hidden.

---

## Scope

**What's included:**
- **Accordion component HTML/CSS/JS:**
  - Header: title typography (15px, weight 600), chevron SVG icon on right, rotates 90deg on expand
  - Collapsed state: no border, transparent background. Hover: surface-hover background
  - Expanded state: 1px top border in border color separating header from content. Content padding 16px top, 4px sides
  - All groups start collapsed except Model (always open on first load)
  - Expand/collapse transition uses ease-out-quart on max-height or transform
- **Group taxonomy per ADR-003:**
  - **Model:** `-m` path, `--mmproj` (llama.cpp); `--model`, `--tokenizer`, `--served-model-name`, `--hf-token` (vLLM)
  - **Performance:** `-ngl`, `-t`, `--tensor-split`, `--main-gpu` (llama.cpp); `--tensor-parallel-size`, `--pipeline-parallel-size`, `--distributed-executor-backend`, `--dtype`, `--enforce-eager` (vLLM)
  - **Memory:** `-c`, `--mlock`, `--cache-type-k/v` (llama.cpp); `--max-model-len`, `--gpu-memory-utilization`, `--kv-cache-dtype` (vLLM)
  - **Concurrency:** `-np`, `--slot-save-path`, `-sps` (llama.cpp); `--max-num-seqs`, `--enable-prefix-caching`, `--prefix-caching-hash-algo` (vLLM)
  - **Speculative:** llama.cpp speculative flags; `--speculative-config` (vLLM)
  - **KV Transfer:** (llama.cpp: not applicable); `--kv-offloading-backend`, `--kv-offloading-size`, `--kv-transfer-config` (vLLM)
  - **Networking:** `--port`, `--host` (both); `--api-key` (vLLM)
  - **Advanced:** remaining flags per runtime
- **Runtime-conditional rendering:** Groups check the instance's runtime type and only render relevant flags. Groups with no flags for the current runtime are hidden entirely (not shown empty).
- **State persistence:** Accordion open/closed state persists per-instance in localStorage
- **Preset buttons:** Runtime-specific presets rendered above the config form as ghost buttons (Agentic Coding, High Throughput, Low VRAM for vLLM; existing presets for llama.cpp)

**What's explicitly excluded:**
- New flag fields that don't exist in the current UI — only migrate existing fields into accordion groups
- Tooltip content (tC.7)
- Metrics/log panels (tC.9, tC.10)

---

## Acceptance Criteria

1. **8 accordion groups** render with correct headers and chevron icons
2. **Model group** starts expanded; all others start collapsed
3. **Chevron rotates 90deg** on expand, back on collapse
4. **Runtime-conditional** — llama.cpp instance hides KV Transfer group; vLLM instance shows it
5. **Empty groups hidden** — groups with no flags for current runtime have `display: none`
6. **State persists** — accordion state saves to localStorage, restores on page load
7. **All existing form fields** are present inside their correct accordion group
8. **Preset buttons** appear above config form and populate fields when clicked
9. **Expand/collapse transition** uses ease-out-quart

---

## Test Plan

1. **Start the server** — `npm start`, open `http://localhost:3001`
2. **Accordion render** — verify 8 groups appear (or fewer if some are hidden for current runtime)
3. **Model expanded** — verify Model group content is visible by default
4. **Collapse/expand** — click each group header, verify content shows/hides with smooth transition
5. **Chevron animation** — verify chevron rotates on expand
6. **Runtime switching** — if two instances with different runtimes exist, switch tabs and verify groups differ
7. **Form field migration** — verify every existing config field appears in the correct group
8. **Presets** — click a preset button, verify fields populate with correct values
9. **localStorage** — expand some groups, reload page, verify state persists
10. **Submit config** — fill out form, submit, verify backend receives correct values

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Current form submission logic references specific input IDs/ selectors that change with the new HTML structure
  - *Mitigation:* Keep input IDs stable — move the HTML elements into accordion containers without renaming them

**Edge cases:**
- Flag values may differ between runtimes (e.g., llama.cpp `-ngl` is a number, vLLM `--tensor-parallel-size` is a number — same group, different fields)
- The `--hf-token` field for vLLM reads from secrets (Phase D) — for now, render it as a standard password input
- Preset buttons need to know the current instance's runtime to offer the correct set

---

## Rollback Plan

1. Restore original tab-based config form from git
2. Old tabs (Model, Performance, etc.) return with original field layout

**Estimated rollback time:** Medium (< 5 minutes via git checkout)

---

## Notes

- This ticket migrates all existing form fields — no new fields are added. Fields just move from flat tab panels into accordion groups
- Keep input `id` and `name` attributes identical to avoid breaking JS form serialization
- The accordion header text matches the outline sidebar section labels (from tC.5)
- Reference: ADR-003 Accordion Flag Groups section (lines 108-123)
