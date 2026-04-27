# Shopify Phase 2 — Slice 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation infrastructure (sync_cursors table, source enum, backfill orchestrator skeleton) that all three subsequent Phase 2 slices (Finance, Catalog, Marketing/Risk) will plug into.

**Architecture:** Add a single `sync_cursors` table that tracks per-resource sync state (last_synced_at, bulk-op id, status). Add a `SOURCE` constant for marketplace identification. Build a generic backfill orchestrator that delegates to per-resource handlers registered via a simple registry pattern. Admin-role-protected sync endpoints. Matches existing controller→service→repository architecture and raw-SQL migration pattern.

**Tech Stack:** Node.js 18+, Express, TypeScript 5.7, Sequelize 6, PostgreSQL, Winston logger, JWT auth.

**Spec reference:** `docs/superpowers/specs/2026-04-26-shopify-phase2-expansion-design.md` Sections 2 (decisions), 3.1 (source-agnostic schema), 4 (sync strategy), 5.4 (sync_cursors), 6.1 (sync endpoints), 9.3 (security).

---

## File Structure

**Create:**
- `backend/src/db/migrations/20260426000001-create-sync-cursors.js` — sync_cursors table migration
- `backend/src/db/models/SyncCursor.ts` — Sequelize model
- `backend/src/constant/source.constant.ts` — SOURCE enum + helper
- `backend/src/modules/sync-orchestrator/sync-orchestrator.types.ts` — types for resource registry
- `backend/src/modules/sync-orchestrator/sync-orchestrator.registry.ts` — global registry of resource handlers
- `backend/src/modules/sync-orchestrator/sync-orchestrator.service.ts` — backfill + incremental orchestration
- `backend/src/modules/sync-orchestrator/sync-orchestrator.controller.ts` — HTTP layer
- `backend/src/modules/sync-orchestrator/sync-orchestrator.routes.ts` — Express routes

**Modify:**
- `backend/src/db/models/index.ts` — barrel-export SyncCursor
- `backend/src/constant/index.ts` — re-export from source.constant
- `backend/src/routes/index.ts` — mount sync-orchestrator routes

---

## Task 1: Add SOURCE constant

**Files:**
- Create: `backend/src/constant/source.constant.ts`
- Modify: `backend/src/constant/index.ts`

- [ ] **Step 1.1: Create the SOURCE constant file**

Create `backend/src/constant/source.constant.ts`:

```typescript
export const SOURCE = {
  SHOPIFY: 'shopify',
  MYNTRA: 'myntra',
  AMAZON: 'amazon',
  FLIPKART: 'flipkart',
  UNICOMMERCE: 'unicommerce',
} as const;

export type SourceType = (typeof SOURCE)[keyof typeof SOURCE];

export const SOURCE_VALUES: SourceType[] = Object.values(SOURCE);

export function isValidSource(value: string): value is SourceType {
  return SOURCE_VALUES.includes(value as SourceType);
}
```

- [ ] **Step 1.2: Re-export from constant index**

Open `backend/src/constant/index.ts` and append the re-export. The file already re-exports other constant modules — follow the same pattern. Add this line:

```typescript
export * from './source.constant';
```

- [ ] **Step 1.3: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS, no errors.

- [ ] **Step 1.4: Commit**

```bash
git add backend/src/constant/source.constant.ts backend/src/constant/index.ts
git commit -m "feat(constant): add SOURCE enum for marketplace identification"
```

---

## Task 2: Migration — create sync_cursors table

**Files:**
- Create: `backend/src/db/migrations/20260426000001-create-sync-cursors.js`

- [ ] **Step 2.1: Create the migration file**

