---
name: scaffold-crud-module
description: Scaffold a complete CRUD module with types, repository (raw SQL reads), service, controller, routes, Prisma model, constants, and route registration — all files in correct dependency order
allowed tools: Read, Grep, Glob, Write, Edit, Bash
---

# Scaffold Complete CRUD Module

This is the master orchestration skill. It creates all files needed for a new backend module in the correct dependency order.

## Inputs Required

Before starting, confirm with the user:
1. **Module name** (singular, lowercase): e.g., `project`, `task`, `invoice`
2. **Fields**: What data does this module manage? (name, description, status, etc.)
3. **Field types**: string, number, boolean, Date, enum, relation?
4. **Auth requirements**: public, authenticated, or role-restricted? Which roles?
5. **Relationships**: belongs to User? Has many items? Foreign keys?
6. **Search/filter fields**: which fields should be searchable in list endpoint?
7. **Unique constraints**: any unique fields?

## Files Created (in order)

Execute these steps in the exact dependency order:

### Step 1: Prisma Model
Append to `prisma/schema.prisma`
→ Follow pattern from `create-prisma-model` skill
→ Reference: existing models in `prisma/schema.prisma`

```prisma
model {Module} {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  // ... fields from user input
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Step 2: Constants
Edit `src/constant/message.constant.ts` + `src/constant/endPoints.constant.ts`
→ Follow pattern from `create-constants` skill

Add to `RES_TYPES`:
```typescript
{MODULE}_CREATED: '{Module} created successfully.',
{MODULE}_UPDATED: '{Module} updated successfully.',
{MODULE}_DELETED: '{Module} deleted successfully.',
{MODULE}_FETCHED: '{Module} fetched successfully.',
{MODULE}S_FETCHED: '{Module}s fetched successfully.',
```

Add to `END_POINTS`:
```typescript
{MODULE}: '/{module}s',
```

### Step 3: Types
Create `src/modules/{module}/{module}.types.ts`
→ Follow pattern from `create-types` skill
→ Reference: `src/modules/user/user.types.ts`

### Step 4: Repository
Create `src/modules/{module}/{module}.repository.ts`
→ Follow pattern from `create-repository` skill
→ Reference: `src/modules/user/user.repository.ts`

### Step 5: Service
Create `src/modules/{module}/{module}.service.ts`
→ Follow pattern from `create-service` skill
→ Reference: `src/modules/user/user.service.ts`

### Step 6: Controller
Create `src/modules/{module}/{module}.controller.ts`
→ Follow pattern from `create-controller` skill
→ Reference: `src/modules/user/user.controller.ts`

### Step 7: Routes
Create `src/modules/{module}/{module}.routes.ts`
→ Follow pattern from `create-routes` skill
→ Reference: `src/modules/user/user.routes.ts`

### Step 8: Route Registration
Edit `src/routes/index.ts`
→ Follow pattern from `register-route` skill
→ Import router + register with `END_POINTS`

```typescript
import { {module}Router } from '@modules/{module}/{module}.routes';
router.use(`${END_POINTS.V1}${END_POINTS.{MODULE}}`, {module}Router);
```

## Post-Creation Commands

```bash
cd backend
npx prisma migrate dev --name add-{module}-model
npx prisma generate
npm run build
npm run lint
```

## Post-Creation Checklist

- [ ] **Prisma model** added with `id`, `createdAt`, `updatedAt`
- [ ] **Constants**: 5 `RES_TYPES` messages + 1 `END_POINTS` entry
- [ ] **Types**: DTO interface + 4 Zod schemas + inferred types
- [ ] **Repository**: Raw SQL reads + Prisma client writes
- [ ] **Service**: Business logic + `AppError` handling
- [ ] **Controller**: `handleApiResponse` with `RES_STATUS` + `RES_TYPES`
- [ ] **Routes**: `authenticate` + `authorizeByAnyRole` + `validateRequest` + `.catch(next)`
- [ ] **Route registered** in `src/routes/index.ts`
- [ ] **Architecture**: Controller → Service → Repository — no layer skipped
- [ ] **No `findMany`/`findUnique`/`findFirst`** in reads
- [ ] **Only `AppError`** thrown — no raw `Error`
- [ ] **All constants from `src/constant/`** — never hardcoded
- [ ] **PUT for updates** — never PATCH
- [ ] **`import type`** for type-only imports
- [ ] **Path aliases**: `@db/`, `@utils/`, `@constant/`, `@middleware/`, `@modules/`
- [ ] **No `console.log`** — use `logger` from `@logger/logger`
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

## After Scaffolding

Tell the user:
1. List of all files created/modified
2. Run: `cd backend && npx prisma migrate dev --name add-{module}-model`
3. Run: `npm run be:build` to verify TypeScript
4. Test: `curl http://localhost:3000/api/v1/{module}s` (after auth)
5. Scaffold frontend: `/react {module}`
6. Endpoints: `GET/POST /api/v1/{module}s`, `GET/PUT/DELETE /api/v1/{module}s/:id`
