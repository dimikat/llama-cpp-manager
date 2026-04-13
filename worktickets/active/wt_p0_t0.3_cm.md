# Work Ticket: Generate Phase 1 Worktickets from Charter

**Ticket ID:** `wt_p0_t0.3_cm`  
**Charter Task ID:** `0.3`  
**Complexity:** cm (Medium)  
**Status:** Pending t0.1 & t0.2 approval

---

## Objective

Create detailed worktickets for all Phase 1 tasks defined in the charter. Phase 1 focuses on maintenance & stability foundation—addressing critical tech debt and establishing a rhythm for tracking llama.cpp releases. Generate tickets that are ready for PM approval and immediate execution.

---

## Scope

**What's included:**
- Generate 5 Phase 1 worktickets from charter (one per task: t1.1 through t1.5)
- Each ticket includes: objective, scope, acceptance criteria, test plan, risks, rollback plan
- Assign complexity based on work required (cs, cm, cc)
- Create tickets in `worktickets/active/` with naming convention `wt_p1_t<n>_<complexity>.md`
- Ensure tickets are interdependent where appropriate (e.g., t1.3 depends on t1.1)
- Write clear enough that PM can review and approve tickets before work starts

**What's explicitly excluded:**
- Generating Phase 2-5 worktickets (will be done when Phase 1 completes)
- Executing Phase 1 work (that begins after PM approval)
- Modifying the charter based on discovered issues (flag as discovery; charter changes go through separate process)

---

## Acceptance Criteria

1. **Five Phase 1 worktickets exist** — One for each charter task (t1.1-t1.5)
2. **Ticket structure is complete** — Each includes objective, scope, acceptance criteria, test plan, risks, rollback plan
3. **Complexity is realistic** — Based on actual work required, not on PM time (cs/cm/cc assignments are justified)
4. **Interdependencies are clear** — Tickets note if they depend on other Phase 1 tickets or prior phases
5. **Acceptance criteria are testable** — PM can validate completion without ambiguity
6. **Test plans are concrete** — Include specific steps the PM will execute to validate
7. **Rollback plans are realistic** — Each ticket includes a clear undo strategy
8. **PM reviews and approves all 5 tickets** — User confirms tickets are ready for execution

---

## Test Plan

1. **Read all 5 Phase 1 tickets** — Verify structure and completeness
2. **Check complexity assignments** — Confirm cs/cm/cc labels match the work scope
3. **Verify interdependencies** — Trace dependencies to ensure execution order is clear
4. **Review acceptance criteria** — Ensure each criterion is testable and tied to charter success goals
5. **Assess test plans** — Confirm they're specific enough for PM validation
6. **Check rollback plans** — Verify each has a clear undo strategy
7. **PM Sign-Off** — User reviews all tickets and confirms they're ready for Phase 1 execution

---

## Risks & Edge Cases

**Technical risks:**
- Risk: Phase 1 work might reveal the charter is incomplete or unrealistic
  - *Mitigation:* If discovered during ticket generation, flag as discovery but proceed with Phase 1 execution (charter updates happen post-phase)

**Edge cases:**
- If PM feedback on tickets requires significant changes, iterate with PM until approved
- If a ticket's scope becomes very large, consider splitting it with letter-suffix expansion (e.g., t1.1A, t1.1B)

---

## Rollback Plan

If this ticket needs to be reverted:

1. Delete all Phase 1 worktickets from `worktickets/active/` (files starting with `wt_p1_`)
2. Charter remains unchanged (Phase 1 tasks are still defined there)

**Estimated rollback time:** Quick (< 5 minutes)

---

## Notes

- The charter defines Phase 1 scope; your job is to expand each task into a full workticket
- Be specific about what "done" looks like for each task
- Consider what might go wrong and document risks honestly
- PM approval gate: all 5 tickets must be approved before Phase 1 execution begins
- Once approved, Phase 1 tickets are ready to be moved to `worktickets/active/` (or stay there if using one-at-a-time workflow)

---

## Phase 1 Task Reference (from Charter)

From `docs/charter.md`:

- **t1.1:** Create configuration management system (server-side model/config discovery) — cm
- **t1.2:** Document GPU metrics limitations and NVIDIA-only scope — cs
- **t1.3:** Add log parsing robustness (handle llama.cpp output format changes) — cm
- **t1.4:** Formalize config schema and migration strategy — cm
- **t1.5:** Set up llama.cpp release tracking and update procedure — cs

Each task above should have its own workticket that expands on the charter description with concrete scope, acceptance criteria, and test plan.
