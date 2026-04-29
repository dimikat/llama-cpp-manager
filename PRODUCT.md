# Product

## Register

product

## Users

A developer or power user managing local LLM inference on their own machine. They are actively coding with AI agents (OpenCode, Cline, Continue.dev) running against locally-hosted models, and need to configure, launch, and monitor those models without interrupting their workflow. They understand GPU layers, context sizes, and quantization, but want the tool to handle the complexity so they can focus on their work. Their primary context is glancing at a second monitor or background window to check GPU temps, token speed, and model status while agents run in the foreground.

## Product Purpose

llama-cpp-manager is a browser-based PWA that provides a unified interface to configure, load, and unload multiple inference runtimes (llama.cpp, vLLM) and monitor system resources (CPU, GPU, RAM, VRAM) in real time. It exists because the raw command-line tools require memorizing flags and lack real-time visibility into system health. Success means the user can go from "I need a model running" to "model is loaded and serving requests" in seconds, with full confidence that their hardware can handle it.

## Brand Personality

Precise, calm, technical. The interface should feel like a well-made instrument: every element has a purpose, nothing is decorative, and the information hierarchy is immediately clear. It should inspire quiet confidence, not excitement. Think of the difference between a surgical instrument and a gadget.

## Anti-references

- **Ollama WebUI (basic):** Too sparse, lacks information density and polish. A model manager should show you the state of your system at a glance, not require you to dig.
- **Overly animated/flashy interfaces:** This is a background tool for people doing real work. Motion should be functional (state transitions, loading indicators), never decorative. No bounce effects, no particle animations, no gradient shimmer.
- **Generic admin dashboards:** This is not a SaaS product with a marketing team. It should feel handcrafted and opinionated, not templated.

## Design Principles

1. **Instrument, not appliance.** Expose the full power of llama.cpp and vLLM configuration. Don't hide options behind "simple" modes. Trust the user to understand their tools.

2. **Glanceable state.** The most important information (is it running, how hot is the GPU, how fast are tokens generating) should be visible from across the room on a second monitor. Status indicators should use position, color, and size to communicate without reading.

3. **Stay out of the way.** The tool is a means to an end. Configuration should be fast and forgettable. Once a model is running, the UI should recede and let the user focus on their actual work.

4. **Density with clarity.** Cursor and VS Code prove you can show a lot of information without overwhelming. Group related controls, use progressive disclosure for advanced options, and maintain strict visual hierarchy.

5. **Consistent mental model.** Multi-instance, multi-runtime means the UI needs a clear spatial model. Each instance is a distinct entity with its own state, config, and logs. The user should never be confused about which instance they are looking at or controlling.

## Accessibility & Inclusion

WCAG 2.1 AA compliance as baseline. The user base is technical but the tool should be usable with keyboard navigation, adequate color contrast ratios, and screen reader basics. Reduced motion preferences should be respected (functional transitions only, no decorative animation).
