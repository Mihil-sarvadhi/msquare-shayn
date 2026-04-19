# Project Coding Rules — Node.js Backend

> These rules are mandatory for all development — human or AI. Every file you create or modify must follow these patterns exactly.

## Quick Reference

```bash
cd backend
npm run dev              # Dev server with tsx watch
npm run build            # TypeScript compilation
npm run build:interactive # Interactive build (branch + env + message)
npm run lint             # ESLint strict mode
npm run prisma:migrate   # Prisma migrate dev
npm run prisma:seed      # Seed database
```

## Tech Stack

- Node.js 18+ · Express · TypeScript 5.7 (strict)
- Prisma 6 · PostgreSQL
- JWT (jsonwebtoken) · bcryptjs
- Zod (validation)
- Winston (logging)
- Helmet · CORS · express-rate-limit

---

## 1. Directory Structure

```
src/
├── app.ts                    # Express app factory (middleware + router mount)
├── index.ts                  # Server startup entry point
├── config/
│   └── config.ts             # Zod-validated environment config
├── constant/
│   ├── index.ts              # Barrel export
│   ├── errorTypes.constant.ts # ERROR_TYPES enum
│   ├── message.constant.ts   # RES_STATUS, RES_TYPES enums
│   └── endPoints.constant.ts # API endpoint path constants
├── db/
│   └── prisma.ts             # Prisma client singleton
├── logger/
│   └── logger.ts             # Winston logger instance
├── middleware/
│   ├── index.ts              # Barrel export
│   ├── errorHandler.ts       # Global error handler
│   ├── responseHandler.ts    # Request/response logging
│   ├── security.ts           # Helmet, CORS, rate-limiting
│   ├── validation.ts         # Zod-based validateRequest middleware
│   └── auth.ts               # JWT authenticate + role guards
├── modules/{feature}/        # Feature modules
│   ├── {feature}.types.ts    # DTOs + Zod schemas
│   ├── {feature}.controller.ts # HTTP handlers
│   ├── {feature}.service.ts  # Business logic
│   ├── {feature}.repository.ts # Data access (raw SQL reads)
│   └── {feature}.routes.ts   # Route definitions + validation
├── routes/
│   ├── index.ts              # Root router aggregation
│   └── health/
│       └── health.routes.ts  # Health check endpoint
├── types/
│   └── express.d.ts          # Express Request.user augmentation
└── utils/
    ├── appError.ts           # Custom AppError class
    ├── handleResponse.ts     # handleApiResponse + handleErrorResponse
    └── jwt.ts                # JWT sign/verify utilities
```

---

## 2. Architecture: Controller → Service → Repository

Every module follows strict layering. **Never skip layers.**

| Layer | Responsibility | Can Call |
|-------|---------------|---------|
| **Controller** | HTTP only — parse request, call service, return via `handleApiResponse` | Service |
| **Service** | Business rules, orchestration, throw `AppError` for expected failures | Repository |
| **Repository** | Data access only (Prisma raw SQL reads, Prisma client writes) | Database |

---

## 3. TypeScript Rules

### Strict Mode
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` are enforced.
- Zero `any` type usage. Zero unused variables or imports.

### Imports
- **`import type`** for type-only imports. This is mandatory.
- **Path aliases**: Always use aliases for cross-module imports.

```typescript
// CORRECT
import type { Request, Response } from 'express';
import type { UserDTO } from './user.types';
import { ERROR_TYPES } from '@constant/errorTypes.constant';
import { prisma } from '@db/prisma';
import { AppError } from '@utils/appError';

