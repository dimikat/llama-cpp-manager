# Multi-Runtime Redesign: Phase Breakdown

**Date:** 2026-04-27
**Status:** Proposed — Pending PM Review

---

## Overview

The multi-runtime redesign is decomposed into 5 sequential phases. Each phase is a hard gate — all work must complete and be PM-validated before the next phase begins. The breakdown follows the principle of "build foundation first, then add runtimes, then overhaul UI."

---

## Phase A: Backend Instance Manager + LlamaCppAdapter Extraction

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

## Phase C: UI Overhaul — Instance Tabs & Accordion Config

**Goal:** Replace the current single-instance UI with the multi-instance tabbed interface, accordion config form, and Floating UI tooltips.

**Key deliverables:**
- Tab bar with [+ New Instance] button and runtime picker modal
- Per-instance tab view with status dot, runtime badge, model name
- Collapsible left sidebar outline with scroll-spy
- Accordion flag groups (shared taxonomy, runtime-conditional content)
- Floating UI tooltip integration
- Error state banner + toast notifications
- Preset buttons per runtime

**Depends on:** Phase A (Socket.io events with instanceId), Phase B (vLLM metrics/events for UI rendering)

**Estimated tickets:** 5-7

---

## Phase D: Config & Secrets Storage

**Goal:** Implement named instance config persistence, secrets storage, and the saved configs UI.

**Key deliverables:**
- `data/instance_configs.json` read/write
- `data/secrets.json` read/write with .gitignore protection
- `data/app_settings.json` vLLM fields
- Saved configs list UI (sorted by lastUsed, with Load/Rename/Delete actions)
- HF token form integration (read from secrets, inject at spawn, never persist in config)

**Depends on:** Phase A (instance config data structures), Phase C (config list UI)

**Estimated tickets:** 3-4

---

## Phase E: Integration Testing & Polish

**Goal:** End-to-end validation of the complete multi-runtime system, edge case handling, and documentation.

**Key deliverables:**
- E2E validation of mixed llama.cpp + vLLM concurrent instances
- Resource exhaustion edge case handling
- Reconnection behavior (browser disconnect/reconnect, log buffer replay)
- Error recovery flows (container crash, process kill, Docker Desktop stop)
- Performance validation (metrics polling overhead at 3+ instances)
- Documentation updates (README, architecture docs, CLAUDE.md)

**Depends on:** All prior phases

**Estimated tickets:** 3-4

---

## Dependency Graph

```
Phase A ──→ Phase B ──→ Phase C ──→ Phase D ──→ Phase E
                                        ↑
                              (D also depends on A)
```

Phase C depends on both A and B because the UI needs to render vLLM-specific content.
Phase D depends on A (data structures) and C (UI for config management).

---

## Total Estimate

| Phase | Tickets | Est. Sessions |
|-------|---------|---------------|
| A     | 5-6     | 3-4           |
| B     | 4-5     | 2-3           |
| C     | 5-7     | 4-5           |
| D     | 3-4     | 2             |
| E     | 3-4     | 2-3           |
| **Total** | **20-26** | **13-17** |

This replaces the charter's original Phase 1-5 structure for the redesign work. The original Phase 1 maintenance tasks (t1.1-t1.5) should be evaluated: some may be subsumed by the redesign (e.g., t1.4 config schema is addressed by Phase D), while others remain independent (e.g., t1.5 release tracking).
