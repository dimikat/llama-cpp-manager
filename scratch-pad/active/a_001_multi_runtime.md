# Discovery Batch 1 — Multi-Runtime & UI Redesign

**Feature:** vLLM runtime adapter + UI redesign (co-scoped)
**Date:** 2026-04-27
**Status:** Awaiting PM answers

Pre-answers locked in from research session:

- Deployment path: Docker Desktop + `vllm/vllm-openai`, driven via `docker.exe` on Windows host
- TP=2 validated by PM on own hardware
- WSL2 memory: 32 GB allocated (128 GB host DDR5) — adequate

Answer each question inline under the **Answer:** label. Mark any question you want to skip or defer with **Defer:** and a note.

---

## Section A — Project Scope & Charter

**A1 [Required]** The current charter vision reads: *"Provide a robust, feature-rich browser-based interface for managing local llama.cpp inference."* This no longer describes the tool you're building. Do you want to:

**Answer: a)**

This will be a project that manages CPP and VLM. So the project scope should be changing accordingly.

---

**A2 [Required]** What is the primary user group for vLLM support at launch — is it still just you personally, or are you now designing with broader adoption in mind? This affects how much we should invest in first-run setup guidance, error messages, and documentation.

**Answer:**

Invest in documentation because we're using ParaAI programming and that documentation will be useful in the future. We can figure out first run later when we use it for other people's purposes, but for now it's just me.

---

## Section B — Runtime Selection Model

**B1 [Required]** Where does the user select which runtime to use — at the model config level (each saved model config specifies a runtime), at the session level (a global toggle you flip before loading), or both?

Example of what "both" would mean: a model config defaults to llama.cpp, but a session-level override switches everything to vLLM temporarily.

**Answer:**

It's a good question!

I think that when the user wants to spin up a new session, they have to select that it's for BLM or LLAMACPP first before they can see any of the menus. So we are thinking of now spawning multiple instances. So there should be some kind of like instance viewer. Multiple tabs where you can see how one is. You can see how one instance of VLLM or LLAMACPP is doing and click on another tab, visualize that. When you open a new tab, aka you're trying to start a new instance, the first thing you do is select whether or not you're wanting the instance to spawn in VLLM or LLAMACPP. That's one way of doing it and I think it's probably the best and simplest way.

---

**B2 [Required]** Can both runtimes run simultaneously (llama.cpp on one port, vLLM on another), or is it mutually exclusive — only one can be active at a time?

If simultaneous is desired: is there a use case for it (e.g., running a small fast model in llama.cpp for chat while vLLM serves a large model for agentic coding)?

**Answer: See above**

Not mutually exclusive, but runtimes will be on different ports and users can view the performance of one or the other depending on what tab is open. Right?

---

**B3 [Important]** When the user switches a model config from llama.cpp to vLLM (or creates a new vLLM config for an existing model), should the manager:

**Answer:**

I think you can't necessarily switch model configs over translation out of scope for v1 for now.

---

## Section C — vLLM Feature Scope (v1)

**C1 [Required]** Which vLLM arguments should be configurable in the manager's v1 UI? Rate each as In/Out/Defer:

- `--model` (path to model directory) — almost certainly In
- `--tensor-parallel-size` — In
- `--dtype` (auto / float16 / bfloat16 / float32) — In
- `--quantization` (awq / gptq / fp8 / bitsandbytes / None) — In
- `--max-model-len` (max context length) — In
- `--gpu-memory-utilization` (0.0–1.0, default 0.90) — In
- `--enable-prefix-caching` (boolean) — In
- `--max-num-seqs` (max concurrent requests) — In
- `--port` — In
- `--api-key` — In
- `--host` (0.0.0.0 vs 127.0.0.1) — In
- `--served-model-name` (alias for OpenAI-compat clients) — In
- `--enforce-eager` (disable CUDA graph capture, slower but less VRAM) — In
- `--speculative-config` (speculative decoding) — In
- `--lora-modules` — In

Feel free to add any I missed that matter to you.

**Answer:**

new

- `--shutdown-timeout`
- `--tokenizer`
- `--seed`
- `--hf-token`
- `--distributed-executor-backend`
- `--pipeline-parallel-size`, `-pp`
- `--enable-prefix-caching`, `--no-enable-prefix-caching`
- `--prefix-caching-hash-algo`
- `--dataset-name`
- `--dataset-path`
- `--kv-cache-dtype`
- `--kv-offloading-backend`
- `--kv-offloading-size`
- `--kv-transfer-config`
  - `kv_connector`
  - `kv_role`
  - `kv_rank` / `kv_parallel_size`
  - `kv_buffer_size`
  - `kv_connector_extra_config`
- `--enable-sleep-mode`

more? 

Also found this - might be interesting https://github.com/jungledesh/profile

---

