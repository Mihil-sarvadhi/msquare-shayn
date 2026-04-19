---
name: create-routes
description: Create a routes file with Express Router, authentication, role guards, Zod validation middleware, and async controller wrappers for a backend module
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Module Routes

## Reference File

Read `src/modules/user/user.routes.ts` as the canonical example before generating.

## Template

Create `src/modules/{module}/{module}.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate, authorizeByAnyRole } from '@middleware';
import { validateRequest } from '@middleware/validation';
import {
  create{Module}Schema,
  update{Module}Schema,
  {module}IdParamSchema,
  list{Module}sQuerySchema,
} from './{module}.types';
import {
  create{Module}Controller,
  delete{Module}Controller,
  get{Module}ByIdController,
  list{Module}sController,
  update{Module}Controller,
} from './{module}.controller';

export const {module}Router = Router();

// List {module}s — GET /
{module}Router.get(
  '/',
  authenticate,
  authorizeByAnyRole(['ADMIN', 'SUPER_ADMIN']),
  validateRequest({ query: list{Module}sQuerySchema }),
  (req, res, next) => {
    void list{Module}sController(req, res).catch(next);
  },
);

// Get {module} by ID — GET /:id
{module}Router.get(
  '/:id',
  authenticate,
  authorizeByAnyRole(['ADMIN', 'SUPER_ADMIN']),
  validateRequest({ params: {module}IdParamSchema }),
  (req, res, next) => {
    void get{Module}ByIdController(req, res).catch(next);
  },
);

// Create {module} — POST /
{module}Router.post(
  '/',
  authenticate,
  authorizeByAnyRole(['ADMIN', 'SUPER_ADMIN']),
  validateRequest({ body: create{Module}Schema }),
  (req, res, next) => {
    void create{Module}Controller(req, res).catch(next);
  },
);

// Update {module} — PUT /:id (NEVER PATCH)
{module}Router.put(
  '/:id',
  authenticate,
  authorizeByAnyRole(['ADMIN', 'SUPER_ADMIN']),
  validateRequest({ params: {module}IdParamSchema, body: update{Module}Schema }),
  (req, res, next) => {
    void update{Module}Controller(req, res).catch(next);
  },
);

// Delete {module} — DELETE /:id
{module}Router.delete(
  '/:id',
  authenticate,
  authorizeByAnyRole(['ADMIN', 'SUPER_ADMIN']),
  validateRequest({ params: {module}IdParamSchema }),
  (req, res, next) => {
    void delete{Module}Controller(req, res).catch(next);
  },
);
```

## Critical Rules

1. **Middleware order**: `authenticate` → `authorizeByAnyRole` → `validateRequest` → controller
2. **`validateRequest({ body?, query?, params? })`** — separate schemas per source
3. **Route handler pattern**: `(req, res, next) => { void controller(req, res).catch(next); }`
4. **Always PUT** for updates — NEVER PATCH
5. **Named export**: `export const {module}Router = Router()` — not default export
6. **Roles** come from user requirements — adjust `authorizeByAnyRole` array per route
7. **Import from `@middleware`** (barrel) for `authenticate`, `authorizeByAnyRole`
8. **Import from `@middleware/validation`** for `validateRequest`

## Checklist

- [ ] Router created with named export
- [ ] GET `/` — list with query validation
- [ ] GET `/:id` — get by ID with param validation
- [ ] POST `/` — create with body validation
- [ ] PUT `/:id` — update with param + body validation (not PATCH)
- [ ] DELETE `/:id` — delete with param validation
- [ ] All routes have `authenticate` + `authorizeByAnyRole`
- [ ] All routes use `void controller(req, res).catch(next)` wrapper
- [ ] Correct middleware order on each route
