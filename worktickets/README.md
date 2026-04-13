# Worktickets Directory

This directory contains all work tickets for llama-cpp-manager, organized by lifecycle stage.

## Structure

```
worktickets/
├── active/                      # Current work being executed
├── completed/
│   ├── phase_0/                # Phase 0 completed tickets
│   ├── phase_1/                # Phase 1 completed tickets
│   └── ...
└── validation/
    ├── active/                 # Validation docs for work in progress
    └── completed/
        ├── phase_0/            # Validation docs for completed phase 0 work
        └── ...
```

## Naming Convention

Work tickets follow the naming schema: `wt_<phase>_<task>_<complexity>.md`

- `wt` = work ticket prefix
- `<phase>` = phase number (p0, p1, p2, etc.)
- `<task>` = task ID from charter (t0.1, t0.2, t1.1, etc.)
- `<complexity>` = cs (simple), cm (medium), cc (complex)

**Example:** `wt_p0_t0.1_cs.md` = Work ticket for Phase 0, Task 0.1, Simple complexity

## Workflow

1. **Active Work**
   - Ticket sits in `worktickets/active/` while being executed
   - PM reads it to understand what's being done
   - AI creates a validation document in `worktickets/validation/active/` when complete

2. **Validation**
   - PM runs the validation steps from `worktickets/validation/active/<ticket>_validation.md`
   - PM confirms "Success" or "Failure" for each step
   - If Success: move to step 3. If Failure: ticket goes back to active, issue is fixed.

3. **Completion & Cleanup**
   - Move workticket from `worktickets/active/` to `worktickets/completed/phase_<n>/`
   - Move validation from `worktickets/validation/active/` to `worktickets/validation/completed/phase_<n>/`
   - Ticket is now part of project history

## Ticket Content

All tickets must follow the template at `docs/ticket_template.md` and include:

- **Objective** — What and why
- **Scope** — What's included/excluded
- **Acceptance Criteria** — 3-5 specific, testable conditions
- **Test Plan** — How PM will validate
- **Risks & Edge Cases** — What could go wrong
- **Rollback Plan** — How to undo if needed

## Current Status

**Phase 0 (Bootstrap)** is active with 3 tickets:
- `wt_p0_t0.1_cs.md` — FlowForge structure bootstrap
- `wt_p0_t0.2_cm.md` — Document architecture & tech debt
- `wt_p0_t0.3_cm.md` — Generate Phase 1 worktickets

See `docs/charter.md` for full phase definitions and timeline.
