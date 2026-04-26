# Task Management System — Developer Guide

## What is this?

A task execution system that lets Claude Code work through your project's BRD systematically — one task at a time, asking questions when stuck, and tracking everything automatically.

---

## File Map

| File | Purpose | Who edits |
|------|---------|-----------|
| `.claude/TASKS.md` | Ordered task queue | Developer adds tasks; Claude Code updates status only |
| `.claude/QUESTIONS.md` | Clarification log | Claude Code writes Qs; Developer writes answers |
| `.claude/PROGRESS.md` | Completion + decision log | Claude Code auto-updates after each task |
| `.claude/BRD/` | Original BRD documents | Developer places files (read-only for Claude Code) |
| `CLAUDE.md` | Project rules + task protocol | Developer maintains |

---

## Daily Usage — Command Reference

### Core Commands

| What you want | Say this in Claude Code |
|--------------|------------------------|
| Start / continue work | `Pick the next task` |
| Resume after answering a question | `I answered your question in QUESTIONS.md. Resume the blocked task.` |
| Check progress | `Show me current progress from PROGRESS.md` |
| See blocked tasks | `What tasks are currently blocked?` |
| Review last task | `Show me what you did for the last task` |
| Re-verify a task | `Re-verify M1.T2 — check acceptance criteria again` |
| Full status report | `Read TASKS.md and PROGRESS.md. Give me a status report.` |
| Skip a task | `Mark M2.T3 as skipped and move to the next task` |
| Add a task | `Add a new task M3.T5 to TASKS.md: [description]` |

### When Claude Code Asks a Question

Claude Code will write in `QUESTIONS.md` and mark the task `[?] blocked`.

**Your steps:**
1. Open `.claude/QUESTIONS.md`
2. Find the question (it references a task ID)
3. Write your answer in the "Your Answer" section
4. Go to Claude Code → say: `I answered your question in QUESTIONS.md. Resume the blocked task.`

### When Context Resets (long sessions)

Claude Code may lose context in long sessions. When this happens:
1. Start fresh: close and reopen Claude Code
2. Say: `Read CLAUDE.md and .claude/TASKS.md. Continue from where we left off.`
3. Claude Code auto-picks up from the first `[ ] pending` task

---

## BRD Management

### Adding a New BRD

1. Place your BRD file (PDF or Word) in `.claude/BRD/`
2. Parse BRD into tasks using one of the methods below

### Parsing BRD into Tasks

**Option A — In Claude.ai (recommended for first setup):**
1. Open claude.ai
2. Upload your BRD file
3. Use this prompt:

> Parse this BRD into TASKS.md format for my ProjectSkelaton project.
>
> Rules:
> - Each module follows this sequence: Database schema → Backend module (5 files) → Frontend feature → Verification
> - Use task IDs: M{module}.T{task} (e.g., M1.T1, M1.T2)
> - Module 0 = Environment Setup (already exists)
> - Module 1 = Auth (should be first — everything depends on it)
> - Include acceptance criteria extracted from FRS/user stories
> - Include BRD section references
> - Include dependency chain (each task depends on the previous)
> - Backend tasks must note: controller/service/repository/routes/types + route registration + endpoint constant
> - Frontend tasks must note: page/types/service/slice/query/route + slice registration + API constant + Zod schema
>
> Output format: Complete TASKS.md content I can paste directly into `.claude/TASKS.md`

4. Copy the output into `.claude/TASKS.md`

**Option B — In Claude Code:**
1. Place BRD in `.claude/BRD/`
2. Say: `Read the BRD in .claude/BRD/ and parse it into .claude/TASKS.md following the module template from HOW-TO-USE.md`

### Updating BRD Mid-Project

When requirements change after work has started:

**DO:**
- Update description/criteria of `[ ] pending` tasks directly
- Add new tasks with proper dependencies and position
- Mark removed requirements as `[s] skipped` with a note
- Add a change log entry to the task:
  ```
  - **Change Log:**
    - 2025-03-25: Added bulk import, changed from 3 to 5 product types
  ```
- Tell Claude Code: `Requirements changed. Read updated TASKS.md before picking next task.`

**DON'T:**
- Modify completed `[x] done` tasks — create revision tasks instead:
  ```
  ### M2.T3-rev — Revise: Products Module — Add Bulk Import
  ```
- Delete tasks — mark them `[s] skipped` so there's an audit trail
- Change task IDs — other tasks reference them as dependencies

### BRD Update Example

Client adds "bulk import" to Products module (M3) after Users (M2) is done:

