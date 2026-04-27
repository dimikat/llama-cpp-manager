# ADR-001: Multi-Instance Process Management Architecture

**Status:** Proposed — Pending PM Review
**Date:** 2026-04-27
**Deciders:** PM (Dimitri), AI Technical Lead

---

## Context

The current `server.js` manages exactly one running process at a time via a single `runningProcess` global. All socket events, metrics, and log streaming are implicitly associated with this one process. Adding vLLM and the tab-per-instance model requires managing N concurrent processes, each independently spawnable, stoppable, and monitorable.

This ADR defines the instance management architecture that replaces the single-process model.

---

## Decision

Introduce an **Instance Manager** module that:

1. Maintains a keyed map of all instances (`instanceMap`)
2. Delegates spawn/stop/log/metrics to a runtime adapter per instance
3. Scopes all Socket.io events by `instanceId`
4. Tracks lifecycle state per instance via a state machine

---

## Instance Map Schema

```javascript
// server.js — instanceMap
const instanceMap = new Map();

// Entry shape
{
  instanceId: string,          // UUID, generated at tab creation
  runtime: "vllm" | "llamacpp",
  adapter: VllmAdapter | LlamaCppAdapter,
  status: InstanceStatus,      // see state machine below
  port: number,
  config: InstanceConfig,      // resolved at start time
  containerName: string|null,  // vLLM only: "vllm-{instanceId}"
  process: ChildProcess|null,  // llama.cpp only
  logBuffer: string[],         // last 500 lines, ring buffer
  metricsInterval: NodeTimer|null,
  startedAt: Date|null,
  errorMessage: string|null,
}
```

---

## Instance Lifecycle State Machine

```
         create
IDLE ──────────────────────────────────────────┐
  │                                             │
  │ start                                       │
  ▼                                             │
LOADING                                         │
  │                                             │
  │ readiness confirmed                         │
  ▼                                             │
RUNNING                                         │
  │              │                              │
  │ stop         │ unexpected exit              │
  ▼              ▼                              │
STOPPING      ERROR ──── user dismisses ───────┘
  │
  │ stopped
  ▼
STOPPED (tab can be restarted or closed)
```

**Transitions:**
- `IDLE → LOADING`: user clicks Load; adapter.spawn() called
- `LOADING → RUNNING`: adapter signals readiness (log marker or /health 200)
- `LOADING → ERROR`: spawn fails, container exits immediately
- `RUNNING → STOPPING`: user clicks Stop
- `RUNNING → ERROR`: process/container exits unexpectedly (non-zero exit code)
- `STOPPING → STOPPED`: adapter confirms process terminated
- `ERROR → IDLE`: user clicks Restart or Dismiss (resets entry, keeps config)

---

## Socket.io Event Schema

All events carry `instanceId` as a top-level field. The browser routes events to the correct tab by matching `instanceId`.

**Browser → Server:**
```
instance:create    { instanceId, runtime }
instance:start     { instanceId, config }
instance:stop      { instanceId }
instance:dismiss   { instanceId }  // clear error state
```

**Server → Browser:**
```
instance:status    { instanceId, status }
instance:log       { instanceId, line, timestamp }
instance:metrics   { instanceId, metrics: {...} }
instance:error     { instanceId, message, lastLines: string[] }
instance:ready     { instanceId, port }
```

The server emits all events to the specific socket connection that owns the instance, or to a room keyed by `instanceId` if multiple browser tabs observe the same instance.

---

## Runtime Adapter Interface

Both runtimes implement this interface. The instance manager calls only these methods:

```javascript
interface RuntimeAdapter {
  // Spawn the server process/container. Returns a promise that resolves
  // when the spawn is confirmed (not when the server is ready).
  spawn(instanceId: string, config: InstanceConfig): Promise<void>;

  // Stop the server. Graceful first (SIGTERM / docker stop),
  // then forced after timeoutMs.
  stop(instanceId: string, timeoutMs?: number): Promise<void>;

  // Return a readable stream of log lines.
  logs(instanceId: string): Readable;

  // Check if the server is ready to accept requests.
  // Resolves true when ready, rejects on timeout.
  waitForReady(instanceId: string, timeoutMs: number): Promise<void>;

  // Translate InstanceConfig fields to runtime-specific CLI args.
  buildArgs(config: InstanceConfig): string[];

  // Clean up any resources (containers, temp files) for this instance.
  cleanup(instanceId: string): Promise<void>;
}
```

See ADR-002 for the VllmAdapter implementation and ADR (future) for the LlamaCppAdapter wrapper.

---

## Log Buffer

Each instance maintains a ring buffer of the last 500 log lines in `instanceMap[id].logBuffer`. When a new browser tab connects (or reconnects), the server replays the buffer as a burst of `instance:log` events, then continues streaming live. This allows the tab to show history without requiring persistent storage.

---

## Instance Cap (v1)

No hard cap in v1. The user is responsible for avoiding resource exhaustion. A configurable soft-cap warning (e.g., "You have 3 instances running — are you sure?") is deferred to a future iteration.

---

## Config Persistence

Instance configs are saved to and loaded from `data/instance_configs.json`. The schema is:

```json
{
  "configs": [
    {
      "id": "uuid",
      "name": "Qwen3 agentic setup",
      "runtime": "vllm",
      "lastUsed": "2026-04-27T14:32:00Z",
      "config": { ... }   // InstanceConfig fields
    }
  ]
}
```

Saved configs are named by the user. `lastUsed` is updated on each Load. Configs are listed in the UI sorted by `lastUsed` descending.

---

## Rejected Alternatives

**Global runtime toggle instead of per-instance:** A single toggle switching all instances from llama.cpp to vLLM. Rejected — doesn't support mixed concurrent instances, and the tab model makes per-instance selection natural.

**Single process map with implicit "current":** Keep one process at a time but allow switching. Rejected — doesn't meet the simultaneous-instances requirement from Discovery.

**Forking server.js into two separate servers:** Run one server.js for llama.cpp and another for vLLM. Rejected — breaks the unified UI, doubles maintenance surface.
