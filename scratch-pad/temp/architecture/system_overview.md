# System Architecture Overview — Multi-Runtime Instance Manager

**Version:** 2.0 (redesign)
**Date:** 2026-04-27
**Status:** Stage 3 Architecture — Pending PM Review

---

## What Changed

The original manager was a single-model-at-a-time tool: one running process, one config form, one metrics view. The redesigned manager is an **instance manager**: the user can run multiple inference servers concurrently (llama.cpp and/or vLLM), each in its own tab, each independently configured and monitored.

---

## High-Level Architecture

```
Browser (PWA)
│
│  Tab 1: [vLLM] Qwen3-30B ●
│    ├── Config form (accordions + collapsible outline sidebar)
│    ├── Metrics panel (vLLM Prometheus data)
│    └── Load / Stop controls
│
│  Tab 2: [llama.cpp] Mistral-7B ●
│    ├── Config form (accordions + collapsible outline sidebar)
│    ├── Metrics panel (stdout-parsed data)
│    └── Load / Stop controls
│
│  [+ New Instance] button
│
└── WebSocket (Socket.io) — all events scoped by instanceId
        │
        ▼
Node.js Server (server.js)
│
├── Instance Manager
│     instanceMap: {
│       [instanceId]: {
│         runtime: "vllm" | "llamacpp",
│         adapter: VllmAdapter | LlamaCppAdapter,
│         status: "idle" | "loading" | "running" | "error" | "stopped",
│         port: number,
│         config: InstanceConfig,
│         logBuffer: string[],
│       }
│     }
│
├── Runtime Adapters
│     ├── VllmAdapter        — spawns docker.exe, polls /metrics, watches logs
│     └── LlamaCppAdapter    — spawns llama-server.exe, parses stdout
│
├── Config Store             — reads/writes data/instance_configs.json
├── Secrets Store            — reads/writes data/secrets.json (hf-token etc.)
├── Metrics Collector        — per-instance, runtime-aware polling
└── Updater                  — llama.cpp: GitHub releases; vLLM: Docker Hub tags
```

---

## Key Design Principles

### 1. Instance ID is the coordination key
Every backend operation, every socket event, and every config reference is keyed by a UUID `instanceId`. There is no concept of "the current instance" on the server — all state is per-instance.

### 2. Runtime adapter interface
Both runtimes implement the same interface. The instance manager calls the interface; it does not branch on runtime type. See ADR-001 and ADR-002.

### 3. Single-page UI within each tab
Each instance tab is a self-contained single-page view. No sub-tabs. The flag form uses a collapsible left sidebar outline and accordions. Tooltips use Floating UI for correct viewport-aware positioning.

### 4. Config and secrets are separated
Named instance configs (model path, flags, port, etc.) are stored in `data/instance_configs.json`. Secrets (HF token) are stored in `data/secrets.json`. Secrets are never included in config exports.

---

## Data Flow: Instance Lifecycle

```
User clicks [+ New Instance]
  → selects runtime (vLLM | llama.cpp)
  → browser creates a new tab, generates instanceId
  → sends { event: "instance:create", instanceId, runtime } to server
  → server creates entry in instanceMap (status: "idle")

User configures flags + clicks Load
  → sends { event: "instance:start", instanceId, config }
  → server calls adapter.spawn(instanceId, config)
  → adapter spawns docker run / llama-server.exe
  → adapter emits log lines: { event: "instance:log", instanceId, line }
  → adapter detects readiness (log marker or /health poll)
  → server sets status: "running", emits { event: "instance:status", instanceId, status: "running" }
  → browser tab updates status dot to green

Metrics (vLLM)
  → server polls GET http://localhost:{port}/metrics every 2s
  → parses Prometheus text format
  → emits { event: "instance:metrics", instanceId, metrics: { ... } }

User clicks Stop
  → sends { event: "instance:stop", instanceId }
  → server calls adapter.stop(instanceId)
  → vLLM: docker stop {containerName}; llama.cpp: SIGTERM to process
  → server sets status: "stopped"

Unexpected exit
  → adapter detects process/container exit with non-zero code
  → server sets status: "error", emits { event: "instance:error", instanceId, lastLines }
  → browser: toast notification + error banner in tab
```

---

## Technology Decisions

| Concern | Decision | Rationale |
|---|---|---|
| vLLM deployment | Docker Desktop + `vllm/vllm-openai` via `docker.exe` | Proven by PM, clean lifecycle, no Python env management |
| Tensor parallel | `--tensor-parallel-size 2`, `--ipc=host` | NCCL SHM fallback (no PCIe P2P on WSL2) — validated |
| Tooltip positioning | Floating UI library | Correctly handles viewport edges; ~12 KB gzipped |
| Metrics source — vLLM | Prometheus `/metrics` endpoint poll | Structured, reliable; not stdout-parsed |
| Metrics source — llama.cpp | Existing stdout regex parsing | No change to existing implementation |
| Config persistence | `data/instance_configs.json` | Consistent with existing data/ pattern |
| HF token | `data/secrets.json`, separate file | Never bundled with exportable model configs |
| vLLM updates | Docker Hub tag polling | Parallel to existing llama.cpp GitHub release tracking |
| llama.cpp updates | No change | Existing mechanism unchanged |

---

## What Is Not Changing (v1)

- llama.cpp adapter implementation details (spawn args, stdout parsing, process lifecycle) — extracted and wrapped, not rewritten
- Auto-updater logic for llama.cpp
- System metrics collection (CPU, RAM, nvidia-smi per-GPU)
- PWA manifest and service worker