```markdown
### M3.T2 — Backend: Products Module (5 files)
- **Status:** [ ] pending
- **Description:** [UPDATED 2025-03-25] Now includes bulk import endpoint.
  Original: CRUD for 3 product types.
  Updated: CRUD for 5 product types + POST /products/bulk-import endpoint.
- **Change Log:**
  - 2025-03-25: Added 2 new product types + bulk import endpoint per client request
- **Acceptance Criteria:**
  - [updated criteria...]
```

---

## Task Structure

### Module Template

Every BRD module becomes 4 tasks in this order:

```
M{X}.T1 — Database: Schema + Migration + Seed
    ↓ depends on previous module's verify task
M{X}.T2 — Backend: Module (5 files using /node skill)
    ↓ depends on M{X}.T1
M{X}.T3 — Frontend: Feature (using /react skill)
    ↓ depends on M{X}.T2
M{X}.T4 — Verify: End-to-End Test
    ↓ next module depends on this
```

### New Task Template

Copy this when adding tasks manually:

```markdown
### M{X}.T{Y} — [Task Title]
- **Status:** [ ] pending
- **Description:** [What to build — reference BRD section, be specific]
- **Acceptance Criteria:**
  - [Measurable, testable criteria]
  - [Each bullet = one checkable item]
- **Dependencies:** [Task IDs, e.g., M1.T2, M2.T4]
- **Effort:** [Estimate]
- **BRD Reference:** [Section/page in BRD]
```

### Status Reference

| Status | Meaning | Set by |
|--------|---------|--------|
| `[ ] pending` | Waiting to be picked up | Default |
| `[>] in-progress` | Currently being built | Claude Code |
| `[x] done` | Completed, criteria met | Claude Code |
| `[?] blocked` | Needs human answer | Claude Code |
| `[!] failed` | Attempted, couldn't finish | Claude Code |
| `[s] skipped` | Intentionally skipped | Developer |

---

## Architecture Reference

### Backend Files per Task (5 files)

```
backend/src/modules/{feature}/
├── {feature}.controller.ts    → HTTP only, calls service, returns handleApiResponse
├── {feature}.service.ts       → Business logic, throws AppError on failure
├── {feature}.repository.ts    → $queryRaw for reads, Prisma client for writes
├── {feature}.routes.ts        → Express router + Zod validation middleware
└── {feature}.types.ts         → DTOs + Zod request schemas

Also registers in:
├── backend/src/routes/index.ts
└── backend/src/constant/endPoints.constant.ts
```

### Frontend Files per Task

```
frontend/src/
├── pages/{feature}/page.tsx
├── pages/{feature}/components/
├── types/{feature}.ts
├── services/{feature}/{feature}.api.ts
├── services/{feature}/{feature}.query.ts
└── store/slices/{feature}Slice.ts

Also registers in:
├── store/rootReducer.ts
├── routes/route.tsx
├── utils/constants/api.constant.ts
└── utils/validations/index.ts
```

---

## Common Scenarios

### Task too large → Split it
```markdown
### M2.T3a — Frontend: Products — List & Filter Page
### M2.T3b — Frontend: Products — Create/Edit Form
### M2.T3c — Frontend: Products — Detail View & Delete
```

### Too many questions → Add defaults to CLAUDE.md
```markdown
- For UI/styling: use Tailwind defaults and existing design tokens
- For ambiguous field names: match Prisma schema naming
- For pagination: default 10 items per page
- For date formats: use ISO 8601 (store) and DD/MM/YYYY (display)
```

### Multiple developers → Assign module ranges
- Developer A → M1–M3 (Auth, Users, Products)
- Developer B → M4–M6 (Orders, Payments, Reports)
- Each runs Claude Code independently — modules don't conflict

### Hotfix outside task queue → Log it
```markdown
## Architecture Decisions (in PROGRESS.md)
### [Date] — Hotfix: Fixed auth token expiry
**What:** Changed JWT expiry from 1h to 24h in auth.service.ts
**Affects:** M1.T2 (completed — post-completion fix)
```

### Want to reduce Claude Code questions → Be more specific
Instead of: "Build user management"
Write: "Build user management — list all users (paginated, 10/page), create user form (name, email, role dropdown), edit user (same form, pre-filled), soft delete with confirmation modal. Roles: ADMIN and SUPER_ADMIN can access. Use existing DataTable component for list."

---

## Tips

1. **Answer questions quickly** — blocked tasks block everything after them
2. **Review PROGRESS.md weekly** — it's your audit trail
3. **Don't edit completed tasks** — create revision tasks instead
4. **Use BRD Reference field** — helps Claude Code understand context
5. **Keep tasks small** — 1-2 Claude Code interactions each
6. **Front-load decisions in CLAUDE.md** — fewer questions = faster
7. **Commit after each completed task** — clean git history per feature
