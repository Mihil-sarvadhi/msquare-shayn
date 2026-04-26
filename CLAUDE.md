# Shayn MIS — Project Rules

## Repository Layout

```
Shayn/
├── .claude/          # Task management, rules, skills
│   ├── rules/        # git.md, node.md, react.md (auto-scoped by directory)
│   └── skills/       # Scaffolding skills for node and react modules
├── .husky/           # Pre-commit hooks
├── .prettierrc       # Shared Prettier config
├── package.json      # Monorepo scripts
├── backend/          # Node.js + Express + Sequelize API
└── frontend/         # React 19 + Vite + Redux SPA
```

## Quick Start

```bash
npm install && npm run install:all   # Install all dependencies
npm run fe:dev                        # Frontend at http://localhost:5000
npm run be:dev                        # Backend at http://localhost:4000
npm run db:migrate                    # Run Sequelize migrations
npm run db:seed                       # Seed connector health records
npm run lint                          # Lint both workspaces
npm run fe:build                      # Vite production build
npm run be:build                      # TypeScript compile
```

## Monorepo Scripts

| Command | Purpose |
|---------|---------|
| `npm run install:all` | Install deps in frontend + backend |
| `npm run fe:dev` | Frontend dev server (:5000) |
| `npm run be:dev` | Backend dev server (:4000) |
| `npm run fe:build` | Vite production build |
| `npm run be:build` | TypeScript compile to dist/ |
| `npm run lint` | ESLint both workspaces |
| `npm run fe:test` | Vitest test runner |
| `npm run db:migrate` | sequelize-cli db:migrate |
| `npm run db:seed` | sequelize-cli db:seed:all |
| `npm run be:typecheck` | tsc --noEmit |

## Husky & Lint-Staged (Root Only)

Pre-commit runs `lint-staged` on changed files:
- `frontend/src/**/*.{ts,tsx}` → ESLint + Prettier fix
- `backend/src/**/*.{ts,tsx}` → ESLint + Prettier fix

## Rules System

Rules auto-scope by directory:
- Working in `frontend/` → `.claude/rules/react.md` applies
- Working in `backend/` → `.claude/rules/node.md` applies
- Both → `.claude/rules/git.md` always applies

## Cross-Cutting Rules

### TypeScript
- Strict mode everywhere — zero `any`, explicit return types on exports
- `import type` for type-only imports
- Path aliases: `@/` in frontend, `@app/*` etc. in backend

### Code Quality
- ESLint + Prettier before every commit (Husky enforced)
- Zero warnings: `--max-warnings 0`
- No `console.log` — use Winston (backend) or `logger` (frontend)

### Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Feature branches from `development`, never commit directly to `main`
- One logical change per commit

### Environment
- Never commit `.env` — use `.env.example` as template
- Frontend ports: 5000 (local), 5001 (dev), 5002 (staging)
- Backend default port: 4000

### Security
- No secrets in code — CORS + Helmet + rate-limiting configured
- JWT auth with role-based guards (foundation in middleware/auth.ts)
- Roles: `USER`, `ADMIN`, `SUPER_ADMIN`

## Task Execution Protocol

1. Read `.claude/TASKS.md` → find first `[ ] pending` task
2. If unclear → write in `.claude/QUESTIONS.md`, mark task `[?] blocked`
3. Implement using correct architecture patterns
4. Verify: compile, no `any`, no `console.log`, lint passes
5. Mark task `[x] done`, log in `.claude/PROGRESS.md`

## Shayn-Specific Context

**Project:** Single-page MIS dashboard for SHAYN jewelry D2C brand

**Data Sources:**
- Shopify (orders, customers, abandoned carts) — every 15 min
- Meta Ads (campaign insights) — every 6 hours
- iThink Logistics (shipments, remittance) — every 30 min
- Judge.me (product reviews) — daily at 2am

**API Endpoints (existing, must not change paths):**
- `GET /api/dashboard/kpis|revenue-trend|meta-funnel|campaigns|top-products|logistics|abandoned-carts|reviews-summary|top-rated-products|recent-reviews|all-reviews`
- `GET /api/health`
- `POST /api/sync/shopify|meta|ithink`
- `POST /webhooks/shopify/orders/create|orders/updated`

**Database:** PostgreSQL — Sequelize migrations in `backend/src/db/migrations/`

**Brand Colors:** gold `#B8860B`, ivory `#FDFAF4`, ink `#1A1208`, emerald `#2D7D46`, ruby `#9B2235`, amber `#B45309`