**C2 [Required]** vLLM uses HuggingFace-format models (safetensors / config.json), not GGUF. Your current model library on `E:\` is GGUF. Where will your vLLM-format models live — a separate folder on `E:\`, a different drive, or somewhere inside WSL's filesystem?

This defines the "model path" UX: does the manager browse one unified directory or separate llama.cpp and vLLM model directories?

**Answer:**

Separate folder on E: that is specifically for vllm HF models. We could also use a folder within WSL - should be configurable? Is this possible/easy?

---

**C3 [Important]** The "Agentic Coding" preset you recently shipped (`-np 4 -sps 0.3`) is llama.cpp-specific. vLLM handles multi-request concurrency natively via its async engine — you don't need parallel slots. Should the manager have a vLLM equivalent of the "Agentic Coding" preset, and if so, what should it set? (Candidates: `--enable-prefix-caching`, `--max-num-seqs 8`, `--gpu-memory-utilization 0.95`.)

**Answer:**

something like that yes

---

**C4 [Important]** vLLM supports several quantization methods it can apply to full-precision HF models at load time (AWQ, GPTQ, FP8, bitsandbytes). Do you plan to use quantized models (in which case `--quantization` needs to be exposed), or will you use full-precision / pre-quantized models only?

**Answer:**

Quantized models will be used most definitely 

---

## Section D — UI Redesign Scope

**D1 [Required]** The UI redesign (outline + accordions, viewport-aware tooltips) — which parts of the UI are in scope for v1?

- (a) Config/flag form only (the tab panel you described as hard to use) — the model list, metrics dashboard, and load button stay as-is
- (b) Config form + runtime picker + metrics display (the three panels most affected by adding vLLM)
- (c) Full UI from scratch — everything gets the new layout

**Answer:**

something between b and c. 

The tab layout that we have before gets replaced with a single tab panel as described before. But tabs now refer to multiple instances, so VLM or CPP. The Mono page has the Model List, Metrics Dashboard, and Load button. And it all has, you know, a relatively simple UI. UI, that's easy to use.

---

**D2 [Required]** For the outline + accordion layout: should the left-side outline be a fixed sidebar (always visible), a collapsible panel, or a floating table-of-contents that highlights the current section as you scroll?

**Answer:**

Collapsible panel

---

**D3 [Important]** The flag groupings for llama.cpp are currently expressed as tabs. For vLLM they'd be different. Should the accordion groups be:

- (a) Runtime-specific (different groups for llama.cpp vs vLLM, rendered based on which runtime is selected)
- (b) Concept-based and shared across runtimes where possible (e.g., "Memory", "Performance", "Networking", "Advanced") with runtime-specific items appearing inside the relevant group
- (c) A mix — shared groups at top, runtime-specific group at bottom

**Answer:**

because llama cpp and bllm are going to have completely different renderings based on whether or not the tab was open as a llama cpp or blm session in each tab there will be different layouts but i think we have them both be concept based and shared when possible obviously specific flags will be named with specific flags and each one will have a unique tooltip.

---

**D4 [Important]** For the tooltip fix specifically — are you willing to add a JS library dependency (e.g., Floating UI, ~12 KB gzipped) for correct tooltip positioning, or do you want a pure-CSS/vanilla-JS fix?

**Answer:**

Yes. A JS library dependency is fine.

---

## Section E — Dashboard & Metrics

**E1 [Required]** vLLM exposes Prometheus-format metrics at `GET /metrics` (token throughput, prompt throughput, GPU KV cache usage %, queue depth, running/waiting/swapped request counts). Which of these do you want shown in the manager's live dashboard when vLLM is the active runtime?

Rate each In/Out/Defer:

- `avg_generation_throughput` (tokens/sec output) — In/
- `avg_prompt_throughput` (tokens/sec prompt processing) — In/
- `gpu_cache_usage_perc` (% of KV cache used) — In/
- `num_running_seqs` (active concurrent requests right now) — In/
- `num_waiting_seqs` (requests queued) — Defer
- Per-GPU VRAM usage (from `nvidia-smi`, same as llama.cpp mode) — In



---

**E2 [Important]** The current metrics dashboard is built around llama.cpp's stdout-parsed metrics. When vLLM is the active runtime, should the dashboard:

- (a) Show only vLLM's metrics (as above), replacing the llama.cpp metrics panel entirely
- (b) Show a unified panel with runtime-agnostic metrics (tokens/sec, GPU %, VRAM, requests) mapped from whichever runtime is active
- (c) Show runtime-specific panels side by side (not recommended — screen real estate)

**Answer:**

Eventually B, right now A.

---

## Section F — Operational

**F1 [Required]** Default ports: llama.cpp currently runs on a port (what is it?), and vLLM would default to 8000. Should the manager assign fixed default ports per runtime (e.g., llama.cpp = 8080, vLLM = 8000) and let users override, or fully configurable with no hardcoded defaults?

**Answer:**

Ports for runtime and let users override. Should be fully configurable.

---

**F2 [Important]** Should vLLM be accessible only on `127.0.0.1` (localhost only) or `0.0.0.0` (all interfaces, i.e., accessible from other machines on your network)? This is a security vs. convenience tradeoff.

**Answer:**

Local host only for now. I know there's a flag exposed before that allows that to be modified. Let's keep that out for now. Local hosts only at the moment.

---

**F3 [Important]** Update management: do you want the manager to check for new `vllm/vllm-openai` Docker image tags automatically (similar to how it tracks llama.cpp releases), or is this manual for v1?

**Answer:**

Sure. Check for new image tags automatically. Why not?

---

## Section G — Explicit Non-Goals

**G1 [Required]** Please confirm the following are out of scope for this charter, or correct any item:

- LM-assisted configuration (use-case-based config generation)
- Flag parser from pasted command strings (create profile from another user's flags)
- Support for runtimes other than llama.cpp and vLLM (SGLang, TGI, Ollama, LM Studio)
- vLLM LoRA adapter management
- Multi-instance (running multiple models simultaneously on different ports within the same runtime)
- Mobile / responsive layout for the redesigned UI

**Answer:**

Multi-instance, I guess, would be something that we would be talking about if we're going to have the multiple tabs. But everything else, correct. LM-assisted configuration might be something down the line. Everything else might be something down the line. But for now, let's just keep it simple.

---