Create `backend/src/db/migrations/20260426000001-create-sync-cursors.js`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS sync_cursors (
        source TEXT NOT NULL,
        resource TEXT NOT NULL,
        last_synced_at TIMESTAMP WITH TIME ZONE,
        last_bulk_op_id TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (source, resource),
        CONSTRAINT sync_cursors_source_check
          CHECK (source IN ('shopify', 'myntra', 'amazon', 'flipkart', 'unicommerce')),
        CONSTRAINT sync_cursors_status_check
          CHECK (status IN ('idle', 'running', 'failed'))
      );

      CREATE INDEX IF NOT EXISTS idx_sync_cursors_status ON sync_cursors(status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sync_cursors_status;
      DROP TABLE IF EXISTS sync_cursors;
    `);
  },
};
```

- [ ] **Step 2.2: Run the migration**

Run: `cd backend && npm run db:migrate`
Expected: log line `== 20260426000001-create-sync-cursors: migrated`. No errors.

- [ ] **Step 2.3: Verify table exists**

Run: `cd backend && node -e "require('./src/db/sequelize').sequelize.query('SELECT column_name FROM information_schema.columns WHERE table_name = \\'sync_cursors\\' ORDER BY ordinal_position').then(([rows]) => { console.log(rows); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"`

Expected output (column list):
```
[ { column_name: 'source' },
  { column_name: 'resource' },
  { column_name: 'last_synced_at' },
  { column_name: 'last_bulk_op_id' },
  { column_name: 'status' },
  { column_name: 'error_message' },
  { column_name: 'created_at' },
  { column_name: 'updated_at' } ]
```

If the verification command path doesn't work because of TypeScript-vs-JS, instead use psql directly: `psql $DATABASE_URL -c "\d sync_cursors"`.

- [ ] **Step 2.4: Commit**

```bash
git add backend/src/db/migrations/20260426000001-create-sync-cursors.js
git commit -m "feat(db): add sync_cursors migration for per-resource sync state tracking"
```

---

## Task 3: SyncCursor model

**Files:**
- Create: `backend/src/db/models/SyncCursor.ts`
- Modify: `backend/src/db/models/index.ts`

- [ ] **Step 3.1: Create the model file**

Create `backend/src/db/models/SyncCursor.ts`:

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type SyncCursorStatus = 'idle' | 'running' | 'failed';

interface SyncCursorAttributes {
  source: SourceType;
  resource: string;
  last_synced_at: Date | null;
  last_bulk_op_id: string | null;
  status: SyncCursorStatus;
  error_message: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type SyncCursorCreationAttributes = Optional<
  SyncCursorAttributes,
  'last_synced_at' | 'last_bulk_op_id' | 'error_message' | 'created_at' | 'updated_at'
>;

export class SyncCursor
  extends Model<SyncCursorAttributes, SyncCursorCreationAttributes>
  implements SyncCursorAttributes
{
  declare source: SourceType;
  declare resource: string;
  declare last_synced_at: Date | null;
  declare last_bulk_op_id: string | null;
  declare status: SyncCursorStatus;
  declare error_message: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

SyncCursor.init(
  {
    source: { type: DataTypes.TEXT, primaryKey: true },
    resource: { type: DataTypes.TEXT, primaryKey: true },
    last_synced_at: { type: DataTypes.DATE, allowNull: true },
    last_bulk_op_id: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'idle' },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'SyncCursor',
    tableName: 'sync_cursors',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
```

- [ ] **Step 3.2: Add to models barrel**

Open `backend/src/db/models/index.ts` and append:

```typescript
export { SyncCursor } from './SyncCursor';
```

(Insert alphabetically among existing exports if the file is alphabetized; otherwise append.)

- [ ] **Step 3.3: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [ ] **Step 3.4: Verify model can be loaded at runtime**

Run: `cd backend && npx tsx -e "import('./src/db/models').then(m => { console.log('SyncCursor model:', typeof m.SyncCursor); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"`
Expected: `SyncCursor model: function`

- [ ] **Step 3.5: Commit**

```bash
git add backend/src/db/models/SyncCursor.ts backend/src/db/models/index.ts
git commit -m "feat(db): add SyncCursor Sequelize model"
```

---

## Task 4: Sync orchestrator types + registry

**Files:**
- Create: `backend/src/modules/sync-orchestrator/sync-orchestrator.types.ts`
- Create: `backend/src/modules/sync-orchestrator/sync-orchestrator.registry.ts`

- [ ] **Step 4.1: Create the types file**

Create `backend/src/modules/sync-orchestrator/sync-orchestrator.types.ts`:

```typescript
import type { SourceType } from '@constant';

export type SyncMode = 'backfill' | 'incremental';

export interface SyncResult {
  resource: string;
  source: SourceType;
  records_synced: number;
  duration_ms: number;
  bulk_op_id?: string;
}

export interface ResourceHandler {
  source: SourceType;
  resource: string;
  backfill: (opts: { fromDate: Date }) => Promise<SyncResult>;
  incremental: (opts: { sinceDate: Date | null }) => Promise<SyncResult>;
}
```

- [ ] **Step 4.2: Create the registry file**

Create `backend/src/modules/sync-orchestrator/sync-orchestrator.registry.ts`:

```typescript
import type { ResourceHandler } from './sync-orchestrator.types';
import type { SourceType } from '@constant';

const handlers = new Map<string, ResourceHandler>();

function key(source: SourceType, resource: string): string {
  return `${source}:${resource}`;
}

export function registerResource(handler: ResourceHandler): void {
  handlers.set(key(handler.source, handler.resource), handler);
}

export function getResource(source: SourceType, resource: string): ResourceHandler | undefined {
  return handlers.get(key(source, resource));
}

export function listResources(source?: SourceType): ResourceHandler[] {
  const all = Array.from(handlers.values());
  return source ? all.filter((h) => h.source === source) : all;
}

export function clearRegistry(): void {
  handlers.clear();
}
```

- [ ] **Step 4.3: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [ ] **Step 4.4: Commit**

```bash
git add backend/src/modules/sync-orchestrator/sync-orchestrator.types.ts backend/src/modules/sync-orchestrator/sync-orchestrator.registry.ts
git commit -m "feat(sync-orchestrator): add resource handler registry and types"
```

---

## Task 5: Sync orchestrator service

**Files:**
- Create: `backend/src/modules/sync-orchestrator/sync-orchestrator.service.ts`

- [ ] **Step 5.1: Create the service file**

Create `backend/src/modules/sync-orchestrator/sync-orchestrator.service.ts`:

```typescript
import { logger } from '@logger/logger';
import { SyncCursor } from '@db/models';
import { SOURCE, type SourceType } from '@constant';
import { getResource, listResources } from './sync-orchestrator.registry';
import type { SyncResult } from './sync-orchestrator.types';

const BACKFILL_FROM_DATE = new Date('2023-01-01T00:00:00.000Z');

async function setCursorRunning(source: SourceType, resource: string): Promise<void> {
  await SyncCursor.upsert({
    source,
    resource,
    status: 'running',
    error_message: null,
    last_synced_at: null,
    last_bulk_op_id: null,
  });
}

async function setCursorIdle(
  source: SourceType,
  resource: string,
  lastSyncedAt: Date,
  bulkOpId?: string,
): Promise<void> {
  await SyncCursor.upsert({
    source,
    resource,
    status: 'idle',
    error_message: null,
    last_synced_at: lastSyncedAt,
    last_bulk_op_id: bulkOpId ?? null,
  });
}

async function setCursorFailed(
  source: SourceType,
  resource: string,
  errorMessage: string,
): Promise<void> {
  await SyncCursor.upsert({
    source,
    resource,
    status: 'failed',
    error_message: errorMessage,
    last_synced_at: null,
    last_bulk_op_id: null,
  });
}

async function getCursor(source: SourceType, resource: string): Promise<SyncCursor | null> {
  return SyncCursor.findOne({ where: { source, resource } });
}

export async function runBackfill(
  source: SourceType,
  resource: string,
): Promise<SyncResult> {
  const handler = getResource(source, resource);
  if (!handler) {
    throw new Error(`No handler registered for ${source}:${resource}`);
  }
  logger.info(`[Backfill] Starting ${source}:${resource} from ${BACKFILL_FROM_DATE.toISOString()}`);
  await setCursorRunning(source, resource);
  try {
    const result = await handler.backfill({ fromDate: BACKFILL_FROM_DATE });
    await setCursorIdle(source, resource, new Date(), result.bulk_op_id);
    logger.info(
      `[Backfill] Completed ${source}:${resource} — ${result.records_synced} records in ${result.duration_ms}ms`,
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setCursorFailed(source, resource, message);
    logger.error(`[Backfill] Failed ${source}:${resource}: ${message}`);
    throw err;
  }
}

export async function runBackfillAll(source: SourceType): Promise<SyncResult[]> {
  const handlers = listResources(source);
  logger.info(`[Backfill] Running ${handlers.length} resources for ${source}`);
  const results: SyncResult[] = [];
  for (const handler of handlers) {
    try {
      const result = await runBackfill(source, handler.resource);
      results.push(result);
    } catch (err) {
      logger.error(
        `[Backfill] Resource ${handler.resource} failed; continuing with remaining resources.`,
      );
    }
  }
  return results;
}

export async function runIncremental(
  source: SourceType,
  resource: string,
): Promise<SyncResult> {
  const handler = getResource(source, resource);
  if (!handler) {
    throw new Error(`No handler registered for ${source}:${resource}`);
  }
  const cursor = await getCursor(source, resource);
  const sinceDate = cursor?.last_synced_at ?? null;
  await setCursorRunning(source, resource);
  try {
    const result = await handler.incremental({ sinceDate });
    await setCursorIdle(source, resource, new Date());
    logger.info(
      `[Incremental] ${source}:${resource} — ${result.records_synced} records in ${result.duration_ms}ms`,
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setCursorFailed(source, resource, message);
    logger.error(`[Incremental] Failed ${source}:${resource}: ${message}`);
    throw err;
  }
}

export async function runIncrementalAll(source: SourceType): Promise<SyncResult[]> {
  const handlers = listResources(source);
  const results: SyncResult[] = [];
  for (const handler of handlers) {
    try {
      const result = await runIncremental(source, handler.resource);
      results.push(result);
    } catch (err) {
      // Already logged in runIncremental; continue.
    }
  }
  return results;
}

export async function listCursors(source?: SourceType): Promise<SyncCursor[]> {
  return source
    ? SyncCursor.findAll({ where: { source } })
    : SyncCursor.findAll();
}

export { SOURCE, BACKFILL_FROM_DATE };
```

- [ ] **Step 5.2: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [ ] **Step 5.3: Commit**

```bash
git add backend/src/modules/sync-orchestrator/sync-orchestrator.service.ts
git commit -m "feat(sync-orchestrator): add backfill and incremental orchestration service"
```

---

## Task 6: Sync orchestrator controller

**Files:**
- Create: `backend/src/modules/sync-orchestrator/sync-orchestrator.controller.ts`

- [ ] **Step 6.1: Create the controller file**

Create `backend/src/modules/sync-orchestrator/sync-orchestrator.controller.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import { SOURCE, isValidSource } from '@constant';
import {
  runBackfill,
  runBackfillAll,
  runIncrementalAll,
  listCursors,
} from './sync-orchestrator.service';

const sourceParamSchema = z.object({
  source: z.string().refine(isValidSource, { message: 'Invalid source' }),
});

const backfillQuerySchema = z.object({
  resource: z.string().min(1).optional(),
});

export async function backfillHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = sourceParamSchema.parse(req.params);
    const query = backfillQuerySchema.parse(req.query);

    res.status(202);
    if (query.resource) {
      handleApiResponse(res, {
        data: { accepted: true, source: params.source, resource: query.resource },
        message: `Backfill started for ${params.source}:${query.resource}`,
      });
      runBackfill(params.source, query.resource).catch(() => {
        /* logged by service */
      });
      return;
    }

    handleApiResponse(res, {
      data: { accepted: true, source: params.source, mode: 'all' },
      message: `Backfill started for all ${params.source} resources`,
    });
    runBackfillAll(params.source).catch(() => {
      /* logged by service */
    });
  } catch (err) {
    next(err);
  }
}

export async function incrementalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = sourceParamSchema.parse(req.params);
    res.status(202);
    handleApiResponse(res, {
      data: { accepted: true, source: params.source },
      message: `Incremental sync started for ${params.source}`,
    });
    runIncrementalAll(params.source).catch(() => {
      /* logged by service */
    });
  } catch (err) {
    next(err);
  }
}

export async function listCursorsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const querySchema = z.object({
      source: z.string().refine(isValidSource).optional(),
    });
    const { source } = querySchema.parse(req.query);
    const cursors = await listCursors(source as ReturnType<typeof isValidSource> extends true ? typeof SOURCE.SHOPIFY : undefined);
    handleApiResponse(res, { data: cursors });
  } catch (err) {
    next(err);
  }
}
```

> Note: the controller dispatches sync work fire-and-forget (matches existing Shopify sync controller pattern — see `backend/src/modules/shopify/`). The 202 response returns immediately; the actual sync runs asynchronously and writes results to `sync_cursors`.

- [ ] **Step 6.2: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS. If `handleApiResponse` signature differs, check `backend/src/utils/handleResponse.ts` and adjust the call to match.

- [ ] **Step 6.3: Commit**

```bash
git add backend/src/modules/sync-orchestrator/sync-orchestrator.controller.ts
git commit -m "feat(sync-orchestrator): add HTTP controller with admin-protected handlers"
```

---

## Task 7: Sync orchestrator routes

**Files:**
- Create: `backend/src/modules/sync-orchestrator/sync-orchestrator.routes.ts`
- Modify: `backend/src/routes/index.ts`

- [ ] **Step 7.1: Create the routes file**

Create `backend/src/modules/sync-orchestrator/sync-orchestrator.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate, authorizeByRole } from '@middleware/auth';
import {
  backfillHandler,
  incrementalHandler,
  listCursorsHandler,
} from './sync-orchestrator.controller';

