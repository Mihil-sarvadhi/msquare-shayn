---
name: code-review
description: Review backend code for compliance with node.md coding rules including architecture layers, raw SQL reads, AppError handling, constants usage, validation, auth middleware, logging, and TypeScript strict mode
allowed tools: Read, Grep, Glob
---

# Code Review Checklist — Node.js Backend

Review the specified files (or recently changed files via `git diff`) against these 15 rules from CLAUDE.md / node.md. Report violations as a numbered list with file path, line number, rule name, and fix suggestion.

## Rules to Check

### 1. Architecture Layers (CRITICAL)
**Rule**: Controller → Service → Repository. Never skip layers.
**Search**: Controllers importing from repository directly. Services importing Prisma directly.
**Fix**: Route calls through proper layers.

### 2. Raw SQL for Reads (CRITICAL)
**Rule**: ALL reads MUST use `prisma.$queryRaw`. Never `findMany`/`findUnique`/`findFirst`.
**Search**: `findMany`, `findUnique`, `findFirst` in repository files.
**Fix**: Replace with `prisma.$queryRaw` parameterized query.

### 3. AppError Only (HIGH)
**Rule**: Only throw `AppError` — never raw `Error`, `throw new Error()`.
**Search**: `throw new Error(` in service/controller files. `new Error(` outside of `appError.ts`.
**Fix**: Replace with `new AppError({ errorType, message, code })`.

### 4. Constants Usage (HIGH)
**Rule**: Use `ERROR_TYPES`, `RES_TYPES`, `RES_STATUS`, `END_POINTS` — never hardcode strings.
**Search**: Hardcoded status codes (`res.status(404)`), hardcoded messages in responses.
**Fix**: Use constants from `src/constant/`.

### 5. handleApiResponse (HIGH)
**Rule**: All controller responses via `handleApiResponse` — never direct `res.json()`.
**Search**: `res.json(`, `res.send(`, `res.status(` in controller files.
**Fix**: Use `handleApiResponse(res, { responseType, message, data?, pagination? })`.

### 6. import type (HIGH)
**Rule**: Type-only imports MUST use `import type` syntax.
**Search**: Imports of interfaces/types without `type` keyword (e.g., `import { Request, Response }` from express).
**Fix**: Change to `import type { Request, Response }`.

### 7. Path Aliases (HIGH)
**Rule**: Use `@db/`, `@utils/`, `@constant/`, `@middleware/`, `@modules/`, etc. Never relative `../../`.
**Search**: `from '../` or `from '../../` crossing module boundaries.
**Fix**: Replace with path alias.

### 8. Validation via Middleware (HIGH)
**Rule**: All validation via `validateRequest({ body?, query?, params? })`. Never manual validation in controllers.
**Search**: `if (!req.body.` or manual field checks in controllers. `z.object(` in controller files.
**Fix**: Move to types file + use `validateRequest` middleware in routes.

### 9. PUT not PATCH (CRITICAL)
**Rule**: Always PUT for updates. Never PATCH.
**Search**: `.patch(` or `router.patch(` in route files.
**Fix**: Change to `.put(` / `router.put(`.

### 10. No console.log (MEDIUM)
**Rule**: Use `logger` from `@logger/logger`. Never `console.log`/`console.error` in app code.
**Search**: `console.log`, `console.error`, `console.warn`, `console.info` (except in scripts/).
**Fix**: Use `logger.info()`, `logger.error()`, etc.

### 11. Route Handler Pattern (HIGH)
**Rule**: Async controllers must use `(req, res, next) => { void controller(req, res).catch(next); }`.
**Search**: Direct controller reference without `.catch(next)` wrapper.
**Fix**: Wrap in `(req, res, next) => { void controllerFn(req, res).catch(next); }`.

### 12. Auth Middleware (HIGH)
**Rule**: Protected routes must have `authenticate` + `authorizeByAnyRole`.
**Search**: Routes without `authenticate` middleware (unless public like health check).
**Fix**: Add `authenticate, authorizeByAnyRole([...roles])` before `validateRequest`.

### 13. Middleware Order (MEDIUM)
**Rule**: `authenticate` → `authorizeByAnyRole` → `validateRequest` → controller.
**Search**: Middleware in wrong order on routes.
**Fix**: Reorder to match convention.

### 14. Pagination (MEDIUM)
**Rule**: List endpoints must paginate with LIMIT + OFFSET. Response must include `pagination: { page, limit, total }`.
**Search**: List queries without `LIMIT`/`OFFSET`. List responses without pagination object.
**Fix**: Add SQL pagination + response pagination.

### 15. Required String Validation (MEDIUM)
**Rule**: Required strings use `.min(1, 'X is required')` — never bare `.string()`.
**Search**: `z.string()` without `.min(1,` on required fields in create schemas.
**Fix**: Add `.min(1, 'Field is required')`.

## Output Format

```
## Code Review Results — Backend

### Violations Found: {count}

1. **[Rule 2: Raw SQL Reads]** `src/modules/project/project.repository.ts:25`
   - Found: `prisma.project.findMany({ where: ... })`
   - Fix: Replace with `prisma.$queryRaw` parameterized query

2. **[Rule 5: handleApiResponse]** `src/modules/project/project.controller.ts:12`
   - Found: `res.json({ success: true, data: project })`
   - Fix: Use `handleApiResponse(res, { responseType: RES_STATUS.GET, message: RES_TYPES.PROJECT_FETCHED, data: project })`

### No Violations: Rules 1, 3, 4, 6-15
```

## How to Run

1. If user says "review this file" → review the specified file
2. If user says "review my changes" → run `git diff --name-only` and review changed backend files
3. If user says "review this module" → review all files in `src/modules/{module}/`
4. Always report summary: total violations, violations by rule, clean rules
