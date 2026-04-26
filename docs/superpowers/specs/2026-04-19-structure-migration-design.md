# Shayn MIS — Structure Migration Design

**Date:** 2026-04-19
**Branch:** enhancement
**Status:** Approved

---

## 1. Goal

Convert the existing Shayn MIS project into a production-ready full-stack boilerplate that strictly follows the `react-node-template-main` structure, while preserving 100% of existing functionality (connectors, cron jobs, dashboard routes, React components, PostgreSQL schemas).

---

## 2. Decisions Made

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend build tool | Vite (from CRA) | Aligns with template; faster dev server |
| Database ORM | Sequelize + PostgreSQL | Easier than raw `pg`; migration tracking; no Prisma |
| Migration approach | Sequelize CLI (Option A adapted) | Existing SQL converted to Sequelize migration files |
| Restructure scope | Full restructure in one go | Clean, complete, reviewable |
| Execution strategy | Scaffold first, transplant second | Methodical; recoverable at each phase |

---

## 3. Repository Layout (Target State)

```
Shayn/
├── .claude/
│   ├── HOW-TO-USE.md
│   ├── PROGRESS.md
│   ├── QUESTIONS.md
│   ├── TASKS.md
│   ├── settings.json
│   ├── rules/
│   │   ├── git.md
│   │   ├── node.md           # Sequelize-adapted (no Prisma)
│   │   └── react.md
│   └── skills/
│       ├── node/             # 13 backend scaffolding skills
│       └── react/            # React scaffolding skills
├── .husky/
│   └── pre-commit            # lint-staged
├── .gitignore
├── .prettierrc
├── CLAUDE.md                 # Root rules — monorepo commands, cross-cutting rules
├── package.json              # Monorepo scripts
├── docs/
│   ├── SHAYN_MIS_Execution_Plan.md    # Cleaned (no structure sections)
│   ├── SHAYN_MIS_Project_Overview.md  # Cleaned (no structure sections)
│   └── superpowers/specs/
│       └── 2026-04-19-structure-migration-design.md
├── backend/
│   ├── CLAUDE.md
│   ├── RULES.md
│   ├── .cursorrules
│   ├── .env.example
│   ├── .prettierrc
│   ├── eslint.config.cjs
│   ├── eslint-rules/
│   │   ├── index.cjs
│   │   ├── enforce-path-aliases.cjs
│   │   ├── no-direct-response.cjs
│   │   ├── no-patch-route.cjs
│   │   ├── no-sequelize-in-controllers.cjs
│   │   └── no-raw-error-throw.cjs
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   └── src/
│       ├── app.ts
│       ├── index.ts
│       ├── config/
│       │   └── config.ts             # Zod-validated env (replaces env.ts)
│       ├── constant/
│       │   ├── index.ts
│       │   ├── endPoints.constant.ts
│       │   ├── errorTypes.constant.ts
│       │   └── message.constant.ts
│       ├── db/
│       │   ├── sequelize.ts          # Sequelize instance (replaces database.ts)
│       │   ├── models/
│       │   │   ├── index.ts
│       │   │   ├── ShopifyOrder.ts
│       │   │   ├── ShopifyOrderLineitem.ts
│       │   │   ├── ShopifyCustomer.ts
│       │   │   ├── ShopifyAbandonedCheckout.ts
│       │   │   ├── MetaDailyInsight.ts
│       │   │   ├── IthinkShipment.ts
│       │   │   ├── IthinkRemittance.ts
│       │   │   ├── ConnectorHealth.ts
│       │   │   ├── JudgemeReview.ts
│       │   │   ├── JudgemeProduct.ts
│       │   │   └── JudgemeStoreSummary.ts
│       │   ├── migrations/
│       │   │   ├── 20260419000001-create-shopify-tables.js
│       │   │   ├── 20260419000002-create-meta-tables.js
│       │   │   ├── 20260419000003-create-ithink-tables.js
│       │   │   ├── 20260419000004-create-health-tables.js
│       │   │   └── 20260419000005-create-judgeme-tables.js
│       │   └── seeders/
│       │       └── 20260419000001-default-connector-health.js
│       ├── logger/
│       │   └── logger.ts             # Winston logger
│       ├── middleware/
│       │   ├── index.ts
│       │   ├── errorHandler.ts
│       │   ├── responseHandler.ts
│       │   ├── security.ts           # Helmet + CORS + rate-limit
│       │   ├── validation.ts         # Zod validateRequest
│       │   └── auth.ts               # JWT + role guards (foundation)
│       ├── modules/
│       │   ├── dashboard/
│       │   │   ├── dashboard.controller.ts
│       │   │   ├── dashboard.service.ts
│       │   │   ├── dashboard.repository.ts
│       │   │   ├── dashboard.routes.ts
│       │   │   └── dashboard.types.ts
│       │   ├── health/
│       │   │   ├── health.controller.ts
│       │   │   ├── health.service.ts
│       │   │   ├── health.repository.ts
│       │   │   ├── health.routes.ts
│       │   │   └── health.types.ts
│       │   ├── sync/
│       │   │   ├── sync.controller.ts
│       │   │   ├── sync.service.ts
│       │   │   ├── sync.routes.ts
│       │   │   └── sync.types.ts
│       │   ├── webhook/
│       │   │   ├── webhook.controller.ts
│       │   │   └── webhook.routes.ts
│       │   ├── shopify/
│       │   │   ├── shopify.connector.ts   # (was connectors/shopify.ts)
│       │   │   ├── shopify.sync.ts        # (was jobs/shopifySync.ts)
│       │   │   └── shopify.backfill.ts    # (was backfill/shopifyBackfill.ts)
│       │   ├── meta/
│       │   │   ├── meta.connector.ts
│       │   │   ├── meta.sync.ts
│       │   │   └── meta.backfill.ts
│       │   ├── ithink/
│       │   │   ├── ithink.connector.ts
│       │   │   ├── ithink.sync.ts
│       │   │   └── ithink.backfill.ts
│       │   └── judgeme/
│       │       ├── judgeme.connector.ts
│       │       ├── judgeme.sync.ts
│       │       └── judgeme.backfill.ts
│       ├── jobs/
│       │   └── scheduler.ts          # Cron orchestrator (unchanged logic)
│       ├── routes/
│       │   └── index.ts              # Aggregates all module routes
│       ├── types/
│       │   └── express.d.ts
│       └── utils/
│           ├── appError.ts
│           ├── handleResponse.ts
│           └── jwt.ts
└── frontend/
    ├── CLAUDE.md
    ├── .cursorrules
    ├── .env.example
    ├── index.html                    # Vite entry HTML
    ├── vite.config.ts
    ├── vitest.config.ts
    ├── tailwind.config.js            # Kept — brand colors unchanged
    ├── postcss.config.js
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── eslint.config.js
    ├── eslint-rules/
    │   ├── index.js
    │   ├── no-default-export.js
    │   ├── no-inline-zod-schema.js
    │   ├── no-patch-api.js
    │   ├── no-raw-redux-hooks.js
    │   └── no-relative-deep-imports.js
    ├── package.json
    └── src/
        ├── main.tsx                  # Vite entry (was index.tsx)
        ├── App.tsx
        ├── vite-env.d.ts
        ├── components/
        │   ├── layout/
        │   │   ├── AppShell.tsx
        │   │   ├── ProtectedRoute.tsx
        │   │   ├── PublicRoute.tsx
        │   │   └── RoleGuard.tsx
        │   ├── shared/
        │   │   ├── ErrorBoundary.tsx
        │   │   └── PageLoader.tsx
        │   └── ui/
        │       └── toast.tsx
        ├── contexts/
        │   └── SidebarContext.tsx
        ├── hooks/
        │   └── useIntersectionObserver.ts
        ├── lib/
        │   ├── utils.ts              # cn() utility
        │   └── logger.ts
        ├── pages/
        │   ├── auth/
        │   │   ├── index.ts
        │   │   └── page.tsx          # Login page (foundation)
        │   └── dashboard/
        │       ├── index.ts
        │       ├── page.tsx          # Main dashboard (was App.tsx)
        │       └── components/       # All 18 existing components — logic unchanged
        │           ├── Header.tsx
        │           ├── KPICard.tsx
        │           ├── RevenueChart.tsx
        │           ├── MetaFunnel.tsx
        │           ├── OrderStatus.tsx
        │           ├── CODSplit.tsx
        │           ├── LogisticsSummary.tsx
        │           ├── TopProducts.tsx
        │           ├── TopRatedProducts.tsx
        │           ├── AbandonedCart.tsx
        │           ├── CustomerMetrics.tsx
        │           ├── PlatformOrders.tsx
        │           ├── CampaignTable.tsx
        │           ├── ConnectorStatus.tsx
        │           ├── ReviewsSummary.tsx
        │           ├── RecentReviews.tsx
        │           ├── AllReviewsPage.tsx
        │           └── ComingSoon.tsx
        ├── providers/
        │   ├── index.tsx
        │   ├── AppProviders.tsx
        │   ├── ReduxProvider.tsx
        │   └── QueryProvider.tsx
        ├── routes/
        │   └── route.tsx
        ├── services/
        │   ├── configs/
        │   │   ├── baseService.ts    # Axios with VITE_API_URL + 401 redirect
        │   │   └── apiService.ts     # Auto-unwraps response.data.data
        │   ├── react-query/
        │   │   ├── queryClient.ts
        │   │   ├── queryKeys.ts
        │   │   └── index.ts
        │   └── dashboard/
        │       ├── dashboard.api.ts  # All 11 API calls
        │       └── dashboard.query.ts # React Query mutations for sync endpoints
        ├── store/
        │   ├── hooks.ts
        │   ├── rootReducer.ts
        │   ├── storeSetup.ts
        │   └── slices/
        │       └── dashboardSlice.ts # Replaces useDashboard.ts — 11 thunks
        ├── styles/
        │   └── globals.css
        ├── types/
        │   └── dashboard.ts          # Interfaces from useDashboard.ts
        └── utils/
            ├── constants/
            │   ├── api.constant.ts   # API_ENDPOINTS
            │   ├── app.constant.ts
            │   └── master.constant.ts
            ├── formatters.ts         # Existing formatters — kept as-is
            ├── common-functions/
            │   └── index.ts
            ├── status-styles.ts
            └── validations/
                └── index.ts
```