const router = Router();

// POST /api/sync/:source/backfill?resource=<name>
//   Triggers backfill for one resource (if ?resource= given) or ALL resources for the source.
router.post(
  '/:source/backfill',
  authenticate,
  authorizeByRole('ADMIN'),
  backfillHandler,
);

// POST /api/sync/:source/incremental
//   Manually triggers an incremental sync for all resources of the given source.
router.post(
  '/:source/incremental',
  authenticate,
  authorizeByRole('ADMIN'),
  incrementalHandler,
);

// GET /api/sync/cursors[?source=<name>]
//   Lists current sync cursor state per resource. Used for monitoring.
router.get('/cursors', authenticate, listCursorsHandler);

export default router;
```

> If `authorizeByRole` requires an array (`authorizeByRole(['ADMIN'])`), adjust the calls to match the existing middleware signature. Confirm by reading `backend/src/middleware/auth.ts` before this step.

- [ ] **Step 7.2: Mount the routes**

Open `backend/src/routes/index.ts`. Find where existing module routes are mounted (e.g., `router.use('/sync', shopifySyncRoutes)`). Add the new orchestrator routes mount alongside.

If the existing Shopify sync routes are already mounted at `/sync`, the new orchestrator router needs to be at a different path or merged. Mount the new orchestrator at `/sync` and ensure it does NOT conflict with the existing Shopify-specific routes (orchestrator uses `:source` parameter, so a request like `POST /sync/shopify/backfill` hits the orchestrator; existing fixed-path routes like `POST /sync/shopify` would still work).

Add this import + mount in `backend/src/routes/index.ts`:

```typescript
import syncOrchestratorRoutes from '@modules/sync-orchestrator/sync-orchestrator.routes';

