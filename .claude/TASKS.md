# Task Queue

> **Execution Rules:**
> - Pick the FIRST `[ ] pending` task. Work strictly in order.
> - Status: `[ ] pending` → `[>] in-progress` → `[x] done` | `[?] blocked` | `[!] failed`
> - Use `/node` skill for backend modules, `/react` skill for frontend features
> - If unclear — write in QUESTIONS.md, mark `[?] blocked`, STOP

---

## M0: Project Environment Setup

### M0.T1 — Verify & Configure Development Environment
- **Status:** [ ] pending
- **Description:** Verify both servers start cleanly, database connection works, health check responds OK.
- **Acceptance Criteria:**
  - `npm run be:dev` starts on port 3000 without errors
  - `npm run fe:dev` starts on port 5000 without errors
  - Health check endpoint responds OK
  - Database connection verified via Prisma
- **Dependencies:** None

---

<!-- More modules will be added after BRD is parsed -->
<!-- Use the module template from HOW-TO-USE.md Section: "Module Template" -->