---

## 4. Backend: Sequelize + PostgreSQL

### Sequelize Instance (`db/sequelize.ts`)
- `new Sequelize(DATABASE_URL, { dialect: 'postgres', pool: { max: 10 } })`
- Exported as singleton
- All models registered via `sequelize.define()` or class-based with decorators

### Repository Pattern
```typescript
// Reads — raw SQL via sequelize.query()
const rows = await sequelize.query<KpiRow>(
  `SELECT ... FROM shopify_orders WHERE ...`,
  { type: QueryTypes.SELECT, replacements: { ... } }
);

// Writes — Sequelize model methods
await ShopifyOrder.bulkCreate(orders, { updateOnDuplicate: [...] });
```

### Migration Files
- 5 Sequelize CLI migration files corresponding to existing SQL schemas
- Each `up()` runs the same CREATE TABLE SQL as existing migration files
- Each `down()` drops the tables in reverse order
- Run via: `npx sequelize-cli db:migrate`

### Connector → Module Relocation
All connector logic moved into modules, no logic changes:
- `connectors/shopify.ts` → `modules/shopify/shopify.connector.ts`
- `jobs/shopifySync.ts` → `modules/shopify/shopify.sync.ts`
- `backfill/shopifyBackfill.ts` → `modules/shopify/shopify.backfill.ts`
- (same pattern for meta, ithink, judgeme)

