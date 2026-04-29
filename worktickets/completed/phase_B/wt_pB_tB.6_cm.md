# Work Ticket: vLLM Update Mechanism (Docker Hub)

**Ticket ID:** `wt_pB_tB.6_cm`
**Phase:** B (VllmAdapter + Docker Integration)
**Complexity:** cm (Medium)
**Status:** Pending tB.1 approval (independent of tB.2–tB.5)

---

## Objective

Implement version checking and image pulling for vLLM via Docker Hub. This provides the update workflow parallel to the existing llama.cpp GitHub release tracker: check for new tags, pull the image, and update the pinned version.

---

## Scope

**What's included:**
- `checkForUpdates(currentTag)` method on VllmAdapter:
  - Query Docker Hub API: `https://hub.docker.com/v2/repositories/vllm/vllm-openai/tags?page_size=20&ordering=last_updated`
  - Parse response, filter to semantic version tags (`/^v\d/`)
  - Return `{ latestTag, updateAvailable, allTags }`
- `pullImage(tag, onProgress)` method:
  - Run `docker pull vllm/vllm-openai:{tag}` via child_process.spawn
  - Stream pull progress as log lines (Docker outputs layer download status to stdout)
  - Emit progress through the adapter's event system
  - Resolve when pull completes, reject on failure
- Pinned image tag stored in `data/app_settings.json` under `vllm.imageTag` (per ADR-004)
- Integration point: expose these methods for the UI to call (actual API endpoint + UI in Phase C/D)

**What's explicitly excluded:**
- UI for update checking/pulling (Phase C/D)
- Automatic update checking on a schedule
- Rollback to previous image (just re-pull the old tag)
- Changes to llama.cpp updater (unchanged)

---

## Acceptance Criteria

1. **`checkForUpdates()` queries Docker Hub API** and returns structured result with latest tag
2. **Tag filtering works** — only tags matching `v\d+` pattern are included (filters out `latest`, `nightly`, etc.)
3. **`updateAvailable` is correct** — `true` when latest tag differs from currentTag, `false` when same
4. **`pullImage()` streams docker pull output** — progress lines are emitted as log events
5. **`pullImage()` resolves on completion** — promise resolves when `docker pull` exits 0
6. **`pullImage()` rejects on failure** — promise rejects with error message if docker pull fails
7. **Network errors handled gracefully** — Docker Hub API unreachable returns error, doesn't crash
8. **Pinned tag read/write** — current tag can be read from and written to `data/app_settings.json`

---

## Test Plan

1. **checkForUpdates live** — Call with a known old tag (e.g., `v0.6.0`), verify it returns `updateAvailable: true` and a newer tag
2. **checkForUpdates current** — Call with the actual latest tag, verify `updateAvailable: false`
3. **checkForUpdates network error** — Disconnect network or use invalid URL, verify graceful error
4. **Tag filtering** — Verify tags like `latest`, `nightly`, `sha-abc123` are excluded from results
5. **pullImage small image** — Pull a known small image tag, verify progress events and completion
6. **pullImage invalid tag** — Attempt to pull a nonexistent tag, verify rejection with clear error
7. **PM reviews** the Docker Hub integration

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Docker Hub API rate limits unauthenticated requests (100 req/6 hours for hub.docker.com/v2)
  - *Mitigation:* Check-for-updates is user-initiated, not polled. 100 requests is plenty for manual checks.

**Edge cases:**
- Docker Hub returns paginated results — only first page is fetched (20 tags). Sufficient for finding the latest version.
- `docker pull` progress output format varies by Docker version — parse loosely, just stream as log lines
- Pull is interrupted (network drop, user cancellation) — Docker handles partial layers; re-pulling resumes

---

## Rollback Plan

1. Remove checkForUpdates, pullImage methods from VllmAdapter
2. Revert any app_settings.json schema changes

**Estimated rollback time:** Quick via git

---

## Notes

- This ticket can be developed in parallel with tB.2–tB.5 — it only depends on tB.1 (adapter skeleton)
- The Docker Hub API v2 is public and unauthenticated for reading tags
- Unlike the llama.cpp updater (which downloads a zip and extracts), vLLM updates are just `docker pull` — much simpler
- The pinned tag is stored alongside llama.cpp settings in app_settings.json per ADR-004:
  ```json
  { "vllm": { "imageTag": "v0.8.5", "modelDir": "...", "defaultPort": 8000 } }
  ```
- Reference: ADR-002 Update Mechanism section