router.use('/sync', syncOrchestratorRoutes);
```

If a `/sync` prefix is already used for legacy Shopify routes, prefer mounting orchestrator routes AFTER the legacy mount so legacy fixed paths win route matching.

- [ ] **Step 7.3: Verify TypeScript compiles and dev server boots**

Run: `cd backend && npm run typecheck`
Expected: PASS.

Run: `cd backend && npm run dev`
Wait ~3 seconds. Expected: server starts on port 4000 (or configured PORT) with no errors.
Press Ctrl+C to stop.

- [ ] **Step 7.4: Commit**

```bash
git add backend/src/modules/sync-orchestrator/sync-orchestrator.routes.ts backend/src/routes/index.ts
git commit -m "feat(sync-orchestrator): expose admin-protected sync routes at /api/sync/:source/*"
```

---

## Task 8: End-to-end verification

- [ ] **Step 8.1: Start dev server**

Run: `cd backend && npm run dev`
Wait for `Server running on port 4000` (or equivalent).

- [ ] **Step 8.2: Verify cursors endpoint with empty registry**

In another terminal, get an admin JWT (use existing auth flow — typically `POST /api/auth/login` with admin creds from `.env`). Save as `$TOKEN`.

Run:
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/sync/cursors
```

Expected JSON response: `{ "success": true, "data": [], ... }` (empty array — no resources registered yet, no cursors written).

