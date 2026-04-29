# Work Ticket: FlowForge Structure Bootstrap

**Ticket ID:** `wt_p0_t0.1_cs`  
**Charter Task ID:** `0.1`  
**Complexity:** cs (Simple)  
**Status:** Active

---

## Objective

Establish the complete FlowForge methodology documentation and directory structure for llama-cpp-manager. This is the foundation for all future work—creating CLAUDE.md, charter, ticket template, and workticket infrastructure.

---

## Scope

**What's included:**
- CLAUDE.md with full FlowForge methodology primer and project-specific sections
- Project charter (`docs/charter.md`) defining vision, phases, success criteria, and risk register
- Ticket template (`docs/ticket_template.md`) for consistent workticket structure
- Workticket directory structure (`worktickets/active/`, `worktickets/completed/`, `worktickets/validation/`)
- Documentation of current project state and tech debt (in `docs/architecture/`)

**What's explicitly excluded:**
- Phase 1 workticket generation (separate ticket: t0.3)
- Changes to existing code or features
- Retroactive documentation of existing issues (only forward-facing structure)

---

## Acceptance Criteria

1. **CLAUDE.md exists and is complete** — Contains methodology primer, project overview, workflow rules, and development commands
2. **Charter is comprehensive** — Defines vision, success criteria, phase structure (0-5), risk register, timeline, deliverables, and glossary
3. **Ticket template is available** — Located at `docs/ticket_template.md` with all required sections (objective, scope, acceptance criteria, test plan, risks, rollback)
4. **Workticket directories exist** — `worktickets/active/`, `worktickets/completed/phase_<n>/`, `worktickets/validation/active/`, `worktickets/validation/completed/phase_<n>/`
5. **Architecture documentation started** — `docs/architecture/` folder created; current tech debt documented in `docs/architecture/debt.md`
6. **PM has reviewed and approved** all methodology documents before proceeding to t0.2

---

## Test Plan

1. **Read CLAUDE.md** — Verify it contains the full methodology primer, project description, workflow rules, and development commands
2. **Review Charter** — Confirm all sections are present (vision, goals, success criteria, phase structure, risks, timeline)
3. **Check Ticket Template** — Ensure template covers objective, scope, acceptance criteria, test plan, risks, and rollback
4. **Verify Directory Structure** — Confirm all workticket directories exist and are empty (ready for tickets)
5. **Review Architecture Docs** — Check `docs/architecture/debt.md` for clear list of known tech debt with impact assessment
6. **PM Sign-Off** — User confirms all documents are ready and moving to t0.2 is appropriate

---

## Risks & Edge Cases

**Technical risks:**
- Risk: CLAUDE.md might diverge from main FlowForge project over time
  - *Mitigation:* Mark as "source: FlowForge methodology primer" to flag it needs updating when FlowForge changes

**Edge cases:**
- PM feedback during review might require charter revisions
  - *Mitigation:* Iterate with PM until approved; it's part of this ticket

---

## Rollback Plan

If this ticket needs to be reverted:

1. Delete `CLAUDE.md`
2. Delete `docs/charter.md`, `docs/ticket_template.md`
3. Delete `docs/architecture/` folder
4. Delete all `worktickets/` directories

**Estimated rollback time:** Quick (< 5 minutes)

---

## Notes

- This is a documentation-heavy ticket but essential for all future work
- PM approval gate exists at acceptance criterion #6 — do not proceed to t0.2 until PM confirms
- The charter will be the single source of truth for all project direction
- Charter timeline and effort estimates are approximate and will be refined as actual work progresses
