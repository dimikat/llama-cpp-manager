# CLAUDE.md

This file provides guidance to Claude Code when working on the llama-cpp-manager project.

## FlowForge Methodology

This project uses **FlowForge**, a methodology for human-AI collaboration on complex projects. FlowForge provides structure for iterative work while preserving human authority over decisions. You must follow this methodology in all work on this project.

### The Three Sections

Every FlowForge project moves through three sections in order:

#### Section 1: Architecture & Planning
**Goal:** Fully define the project before execution begins. This is the most important section — no work begins until it is complete.

Section 1 follows a structured five-stage process:

1. **Stage 1 — Discovery (Socratic Q&A):** The AI generates batches of questions about the project. The PM answers them. The AI synthesizes understanding. This repeats in rounds until no fundamental questions remain. Questions are saved to `docs/discovery/questions/`, answers to `docs/discovery/answers/`, synthesis to `docs/discovery/synthesis/`. Exit when: no "Required" priority questions remain, PM agrees understanding is sufficient, new questions are refinements not fundamentals.

2. **Stage 2 — Research & Analysis:** Investigate unknowns identified during Discovery. Evaluate technology options with structured comparisons. Document decisions with rationale. Saved to `docs/research/`.

3. **Stage 3 — Architecture Specification:** Define system architecture, technology stack, integrations, and Architecture Decision Records. Saved to `docs/architecture/`.

4. **Stage 4 — Planning & Task Definition:** Create phase plans, define workstreams, write detailed task specifications, populate the charter. Flag tasks that will need pre-task validation in Section 2. Saved to `docs/implementation/`.

5. **Stage 5 — Transition:** Verify Section 1 is complete, generate first work tickets from Phase 0 task specs, PM approves, begin Section 2.

**All streams must complete Discovery through Planning before ANY stream enters Section 2.**

#### Section 2: Phase-Based Execution
**Goal:** Build the project through iterative, validated work.

- **Charter** (`docs/charter.md`) is the single source of truth for project vision, phases, success criteria, and risks.
- **Phases** are sequential milestones. Each phase has tasks, and tasks decompose into subtasks. Phases are hard gates — all work must complete before advancing. Phases never regress; if Phase 2 reveals Phase 1 was suboptimal, the fix goes into Phase 3+.
- **Work Tickets** (in `worktickets/`) are the atomic unit of work. Each ticket has an objective, scope, acceptance criteria, test plan, risks, and rollback plan. Only one ticket is active at a time. The PM must approve tickets before work begins.
- **Validation** means the PM actually tests the deliverable — not that code compiles or files exists. Every completed ticket gets a validation document with concrete steps the PM runs. Nothing is "done" until the PM confirms it works.
- **Inter-task pre-validation** for functional system tasks uses 5-phase validation sessions between tasks.

#### Section 3: Ongoing Review & Iteration
**Goal:** Maintain and improve the delivered project. Bug fixes, enhancements, documentation updates, process improvements.

### Skills & Hooks

**Skills** (in `.claude/skills/`) are slash commands that encode FlowForge workflow patterns:
- `/start-task` — Begin work on the active ticket
- `/gen-tickets` — Generate work tickets from a charter or spec
- `/validate` — Create a PM validation document
- `/gate-setup`, `/gate-merge`, `/gate-post` — Parallel execution orchestration
- `/review-ticket`, `/task-checkup` — Pre-work review and analysis
- `/deferred` — Capture ideas discovered during work for later
- `/prior-art-review` — Research existing solutions before building

**Hooks** (in `.claude/hooks/`) fire automatically: SessionStart injects branch/ticket context, PreCompact saves state before context compaction, Stop warns about uncommitted work.

### Core Principles
- **PM Authority:** The human Project Manager approves all plans, tickets, and deliverables. AI proposes and executes; PM decides.
- **Forward Only:** Never revisit completed phases. Adapt future phases instead.
- **Validated Reality:** "Working" means the PM can use it, not that it compiles. No placeholders, no mocks passed off as complete.
- **Single Source of Truth:** Every topic has one authoritative document. The charter is canonical for project direction.
- **Granular Progress:** Work decomposes into phases → tasks → subtasks. Small enough to complete in one session, specific enough to validate clearly.
- **Ticket Granularity:** Ticket complexity and scope are determined by the work required, never by available PM time. Correctness always comes first; no corners are skipped.

