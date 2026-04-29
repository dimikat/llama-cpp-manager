# Work Ticket: Define Runtime Adapter Interface & Instance Data Structures

**Ticket ID:** `wt_pA_tA.1_cm`
**Phase:** A (Backend Instance Manager + LlamaCppAdapter Extraction)
**Complexity:** cm (Medium)
**Status:** Active

---

## Objective

Create the Runtime Adapter interface and all supporting data structures (InstanceConfig, InstanceStatus enum, instance map entry shape) that define the contract between the Instance Manager and any runtime adapter. This is the foundational type definition ticket — all subsequent Phase A tickets depend on it.

---

## Scope

**What's included:**
- New file `runtimes/adapter-interface.js` defining the `RuntimeAdapter` base class with method stubs:
  - `spawn(instanceId, config)` → Promise<void>
  - `stop(instanceId, timeoutMs)` → Promise<void>
  - `logs(instanceId)` → Readable stream (or event emitter pattern)
  - `waitForReady(instanceId, timeoutMs)` → Promise<void>
  - `buildArgs(config)` → string[]
  - `cleanup(instanceId)` → Promise<void>
- New file `runtimes/instance-types.js` defining:
  - `InstanceStatus` enum: `IDLE`, `LOADING`, `RUNNING`, `STOPPING`, `ERROR`, `STOPPED`
  - `InstanceMapEntry` shape documentation (JSDoc)
  - `InstanceConfig` base schema (common fields + runtime-specific extension pattern)
- All methods throw `"Not implemented"` in the base class (abstract pattern in vanilla JS)

**What's explicitly excluded:**
- Actual adapter implementations (LlamaCppAdapter is ticket tA.2)
- Instance Manager module (ticket tA.3)
- Socket.io event routing (ticket tA.4)
- Any changes to server.js or existing functionality

---

## Acceptance Criteria

1. **`runtimes/adapter-interface.js` exists** with a `RuntimeAdapter` class exporting all 6 methods as stubs that throw `"Not implemented"`
2. **`runtimes/instance-types.js` exists** with `InstanceStatus` enum (6 states), `InstanceMapEntry` JSDoc, and `InstanceConfig` shape documentation
3. **`runtimes/index.js` exists** as barrel export for the module
4. **No changes to existing server.js** — this ticket adds files only, no modifications to running code
5. **Methods match ADR-001 interface** — spawn, stop, logs, waitForReady, buildArgs, cleanup
6. **PM reviews and approves** the interface contract before LlamaCppAdapter implementation begins

---

## Test Plan

1. **Verify files exist** — `runtimes/adapter-interface.js`, `runtimes/instance-types.js`, `runtimes/index.js`
2. **Require the module** — `node -e "const { RuntimeAdapter } = require('./runtimes'); console.log(typeof RuntimeAdapter)"` should print `function`
3. **Check InstanceStatus values** — `node -e "const { InstanceStatus } = require('./runtimes'); console.log(InstanceStatus)"` should show all 6 states
4. **Verify stubs throw** — Creating a `new RuntimeAdapter()` and calling any method should throw `"Not implemented"`
5. **PM review** — Confirm the interface matches ADR-001 and is sufficient for both LlamaCppAdapter and VllmAdapter

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Interface might not anticipate needs of VllmAdapter (e.g., container name tracking)
  - *Mitigation:* ADR-001 and ADR-002 already define the interface; verify against both before finalizing

**Edge cases:**
- Vanilla JS doesn't have native abstract classes — use throw-based stubs instead
- InstanceConfig may need runtime-specific fields; define a base + extension pattern rather than a single monolithic schema

---

## Rollback Plan

If this ticket needs to be reverted:

1. Delete `runtimes/` directory

**Estimated rollback time:** Quick (< 1 minute)

---

## Notes

- This is a pure foundation ticket — no runtime behavior changes
- The `InstanceConfig` shape must accommodate both llama.cpp flags (see server.js lines 2248-2367) and vLLM flags (see ADR-002 buildArgs mapping)
- Keep the adapter interface minimal — 6 methods per ADR-001. Don't add convenience methods that belong in the Instance Manager instead.
- References: ADR-001 (Instance Manager), ADR-002 (VllmAdapter, for interface validation)