- [ ] **Step 8.3: Verify backfill endpoint returns 202 with empty registry**

Run:
```bash
curl -s -i -X POST -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/sync/shopify/backfill"
```

Expected: HTTP 202 with body `{ "success": true, "data": { "accepted": true, "source": "shopify", "mode": "all" }, ... }`.

Server log should show: `[Backfill] Running 0 resources for shopify`.

- [ ] **Step 8.4: Verify auth gate**

Run without token:
```bash
curl -s -i -X POST http://localhost:4000/api/sync/shopify/backfill
```

Expected: HTTP 401 Unauthorized.

- [ ] **Step 8.5: Verify invalid source rejected**

Run:
```bash
curl -s -i -X POST -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/sync/foobar/backfill"
```

Expected: HTTP 400 with Zod validation error message about invalid source.

- [ ] **Step 8.6: Stop dev server**

Press Ctrl+C in the dev server terminal.

- [ ] **Step 8.7: Update PROGRESS.md**

Open `backend/.claude/PROGRESS.md` (or `.claude/PROGRESS.md` at repo root — check both, use whichever already has a Completed Tasks section).

Append:

```markdown
### 2026-04-26 — Shopify Phase 2 Slice 0 (Foundation)
**Built:**
- sync_cursors table + SyncCursor model
- SOURCE constant for marketplace identification
- Sync orchestrator module with resource registry, backfill + incremental services, admin-protected routes

**Files affected:**
- backend/src/constant/source.constant.ts (new)
- backend/src/db/migrations/20260426000001-create-sync-cursors.js (new)
- backend/src/db/models/SyncCursor.ts (new)
- backend/src/modules/sync-orchestrator/* (new module)
- backend/src/constant/index.ts, backend/src/db/models/index.ts, backend/src/routes/index.ts (modified)

**Decisions:**
- Cursor primary key: composite (source, resource) — no surrogate id
- Backfill is fire-and-forget (HTTP 202) matching existing Shopify sync pattern
- Source enforced via PostgreSQL CHECK constraint + TypeScript const

**Notes for next slices:**
- Each new resource registers itself via `registerResource(handler)` at module load
- Slice 1 (Finance) registration call goes in finance module's index/init file
```

- [ ] **Step 8.8: Final verification commit**

```bash
git add .claude/PROGRESS.md backend/.claude/PROGRESS.md 2>/dev/null
git commit -m "docs(progress): record Shopify Phase 2 Slice 0 completion"
```

(If only one PROGRESS.md exists, the other path will silently no-op via `2>/dev/null`.)

---

## Slice 0 Ship Gate

Before marking Slice 0 complete, confirm ALL of the following pass:

- [ ] `cd backend && npm run typecheck` → no errors
- [ ] `cd backend && npm run lint` → no errors, no warnings
- [ ] `cd backend && npm run db:migrate` (if rolled back) → re-applies cleanly
- [ ] `psql $DATABASE_URL -c "\d sync_cursors"` → table exists with all columns
- [ ] `POST /api/sync/shopify/backfill` (with admin JWT) → returns 202
- [ ] `POST /api/sync/shopify/backfill` (without JWT) → returns 401
- [ ] `POST /api/sync/foobar/backfill` (with admin JWT) → returns 400
- [ ] `GET /api/sync/cursors` (with admin JWT) → returns empty array
- [ ] All commits pushed to feature branch (after user explicitly authorizes push)

When ALL boxes ticked, Slice 0 is done. Proceed to Plan 1 (Finance).
