# Work Ticket: VllmAdapter Skeleton + buildArgs CLI Mapping

**Ticket ID:** `wt_pB_tB.1_cs`
**Phase:** B (VllmAdapter + Docker Integration)
**Complexity:** cs (Simple)
**Status:** Active

---

## Objective

Create the `VllmAdapter` class file with all 6 `RuntimeAdapter` interface methods stubbed, and fully implement `buildArgs()` — the mapping from `InstanceConfig` to vLLM CLI flags. This is pure data mapping with no external dependencies and is testable in isolation.

---

## Scope

**What's included:**
- New file `runtimes/vllm-adapter.js` extending `RuntimeAdapter`
- All 6 interface methods as stubs (spawn, stop, logs, waitForReady, cleanup)
- `buildArgs(config)` fully implemented with all flags from ADR-002:
  - Core: `--model`, `--tensor-parallel-size`, `--pipeline-parallel-size`, `--dtype`, `--quantization`, `--max-model-len`, `--gpu-memory-utilization`
  - Concurrency: `--max-num-seqs`, `--enable-prefix-caching`, `--prefix-caching-hash-algo`
  - Identity: `--served-model-name`, `--api-key`, `--host`, `--port`
  - Memory/KV: `--kv-cache-dtype`, `--kv-offloading-backend`, `--kv-offloading-size`, `--kv-transfer-config`
  - Advanced: `--enforce-eager`, `--tokenizer`, `--seed`, `--distributed-executor-backend`, `--enable-sleep-mode`, `--shutdown-timeout`, `--speculative-config`, `--lora-modules`, `--hf-token`
- Internal data structures: `_containers` map (parallel to LlamaCppAdapter's `_processes`)
- Export from `runtimes/index.js`

**What's explicitly excluded:**
- Actual spawn/stop/logs/waitForReady/cleanup implementations (tB.2, tB.3)
- Pre-flight checks (tB.4)
- Metrics collection (tB.5)
- Docker Hub update mechanism (tB.6)

---

## Acceptance Criteria

1. **`runtimes/vllm-adapter.js` exists** and extends `RuntimeAdapter`
2. **All 6 interface methods present** — 5 are stubs, `buildArgs` is fully implemented
3. **`buildArgs` maps all flags** — given a config object with vLLM fields, produces the correct CLI arg array matching ADR-002
4. **`--model` path uses Docker mount path** — model path is `/models/${config.modelName}` (inside container), not the host path
5. **`--host` always `127.0.0.1`** and `--port` from config
6. **Flags with falsy values are omitted** — undefined/null/0/false flags are not included in output
7. **Boolean flags emit no value** — `--enable-prefix-caching`, `--enforce-eager`, `--enable-sleep-mode` are flags only, no `true`/`false`
8. **Exported from `runtimes/index.js`** — `require('./runtimes').VllmAdapter` works

---

## Test Plan

1. **Module loads** — `node -e "const { VllmAdapter } = require('./runtimes'); const a = new VllmAdapter(); console.log(typeof a.buildArgs)"` → `function`
2. **buildArgs with full config** — Call buildArgs with a config containing all fields, verify every flag appears in output
3. **buildArgs with minimal config** — Call buildArgs with only `modelName` and `port`, verify only `--model`, `--host`, `--port` appear
4. **Boolean flag format** — Verify `--enable-prefix-caching` has no value after it (not `--enable-prefix-caching true`)
5. **JSON flags** — Verify `--kv-transfer-config` and `--speculative-config` serialize their values as JSON strings
6. **PM reviews** flag mapping against ADR-002

---

## Risks & Edge Cases

**Edge cases:**
- `--lora-modules` is a spread array (`...config.loraModules`) — handle undefined gracefully
- `--hf-token` must come from secrets store, not from config directly — for buildArgs, accept it as a config field; the caller is responsible for injecting it from secrets
- `seed` can be `0` which is falsy but valid — check with `!== undefined` not truthiness

---

## Rollback Plan

1. Delete `runtimes/vllm-adapter.js`
2. Revert `runtimes/index.js` export addition

**Estimated rollback time:** Quick (< 1 minute)

---

## Notes

- This is the smallest ticket in Phase B — pure logic, no I/O
- The buildArgs implementation will be reused directly by spawn() in tB.2
- Reference: ADR-002 CLI Argument Mapping section