---

## Project Overview

**llama-cpp-manager** is a browser-based PWA that provides a unified interface to configure, load/unload llama.cpp models, and monitor system resources (CPU, GPU, RAM) in real-time. It serves as a personal tool for managing local model inference with an enhanced GUI and additional features beyond the standard llama.cpp server UI.

### Current State
- **Status:** Fairly stable, actively maintained
- **Tech Stack:** Node.js + Express backend, browser-based PWA frontend, Socket.io for real-time comms
- **User Base:** Personal use (potential for broader adoption later)
- **Release Cadence:** Moderate-to-frequent (track llama.cpp releases every 1-4 weeks)

### Known Tech Debt
1. **NVIDIA GPU hard dependency:** GPU metrics only work with nvidia-smi; AMD/Intel users get simulated metrics
2. **Close coupling to llama.cpp behavior:** Changes to llama.cpp server output format can break log parsing or metrics extraction
3. **PWA manifest is minimal:** Desktop app installability works but lacks configuration
4. **Configuration persistence:** Relies on file I/O (models/config.json) with no formal migration strategy
5. **Schema evolution:** No formal approach to config schema changes across versions

### Planned Features (Prioritized)
**Agentic Coding Support** — Most important. Agents (OpenCode, Cline, Continue.dev) issue multiple requests in rapid succession. Current single-slot architecture limits throughput.
- Parallel slots (-np / --n-parallel) — Allow 4-8 concurrent requests
- Slot prompt similarity (-sps) — Enable KV cache reuse between requests (~60% faster prefill on hits)
- Slot save path (--slot-save-path) — Persist KV cache to disk between sessions
- Secondary additions: max predict tokens, no context shift, KV cache offload control
- "Agentic Coding" preset — Button to auto-configure for agent workloads

### Key Constraint
Ticket granularity is based on **work required, not PM time available**. Correctness always comes first; no corners are skipped.

---

## Workflow

### Authority
- The Project Manager is the final approver of all plans, tickets, and deliverables.
- The AI Technical Lead orchestrates implementation.

### Ticket Naming Convention
Work tickets follow: `wt_<phase>_<task>_<complexity>.md`
- `wt` = work ticket prefix
- `<phase>` = phase number (p0, p1, p2, etc.)
- `<task>` = task ID from charter (t0.1, t0.2, t1.1, etc.)
- `<complexity>` = cs (simple), cm (medium), cc (complex)

Example: `wt_p0_t0.1_cs.md`

### Ticket Workflow
1. **Start work:** PM indicates readiness. AI reads active workticket from `worktickets/active/`
2. **Complete:** AI creates validation test, writes validation document to `worktickets/validation/active/`
3. **Wait:** PM validates and confirms
4. **Cleanup:** Move ticket and validation to `worktickets/completed/phase_<n>/`
5. **Next:** Read charter and generate next ticket

### Validation
- Every completed ticket MUST have a validation document with concrete, executable test steps
- Commands must be Windows-compatible (no grep/unix tools)
- Validation is 4-6 steps maximum
- PM's confirmation is the gate for moving forward

---

## Development Commands

### Validation
```powershell
# Start the server
npm install
npm start

# Server runs on http://localhost:3001
```

### Key Files
- `server.js` — Express server, llama.cpp process management, system monitoring
- `public/` — Browser frontend (PWA)
- `docs/features/` — Feature documentation and roadmaps
- `data/` — Runtime state (app settings, user configs, updater state)

---

## Critical Rules

1. **Do what has been asked; nothing more, nothing less**
2. **NEVER create files unless absolutely necessary** — prefer editing existing files
3. **NEVER proactively create documentation** unless explicitly requested
4. **Ticket scope is determined by correctness, not by PM time** — build right every time
5. **Validation commands must be Windows-compatible** — this is a Windows development environment
6. **Always test the feature in the browser** before reporting completion
7. **All validation steps must be concrete and reproducible**

---

## Important Reminders

- The charter (`docs/charter.md`) is the single source of truth for project direction
- Phases are hard gates; work cannot move forward until all tickets in a phase are validated
- "Done" means the PM has tested and confirmed it works — not that it compiles
- Refer to `docs/` folder for all methodology documentation
- For methodology deep-dive, see the FlowForge source at `C:\Users\dimitri\Documents\Life\Projects\AI\AI_project_template\FlowForge\forge\core\`
