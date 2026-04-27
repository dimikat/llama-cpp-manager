# Discovery Batch 2 — Instance Model & Remaining Unknowns

**Feature:** vLLM runtime adapter + UI redesign (co-scoped)
**Date:** 2026-04-27
**Status:** Awaiting PM answers

Batch 1 synthesis locked in: tabs = instances, multi-instance in scope, Docker Desktop path confirmed, full UI redesign confirmed. This batch resolves 7 items that block Stage 3 Architecture.

Answer inline under each **Answer:** label.

---

## Section H — Instance Lifecycle

**H1 [Required]** How many concurrent instances should the manager support? Options:

- (a) No hard cap — user can open as many tabs as they want (risk: accidental resource exhaustion)
- (b) Soft cap with warning — warn when opening a 3rd or 4th instance but allow it
- (c) Hard cap — e.g., max 4 instances total (llama.cpp + vLLM combined)

With 2× RTX 3090s and 128 GB RAM, you could plausibly run 2-3 instances before running out of VRAM. Is there a number that makes sense for your setup, or should this be a user-configurable setting?

**Answer:**

User configurable probably best - but a) for now (easiest, will have soft cap later)

---

**H2 [Required]** When a running instance exits unexpectedly (process crash, Docker container dies, OOM kill), what should the tab do?

- (a) Stay open, show an error state with the last log lines and an option to restart
- (b) Show a dismissible alert/toast, keep the tab open in error state
- (c) Auto-close the tab and show a notification

**Answer:**

b) (easier debugging, but there should be a banner on an open tab in error state that states that it is so)

---

**H3 [Required]** Are instance configs saved across browser sessions? Concretely: if you configure and load a Qwen3-30B vLLM instance, close the browser, and come back tomorrow — does that config persist as a named entry you can reload, or do you start fresh?

If configs are saved: does the user name/title them ("Qwen3 agentic setup"), or are they auto-named (e.g., by model name + runtime)?

**Answer:**

user names them I think, easiest (maybe a flag about last used or something like that date/time)

---

## Section I — UI Instance Tab Design

**I1 [Required]** What does a tab header show? The tab header is the clickable label at the top of the instance tab. Examples:

- Minimal: `[vLLM] Qwen3-30B`
- With status: `● [vLLM] Qwen3-30B — Running`
- With metrics: `● [vLLM] Qwen3-30B — 42 tok/s`

Which level of information do you want in the tab header itself (versus inside the tab body)?

**Answer:**

minimal (with dot maybe for running/idle/error status (green/yellow/red))

---

## Section J — Security & Complex Configs

**J1 [Required]** `--hf-token` is a HuggingFace API token used to download gated models (e.g., Llama 3, Gemma). How should it be stored?

- (a) Plaintext in the config file (simple, not great for security — fine for personal use)
- (b) Stored once in a separate secrets file, not bundled with model configs
- (c) Entered per session, never persisted
- (d) OS credential store (Windows Credential Manager)

For personal use, (a) or (b) are both practical. (b) is slightly better — the token doesn't end up in every model config export.

**Answer:**

b)

---

**J2 [Required]** `--kv-transfer-config` is a nested configuration block with sub-fields: `kv_connector`, `kv_role`, `kv_rank`, `kv_parallel_size`, `kv_buffer_size`, `kv_connector_extra_config`. This is a power-user feature (disaggregated prefill/decode). How should the UI handle it?

- (a) Expose individual sub-fields as form inputs within an "Advanced / KV Transfer" accordion
- (b) Provide a JSON text area — the user pastes the whole config block
- (c) Out of scope for v1 — add later when you actually use it

**Answer:**

a)

---

## Section K — Clarification

**K1 [Required]** `--dataset-name` and `--dataset-path` are typically vLLM benchmarking/evaluation flags (used with `vllm bench`), not server-serving flags. They don't apply when running `vllm serve`. Did you intend to include them as part of a **benchmarking mode** the manager will support, or were they included by accident while going through the full vLLM arg list?

If benchmarking mode is intended: is it in scope for this charter (v1), or deferred?

**Answer:**

deferred - let's talk later about this

---
