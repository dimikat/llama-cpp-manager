# ADR-004: Config & Secrets Storage

**Status:** Proposed — Pending PM Review
**Date:** 2026-04-27
**Deciders:** PM (Dimitri), AI Technical Lead

---

## Context

The manager needs to persist two new categories of data:
1. **Named instance configs** — user-titled saved configurations (model path, flags, port, runtime) that survive browser restarts and can be reloaded into any new instance tab.
2. **Secrets** — HF token and any future sensitive values. Must be stored separately from model configs so they are never bundled into config exports.

The existing `data/` directory holds runtime state (`app_settings.json`, `user_configs.json`, updater state). The new schema extends this pattern.

---

## Decision

### File layout

```
data/
  app_settings.json       — existing: llama.cpp path, models dir, updater settings
                            NEW: vLLM image tag, vLLM model dir, max instances warning threshold
  instance_configs.json   — NEW: saved named instance configs (all runtimes)
  secrets.json            — NEW: HF token and future secrets (gitignored, not exported)
  user_configs.json       — existing: current llama.cpp flag values (preserved as-is for now)
```

`secrets.json` is added to `.gitignore`. The other files follow the existing pattern (already gitignored via `data/` or equivalent).

---

## `instance_configs.json` Schema

```json
{
  "version": 1,
  "configs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Qwen3 agentic setup",
      "runtime": "vllm",
      "lastUsed": "2026-04-27T14:32:00.000Z",
      "createdAt": "2026-04-25T10:00:00.000Z",
      "config": {
        "modelDir": "E:\\models\\vllm",
        "modelName": "Qwen3-30B-A3B",
        "port": 8000,
        "imageTag": "v0.8.5",
        "tensorParallelSize": 2,
        "dtype": "auto",
        "gpuMemoryUtilization": 0.95,
        "enablePrefixCaching": true,
        "maxNumSeqs": 8,
        "apiKey": "token-abc123"
      }
    },
    {
      "id": "...",
      "name": "Mistral fast",
      "runtime": "llamacpp",
      "lastUsed": "2026-04-26T09:15:00.000Z",
      "createdAt": "2026-04-20T11:00:00.000Z",
      "config": {
        "modelPath": "E:\\models\\mistral-7b-q4.gguf",
        "port": 8080,
        "ngl": 99,
        "threads": 6,
        "contextSize": 8192
      }
    }
  ]
}
```

**Rules:**
- `id` is a UUID generated at save time. Immutable.
- `name` is user-provided at save time. Editable.
- `lastUsed` is updated on every Load, not on Save.
- `config` is runtime-specific — no shared schema enforced at the file level; validation happens in the runtime adapter.
- `hfToken` is **never** stored in a config entry, even if the user fills it in the form. The form reads it from `secrets.json` at load time and injects it at spawn time only.

---

## `secrets.json` Schema

```json
{
  "version": 1,
  "hfToken": "hf_xxxxxxxxxxxxxxxxxxxx"
}
```

**Rules:**
- File is created on first save of an HF token. If missing, the token field in the UI shows empty.
- File is added to `.gitignore` on first write if not already present (the server checks).
- Future secrets (API keys for other services) are added as top-level fields.
- No encryption in v1 — file is plaintext on the local filesystem. Acceptable for personal-use single-machine setup. A note in the UI informs the user: "Token stored in plaintext on this machine."

---

## `app_settings.json` Additions

New fields added to the existing settings schema:

```json
{
  "vllm": {
    "imageTag": "v0.8.5",
    "modelDir": "E:\\models\\vllm",
    "defaultPort": 8000
  },
  "llamacpp": {
    "defaultPort": 8080
  },
  "instanceWarningThreshold": null
}
```

`instanceWarningThreshold` is null in v1 (no cap). Will be a user-configurable integer in a future iteration.

---

## Config List UI Behavior

- Saved configs are listed sorted by `lastUsed` descending (most recent first).
- Each entry shows: name, runtime badge, model name, last used date.
- Actions: Load (opens a new instance tab pre-filled with this config), Rename, Delete.
- Loading a saved config does not start the instance — it opens a tab in IDLE state with the form pre-filled. The user clicks Load to start.

---

## Migration from `user_configs.json`

Existing `user_configs.json` entries (llama.cpp configs from the current single-instance model) are not automatically migrated in v1. They remain accessible via the existing config system until a migration tool is added. This avoids a breaking change to existing data.

In a future iteration, a one-time migration script will convert `user_configs.json` entries into `instance_configs.json` entries with `runtime: "llamacpp"`.

---

## Rejected Alternatives

**Merge secrets into `app_settings.json`:** Rejected — a single secrets file that is gitignored is safer. If `app_settings.json` accidentally gets committed, it should not contain sensitive tokens.

**OS Credential Manager (Windows Credential Manager):** Deferred — acceptable for personal use, but adds native module dependency (`keytar` or similar) and complicates cross-platform portability if this ever runs on Linux/macOS. Revisit if the tool becomes multi-user.

**Encrypt `secrets.json` with a derived key:** Deferred — meaningless for a locally-running personal tool where the key derivation input (machine ID) is also on the same machine. If multi-user or cloud sync is ever added, revisit.

**Per-instance secrets (different HF token per config):** Rejected for v1 — one user, one HF account. The token is injected at spawn time from the shared secrets file, not stored per-config.
