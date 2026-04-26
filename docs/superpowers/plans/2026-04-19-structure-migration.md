# Structure Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert Shayn MIS to react-node-template structure using Vite + Sequelize, preserving all existing dashboard functionality.

**Architecture:** Scaffold-first — build infrastructure before transplanting app code. Each phase is independently verifiable.

**Tech Stack:** Node.js + Express + TypeScript + Sequelize + PostgreSQL | React 19 + Vite + Redux Toolkit + React Query + Tailwind

---

## PHASE 1 — Root Monorepo Setup

- [ ] Update root `package.json` with monorepo scripts
- [ ] Add root `.prettierrc`
- [ ] Setup Husky + lint-staged
- [ ] Commit: `chore: root monorepo setup`

## PHASE 2 — .claude/ System

- [ ] Copy `.claude/` folder from template, adapt `rules/node.md` (Prisma→Sequelize)
- [ ] Create root `CLAUDE.md`
- [ ] Commit: `chore: add claude system`

## PHASE 3 — Backend Foundation

- [ ] Update `backend/package.json` (add sequelize, winston, helmet, zod etc.)
- [ ] Update `backend/tsconfig.json` (path aliases)
- [ ] Create `backend/.sequelizerc`
- [ ] Create `backend/eslint.config.cjs` + `eslint-rules/` (6 rules)
- [ ] Create `backend/src/config/config.ts` (Zod env with all Shayn vars)
- [ ] Create `backend/src/constant/` (endPoints, errorTypes, message, index)
- [ ] Create `backend/src/logger/logger.ts`
- [ ] Commit: `chore: backend foundation tooling`

## PHASE 4 — Backend Sequelize

- [ ] Create `backend/src/db/sequelize.ts`
- [ ] Create `backend/src/db/models/` (11 model files)
- [ ] Create `backend/src/db/migrations/` (5 JS migration files from existing SQL)
- [ ] Create `backend/src/db/seeders/` (connector health seeder)
- [ ] Commit: `feat: backend sequelize setup`

## PHASE 5 — Backend Utilities + Middleware

- [ ] Create `backend/src/utils/` (appError, handleResponse, jwt)
- [ ] Create `backend/src/middleware/` (security, auth, validation, errorHandler, responseHandler, index)
- [ ] Create `backend/src/types/express.d.ts`
- [ ] Commit: `feat: backend utilities and middleware`

## PHASE 6 — Backend app.ts + index.ts

- [ ] Create `backend/src/app.ts`
- [ ] Create `backend/src/index.ts` (Sequelize connect, scheduler)
- [ ] Commit: `feat: backend server entry`

## PHASE 7 — Backend Connector Modules

- [ ] Move connectors → `modules/shopify|meta|ithink|judgeme/` (update imports from `db` to sequelize)
- [ ] Move sync jobs → same modules (convert `db.query` → Sequelize model methods)
- [ ] Move backfill files → same modules
- [ ] Update `backend/src/jobs/scheduler.ts` imports
- [ ] Commit: `refactor: relocate connector modules`

## PHASE 8 — Backend API Modules

- [ ] Create `modules/dashboard/` (controller, service, repository, routes, types)
- [ ] Create `modules/health/` (controller, service, repository, routes, types)
- [ ] Create `modules/sync/` (controller, service, routes, types)
- [ ] Create `modules/webhook/` (controller, routes)
- [ ] Create `backend/src/routes/index.ts`
- [ ] Commit: `feat: backend api modules`

## PHASE 9 — Frontend Foundation

- [ ] Update `frontend/package.json` (CRA→Vite)
- [ ] Create `frontend/vite.config.ts`, `index.html`
- [ ] Create `frontend/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- [ ] Create `frontend/eslint.config.js` + `eslint-rules/` (6 rules)
- [ ] Create `frontend/.env.example`
- [ ] Commit: `chore: frontend vite migration tooling`

## PHASE 10 — Frontend Core

- [ ] Create `frontend/src/main.tsx`, `vite-env.d.ts`
- [ ] Create `frontend/src/lib/utils.ts`, `lib/logger.ts`
- [ ] Create `frontend/src/styles/globals.css`
- [ ] Create `frontend/src/store/` (storeSetup, rootReducer, hooks)
- [ ] Create `frontend/src/providers/` (AppProviders, ReduxProvider, QueryProvider)
- [ ] Create `frontend/src/services/` (baseService, apiService, dashboard.api.ts, dashboard.query.ts, react-query/)
- [ ] Create `frontend/src/store/slices/dashboardSlice.ts`
- [ ] Create `frontend/src/types/dashboard.ts`
- [ ] Create `frontend/src/utils/` (constants, formatters, validations, common-functions, status-styles)
- [ ] Commit: `feat: frontend state and services`

## PHASE 11 — Frontend Pages + Components

- [ ] Create `frontend/src/components/layout/` (AppShell, ProtectedRoute, PublicRoute, RoleGuard)
- [ ] Create `frontend/src/components/shared/` (ErrorBoundary, PageLoader)
- [ ] Create `frontend/src/components/ui/toast.tsx`
- [ ] Create `frontend/src/contexts/SidebarContext.tsx`
- [ ] Create `frontend/src/routes/route.tsx`
- [ ] Create `frontend/src/pages/auth/` (index.ts, page.tsx)
- [ ] Move 18 existing components → `frontend/src/pages/dashboard/components/`
- [ ] Create `frontend/src/pages/dashboard/page.tsx` (from App.tsx logic)
- [ ] Create `frontend/src/pages/dashboard/index.ts`
- [ ] Rewrite `frontend/src/App.tsx` as router wrapper
- [ ] Commit: `feat: frontend pages and components`

## PHASE 12 — Documentation

- [ ] Create `backend/CLAUDE.md`, `backend/RULES.md`, `backend/.cursorrules`
- [ ] Create `frontend/CLAUDE.md`, `frontend/.cursorrules`
- [ ] Clean `docs/SHAYN_MIS_Execution_Plan.md` (remove structure sections)
- [ ] Clean `docs/SHAYN_MIS_Project_Overview.md` (remove structure sections)
- [ ] Commit: `docs: add claude rules and clean documentation`

## PHASE 13 — Verification

- [ ] `npm install && npm run install:all`
- [ ] `npm run db:migrate` — verify all 5 migrations run
- [ ] `npm run be:build` — verify TypeScript compiles
- [ ] `npm run be:dev` — verify backend starts on :4000
- [ ] `npm run fe:build` — verify Vite builds
- [ ] `npm run fe:dev` — verify frontend starts on :5000
- [ ] Final commit: `chore: production-ready structure migration complete`