### API Response Format (standardized)
```typescript
// Success
handleApiResponse(res, { responseType: RES_TYPES.SUCCESS, message: '...', data: {...} })

// Error (via AppError)
throw new AppError(ERROR_TYPES.NOT_FOUND, 'Resource not found');
```

### Cron Schedules (unchanged)
| Connector | Schedule |
|-----------|----------|
| Shopify | Every 15 minutes |
| Meta Ads | Every 6 hours |
| iThink | Every 30 minutes |
| iThink Remittance | Daily 11pm |
| Judge.me | Daily 2am |

---

## 5. Frontend: Vite Migration

### Key Changes from CRA
| CRA | Vite |
|-----|------|
| `react-scripts start` | `vite` |
| `src/index.tsx` | `src/main.tsx` |
| `public/index.html` | root `index.html` |
| `REACT_APP_API_URL` | `VITE_API_URL` |
| `process.env.REACT_APP_*` | `import.meta.env.VITE_*` |
| Jest | Vitest |
| CRA path resolution | `@/` alias via vite.config.ts |

### State Management Migration
`useDashboard.ts` (monolithic hook) → Redux slice:
```typescript
// dashboardSlice.ts — one thunk per endpoint
export const fetchKpis = createAsyncThunk('dashboard/fetchKpis', () => dashboardApi.getKpis());
export const fetchRevenueTrend = createAsyncThunk('dashboard/fetchRevenueTrend', ...);
// ... 9 more thunks
```

