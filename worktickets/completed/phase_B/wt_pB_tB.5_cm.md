# Work Ticket: vLLM Prometheus Metrics Collection

**Ticket ID:** `wt_pB_tB.5_cm`
**Phase:** B (VllmAdapter + Docker Integration)
**Complexity:** cm (Medium)
**Status:** Pending tB.3 approval

---

## Objective

Implement metrics collection for vLLM instances by polling the Prometheus `/metrics` endpoint every 2 seconds while the instance is RUNNING. Extract the 4 key metrics defined in ADR-002 and emit them through the existing adapter-metrics event pipeline.

---

## Scope

**What's included:**
- Prometheus text format parser (`parsePrometheusText(text, keys)`) — extracts specified metric values from Prometheus exposition format
- `collectMetrics(instanceId)` method on VllmAdapter — polls `GET http://localhost:{port}/metrics`, parses, emits events
- 4 metrics extracted for v1:

| Prometheus key | UI label | Type |
|---|---|---|
| `vllm:avg_generation_throughput_toks_per_s` | Generation throughput (tok/s) | gauge |
| `vllm:avg_prompt_throughput_toks_per_s` | Prompt throughput (tok/s) | gauge |
| `vllm:gpu_cache_usage_perc` | KV cache usage (%) | gauge |
| `vllm:num_requests_running` | Concurrent requests | gauge |

- Metrics polling lifecycle:
  - Start polling when instance enters RUNNING (Instance Manager starts interval)
  - Stop polling when instance leaves RUNNING (stop/error)
  - Poll interval: 2 seconds
- Integration with Instance Manager's `adapter-metrics` event — metrics emit through the same pipeline as llama.cpp metrics
- New file `runtimes/prometheus-parser.js` for the parser (testable in isolation)

**What's explicitly excluded:**
- Per-GPU VRAM from /metrics (sourced from nvidia-smi, existing system metrics)
- Additional vLLM metrics beyond the 4 listed (future iteration)
- UI rendering of metrics (Phase C)

---

## Acceptance Criteria

1. **`prometheus-parser.js` exists** and exports `parsePrometheusText(text, keys)`
2. **Parser correctly extracts TYPE gauges and counters** — handles `# TYPE`, `# HELP` comments, metric lines with labels, and metric lines without labels
3. **`collectMetrics()` polls the correct endpoint** — `http://localhost:{port}/metrics`
4. **4 metrics are extracted and emitted** — each metric maps to the correct key in the emitted data
5. **Polling starts on RUNNING** and stops on non-RUNNING state transitions
6. **Poll errors are non-fatal** — if /metrics returns non-200 or connection refused, log a warning and continue polling (vLLM may briefly be unavailable)
7. **Integration with adapter-metrics event** — metrics flow through Instance Manager to Socket.io `instance:metrics` events

---

## Test Plan

1. **Parser unit test** — Feed sample Prometheus text to `parsePrometheusText()`, verify it extracts the correct values for specified keys
2. **Parser with missing metrics** — Feed text that lacks some of the requested keys, verify missing keys return undefined without error
3. **Parser with labeled metrics** — Feed text with `{label="value"}` suffixes, verify extraction still works
4. **collectMetrics with running vLLM** — If vLLM is running, call collectMetrics and verify metrics are emitted
5. **collectMetrics with no server** — Call collectMetrics when no vLLM is running, verify it handles the connection error gracefully
6. **Polling lifecycle** — Start an instance, verify metrics polling begins. Stop the instance, verify polling stops (no stale intervals)
7. **PM reviews** the Prometheus parser output against real vLLM /metrics format

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Prometheus metric key format may change across vLLM versions
  - *Mitigation:* Parser is key-based and generic; if a key disappears, it returns undefined rather than crashing. Log a warning for missing keys.

**Edge cases:**
- Metric line has multiple samples with different labels (e.g., `vllm:num_requests_running{model="x"} 2`) — parser should return the first matching sample or sum
- Metric value is `NaN` or `+Inf` — parser should handle gracefully
- Poll interval overlap — if a poll takes longer than 2 seconds, don't stack concurrent polls (check if previous poll is still in-flight)

---

## Rollback Plan

1. Delete `runtimes/prometheus-parser.js`
2. Remove collectMetrics and polling logic from VllmAdapter

**Estimated rollback time:** Quick via git

---

## Notes

- The Prometheus text format is line-based and human-readable. No library needed — a ~30-line parser handles the 4 metrics we need.
- Example vLLM /metrics output for reference (from ADR-002):
  ```
  # HELP vllm:avg_generation_throughput_toks_per_s Average generation throughput
  # TYPE vllm:avg_generation_throughput_toks_per_s gauge
  vllm:avg_generation_throughput_toks_per_s 42.5
  ```
- Per-GPU VRAM comes from the existing nvidia-smi pipeline in server.js — not from this endpoint. This ticket only covers the 4 vLLM-specific metrics.
- Reference: ADR-002 Metrics Collection section