// WRONG
import { Request, Response } from 'express';  // Missing 'type'
import { ERROR_TYPES } from '../../constant/errorTypes.constant';  // Relative path
```

### Path Aliases

```
@app/*       → src/*
@config/*    → src/config/*
@constant    → src/constant/index.ts
@constant/*  → src/constant/*
@middleware   → src/middleware/index.ts
@middleware/* → src/middleware/*
@logger/*    → src/logger/*
@utils/*     → src/utils/*
@routes/*    → src/routes/*
@modules/*   → src/modules/*
@db/*        → src/db/*
```

---

## 4. Data Access — Prisma Performance Rules

### Reads: Raw SQL ONLY

```typescript
// CORRECT — raw SQL for all reads
const users = await prisma.$queryRaw<UserDTO[]>`
  SELECT "id", "email", "name", "role", "createdAt", "updatedAt"
  FROM "User"
  WHERE "role" = ${role}
  ORDER BY "createdAt" DESC
  LIMIT ${limit} OFFSET ${offset}
`;

// WRONG — never use for reads
const users = await prisma.user.findMany({ where: { role } });
```

**Rules:**
- Always `prisma.$queryRaw` with parameterized template strings
- No `findMany` / `findUnique` / `findFirst` for data retrieval
- Single well-structured SQL over multiple round-trips (no N+1)
- Always paginate list endpoints with `LIMIT` + `OFFSET`
- Select only required columns — never `SELECT *` in list queries
- `rows[0] ?? null` for single-item queries — null-safe
- `Number(count)` to convert BigInt from PostgreSQL `COUNT`

### Writes: Prisma Client Allowed

```typescript
// Writes can use Prisma client
const user = await prisma.user.create({
  data: { email, name, passwordHash: hashedPassword, role },
});

// Return via raw SQL read for consistent DTO shape
const [row] = await prisma.$queryRaw<UserDTO[]>`
  SELECT "id", "email", "name", "role", "createdAt", "updatedAt"
  FROM "User" WHERE "id" = ${user.id} LIMIT 1
`;
return row;
```

---

## 5. Responses & Errors

### Standardized Response — `handleApiResponse`

Always use `handleApiResponse` from `@utils/handleResponse`:

```typescript
import { handleApiResponse } from '@utils/handleResponse';
import { RES_STATUS, RES_TYPES } from '@constant/message.constant';

// Controller
return handleApiResponse(res, {
  responseType: RES_STATUS.CREATE,     // CREATE | GET | UPDATE | DELETE
  message: RES_TYPES.USER_CREATED,     // From constants — never hardcoded
  data: user,                          // Optional payload
  pagination: { page, limit, total },  // Optional for list endpoints
});
```

Response shape: `{ success: true, statusCode, message, data?, pagination? }`

### Error Handling — `AppError`

```typescript
import { AppError } from '@utils/appError';
import { ERROR_TYPES } from '@constant/errorTypes.constant';
import { RES_TYPES } from '@constant/message.constant';

throw new AppError({
  errorType: ERROR_TYPES.NOT_FOUND,
  message: RES_TYPES.RESOURCE_NOT_FOUND,
  code: 'USER_NOT_FOUND',
});
```

**Rules:**
- Only throw `AppError` from services/controllers — never raw `Error`
- `AppError` uses `{ errorType, message, code, sourcePath?, details? }`
- `errorType` uses `ERROR_TYPES` constants — never hardcoded
- `message` uses `RES_TYPES` constants — never hardcoded
- `code` is unique machine-readable: `{MODULE}_NOT_FOUND`, `{MODULE}_ALREADY_EXISTS`
- Never send raw error stacks to clients — `ErrorHandler` middleware handles this

### Error Types Available

```typescript
ERROR_TYPES = {
  NOT_FOUND, FORBIDDEN, INVALID_REQUEST, CONFLICT,
  UNAUTHORIZED, UNKNOWN_ERROR, VALIDATION_ERROR, INTERNAL_ERROR
}
```

### Response Status Types

```typescript
RES_STATUS = { CREATE, GET, UPDATE, DELETE }

RES_TYPES = {
  SUCCESS, FAILURE,
  USER_CREATED, USER_UPDATED, USER_DELETED, USER_FETCHED, USERS_FETCHED,
  INVALID_CREDENTIALS, UNAUTHORIZED, FORBIDDEN,
  VALIDATION_FAILED, RESOURCE_NOT_FOUND, CONFLICT,
  INTERNAL_SERVER_ERROR,
  // Add new module-specific types here
}
```

---

## 6. Validation — Zod + `validateRequest`

```typescript
// {feature}.types.ts — schemas defined per module
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const listUsersQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? Number(v) : 1))
    .pipe(z.number().int().min(1)),
  limit: z.string().optional().transform((v) => (v ? Number(v) : 10))
    .pipe(z.number().int().min(1).max(100)),
  search: z.string().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform((v) => Number(v)),
});

// {feature}.routes.ts — used in routes
validateRequest({ body: createUserSchema })
validateRequest({ query: listUsersQuerySchema })
validateRequest({ params: userIdParamSchema })
validateRequest({ params: userIdParamSchema, body: updateUserSchema })
```

**Rules:**
- `validateRequest` accepts `{ body?, query?, params? }` — each a separate Zod schema
- Query params come as strings from Express — use `.transform()` to coerce to numbers
- Required strings: `.min(1, 'X is required')` — NEVER bare `.string()`
- Update schemas: use `.refine()` to require at least one field
- ID param: validated with regex + transformed to number
- Pagination: page defaults to 1, limit defaults to 10, max 100
- NEVER manually validate in controllers — centralize via schemas

---

## 7. Security & Auth

### Middleware Stack (registered in `app.ts`)
- `helmet` — security headers
- `cors` — explicit origin configuration
- `express-rate-limit` — values from environment config

### JWT Authentication
- All protected routes use `authenticate` from `@middleware/auth`
- Role guards: `authorizeByRole(role)`, `authorizeByAnyRole(roles)`
- JWT payload: `{ sub: userId, email, role }`

```typescript
// Route middleware order: authenticate → authorize → validate → controller
router.get(
  '/',
  authenticate,
  authorizeByAnyRole(['ADMIN', 'SUPER_ADMIN']),
  validateRequest({ query: listUsersQuerySchema }),
  (req, res, next) => {
    void listUsersController(req, res).catch(next);
  },
);
```

### Route Handler Pattern

```typescript
// ALWAYS use this pattern for async controllers:
(req, res, next) => {
  void controllerFunction(req, res).catch(next);
}
```

### Roles
Backend enum: `USER`, `ADMIN`, `SUPER_ADMIN` (defined in Prisma schema)

---

## 8. Environment & Builds

### Environment Flavors
`APP_ENV` values: `local` | `dev` | `staging` | `production`

- Config loader reads base `.env` then overlays `.env.<APP_ENV>`
- Zod-validated config in `src/config/config.ts`
- Access via `environment` exported from `@config/config`

### Build Scripts
- `build:interactive` — primary entry point (branch + env + message → `dist/build-info.json`)
- `build:local`, `build:dev`, `build:staging`, `build:prod` — flavor-specific
- Never remove or bypass `scripts/build-interactive.ts`

---

## 9. Logging

- Use `logger` from `@logger/logger` (Winston)
- **NEVER use `console.log` / `console.error` in application code**
- Only allowed in scripts and startup (exceptional cases)
- Request logging centralized in `responseHandler` middleware

```typescript
import { logger } from '@logger/logger';
logger.info('User created', { userId: user.id });
logger.error('Failed to create user', { error: err.message });
```

---

## 10. Database (Prisma)

- Schema: `prisma/schema.prisma` (PostgreSQL provider)
- Migrations: `prisma/migrations/`
- Seed: `prisma/seed.ts`
- Client singleton: `src/db/prisma.ts` — import as `import { prisma } from '@db/prisma'`
- User model with `UserRole` enum: `USER`, `ADMIN`, `SUPER_ADMIN`

### After Adding Models
```bash
cd backend
npx prisma migrate dev --name add-{module}-model
npx prisma generate
```

---

## 11. Constants Convention

### Adding New Module Constants

**`src/constant/message.constant.ts`** — add to `RES_TYPES`:
```typescript
{MODULE}_CREATED: '{Module} created successfully.',
{MODULE}_UPDATED: '{Module} updated successfully.',
{MODULE}_DELETED: '{Module} deleted successfully.',
{MODULE}_FETCHED: '{Module} fetched successfully.',
{MODULE}S_FETCHED: '{Module}s fetched successfully.',
```

**`src/constant/endPoints.constant.ts`** — add to `END_POINTS`:
```typescript
{MODULE}: '/{module}s',
```

---

## 12. Route Registration

All module routes register in `src/routes/index.ts`:

```typescript
import { {module}Router } from '@modules/{module}/{module}.routes';

router.use(`${END_POINTS.V1}${END_POINTS.{MODULE}}`, {module}Router);
```

Route prefix pattern: `/api/v1/{module}s`

---

## 13. Quality Standards

| Rule | Detail |
|------|--------|
| TypeScript | Strict mode — zero `any`, zero unused variables |
| ESLint + Prettier | Must pass before merge |
| Husky | Pre-commit hooks enforced — never skip with `--no-verify` |
| Modules | Small, focused, well-named |
| DTOs | Explicit typed DTOs and return types |
| Constants | Add to `src/constant/` — never hardcode strings |
| Response messages | Use `src/constant/message.constant.ts` |
| Error types | Use `src/constant/errorTypes.constant.ts` |
| Logging | Winston logger — never `console.log` |
| Auth | JWT + role guards on all protected routes |
| Validation | Zod + `validateRequest` — never manual validation |
| Reads | Raw SQL only — never Prisma query methods |
| Writes | Prisma client allowed — return via raw SQL read |
| Updates | Always PUT — never PATCH |
| Incremental changes | Small PRs over large rewrites |

---

## 14. Request/Response Flow

```
1. HTTP Request arrives
   ↓
2. Express middleware chain:
   - JSON parser + URL-encoded parser
   - CORS, Helmet, Rate-limit (security.ts)
   - responseHandler (request logging)
   ↓
3. Router: /api/v1/{module}s
   ↓
4. Route middleware stack (in order):
   - authenticate (JWT verify → sets req.user)
   - authorizeByAnyRole(['ADMIN', 'SUPER_ADMIN'])
   - validateRequest({ body/query/params schemas })
   ↓
5. Controller → calls Service → calls Repository
   ↓
6. Repository executes raw SQL read / Prisma write
   ↓
7. Controller wraps result in handleApiResponse()
   ↓
8. Response: { success, statusCode, message, data, pagination }
   ↓
9. responseHandler logs: "201 - POST /api/v1/users - 15ms"
```

---

## 15. Express Type Augmentation

```typescript
// src/types/express.d.ts
declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: number;
      email: string;
      role: UserRole;
    }
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
```

Access authenticated user in controllers: `req.user?.id`, `req.user?.role`