### Data Flow
```
Component → useAppSelector(state.dashboard.kpis)
         → useAppDispatch(fetchKpis({ dateRange }))
         → dashboardApi.getKpis()
         → baseService GET /api/dashboard/kpis
         → Redux state updated
         → Component re-renders
```

### Preserved Exactly
- All 18 dashboard components (zero logic changes)
- Tailwind brand colors (gold `#B8860B`, ivory `#FDFAF4`, etc.)
- Recharts library and all chart configurations
- `utils/formatters.ts` (INR formatter, number formatter, percentage formatter)
- Date range filtering logic (moved into dashboardSlice)

---

## 6. `.claude/` System

### Rules Adaptations
- `rules/node.md` — All Prisma references replaced with Sequelize equivalents:
  - `prisma.$queryRaw` → `sequelize.query(SQL, { type: QueryTypes.SELECT })`
  - `prisma.model.create()` → `Model.create(data)`
  - `npm run db:migrate` → `npx sequelize-cli db:migrate`
  - `npm run db:seed` → `npx sequelize-cli db:seed:all`
- `rules/react.md` — Kept as-is (already Vite-compatible)
- `rules/git.md` — Kept as-is

### Skills Copied
All 13 node skills + react skills copied verbatim. The `scaffold-crud-module` skill adapted to generate Sequelize repositories instead of Prisma.

---

## 7. Documentation Changes

### `SHAYN_MIS_Execution_Plan.md` — Sections REMOVED
- "Repository Structure" (entire section)
- "Environment Setup" steps (now in CLAUDE.md)
- All SQL migration code blocks (now in Sequelize migration files)
- "Execution Sequence" (now in implementation plan)
- "Completion Checklist"

### `SHAYN_MIS_Execution_Plan.md` — Sections KEPT
- Connector implementation examples (Shopify GraphQL, Meta API, iThink REST, Judge.me)
- Sync job logic descriptions
- Dashboard API route SQL queries

### `SHAYN_MIS_Project_Overview.md` — Sections REMOVED
- "Database Schema" section (now in Sequelize models)
- "Architecture Diagram" (now in CLAUDE.md)
- "Tech Stack Justification" section

### `SHAYN_MIS_Project_Overview.md` — Sections KEPT
- Company background + problem statement
- API access status table
- Shopify / Meta / iThink / Judge.me API documentation
- Cross-platform calculated metrics
- V1 dashboard layout specification
- UI design system (colors, fonts, spacing)
- V1 scope control
- Phase 2+ roadmap

---

## 8. Functionality Preservation Checklist

- [ ] All 11 dashboard API endpoints respond identically
- [ ] All 4 connector sync jobs run on same schedules
- [ ] All 4 backfill scripts executable
- [ ] Shopify webhook receives and processes correctly
- [ ] Frontend dashboard renders all 18 components
- [ ] Date range filtering works
- [ ] Recharts charts render with real data
- [ ] INR formatting displays correctly
- [ ] Connector health status displays correctly
- [ ] PostgreSQL tables identical to current schema

---

## 9. Root Monorepo Commands (Target)

```bash
npm install && npm run install:all   # Install all deps
npm run fe:dev                        # Frontend at :5000
npm run be:dev                        # Backend at :3000
npm run lint                          # Both ESLint
npm run db:migrate                    # sequelize-cli db:migrate
npm run db:seed                       # sequelize-cli db:seed:all
npm run fe:build                      # Vite production build
npm run be:build                      # TypeScript compile
```

---

## 10. New Dependencies

### Backend (added)
- `sequelize` + `sequelize-cli` + `pg` + `pg-hstore` — ORM + PostgreSQL dialect
- `winston` — structured logging
- `helmet` + `express-rate-limit` — security
- `jsonwebtoken` + `bcryptjs` — auth foundation
- `zod` — config validation + request validation

### Frontend (added)
- `vite` + `@vitejs/plugin-react` — build tool
- `@reduxjs/toolkit` + `react-redux` + `redux-persist` — state management
- `@tanstack/react-query` — mutations
- `react-router-dom@^7` — routing
- `react-hot-toast` — toasts
- `clsx` + `tailwind-merge` — cn() utility
- `vitest` + `@vitest/coverage-v8` — testing
- `dompurify` — sanitization
- `zod` — form validation

### Backend (removed)
- Direct `pg.Pool` usage — `pg` package kept as Sequelize peer dependency but no longer used directly in app code
- `ts-node-dev` — replaced by `tsx --watch`

### Frontend (removed)
- `react-scripts` — replaced by Vite
