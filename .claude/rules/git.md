# Git Rules — Organization SOP

These rules apply whenever Claude Code creates commits, branches, or prepares code for merge requests.

---

## Branch Rules

### Branch Hierarchy
- `main` → Production only. Never commit directly. Updated via approved MR from `development` or `hotfix/*`
- `development` → Integration branch. Base for all `feature/*` and `bugfix/*`. Always deployable to staging
- `feature/*` → New features. Created FROM `development`, merged back INTO `development` via MR
- `bugfix/*` → Fixes for staging/testing issues. Created FROM `development`, merged INTO `development`
- `hotfix/*` → Urgent production fixes. Created FROM `main`, merged INTO both `main` AND `development`

### Branch Naming
Always use lowercase, kebab-case, descriptive names:

- Features: `feature/{task-id}-{short-description}`
  - Example: `feature/m2-t3-user-management`
  - Example: `feature/m3-t2-product-crud`
- Bugfixes: `bugfix/{short-description}`
  - Example: `bugfix/login-api-timeout`
- Hotfixes: `hotfix/{short-description}`
  - Example: `hotfix/payment-failure-production`

### Task-to-Branch Mapping
When working on a task from TASKS.md:
- Each module's backend + frontend tasks should be on ONE feature branch
- Branch name includes the task ID for traceability
- Example: Task M2.T2 (Backend: User Module) → `feature/m2-user-management`

---

## Commit Rules

### Commit Message Format
**Always use:** `type(scope): short description`

### Valid Types
- `feat` → New feature or capability
- `fix` → Bug fix
- `refactor` → Code restructuring (no behavior change)
- `perf` → Performance improvement
- `chore` → Build, CI, tooling, dependencies
- `docs` → Documentation only
- `test` → Adding or updating tests
- `style` → Formatting, whitespace (no logic change)

### Scope = Module or Feature Name
Use the feature/module name as scope:
- `feat(auth): add JWT refresh token support`
- `feat(user): add user CRUD repository`
- `fix(product): resolve price calculation rounding`
- `refactor(order): simplify order service validation`
- `chore(prisma): add product model migration`
- `docs(readme): update environment setup guide`

### Commit Discipline
- Commit in **small logical units** — one concern per commit
- Never bundle unrelated changes in a single commit
- Commit after completing each sub-step within a task, not one giant commit at the end
- Example commit sequence for a backend module task:
  ```
  feat(product): add prisma schema and migration
  feat(product): add repository with raw SQL queries
  feat(product): add service with business logic
  feat(product): add controller and route registration
  test(product): add product API integration tests
  ```

---

## Workflow Rules — STRICTLY ENFORCED

### Before Starting Any Task
1. Confirm you are on the correct branch
2. Pull latest changes: `git pull origin development`
3. If starting a new module → create branch from development:
   `git checkout -b feature/m{X}-{feature-name} development`

### During Task Execution
1. Commit frequently in small logical units
2. Push after each meaningful commit — never accumulate unpushed work
3. No debug logs (`console.log`) or commented-out code in commits
4. No hardcoded secrets, API keys, or environment-specific values
5. No `.env` files in commits (use `.env.example`)

### After Completing a Task
1. Ensure code builds: `npm run fe:build` and/or `npm run be:build`
2. Ensure lint passes: `npm run lint`
3. Rebase with latest development: `git pull --rebase origin development`
4. Resolve any merge conflicts locally
5. Push the branch: `git push origin feature/m{X}-{feature-name}`
6. Do NOT merge — developer raises MR manually

### What Claude Code Must NEVER Do
- Never commit directly to `main` or `development`
- Never force push (`git push --force`)
- Never reuse old merged branches — always create fresh
- Never merge branches — only commit and push; MR is raised by the developer
- Never delete remote branches
- Never commit `.env`, `node_modules/`, `dist/`, or build artifacts
