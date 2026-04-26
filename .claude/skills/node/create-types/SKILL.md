---
name: create-types
description: Create a types file with DTO interface, Zod validation schemas (create, update, id param, list query), and inferred TypeScript types for a backend module
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Module Types

## Reference File

Read `src/modules/user/user.types.ts` as the canonical example before generating.

## Template

Create `src/modules/{module}/{module}.types.ts`:

```typescript
import { z } from 'zod';

// ── DTO — matches Prisma model shape, used as return type from repository ──
export interface {Module}DTO {
  id: number;
  // ... fields matching Prisma column names
  createdAt: Date;
  updatedAt: Date;
}

// ── Zod Schemas — used by validateRequest middleware ──

export const create{Module}Schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  // ... more fields
});

export const update{Module}Schema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    // ... more fields (all optional)
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export const {module}IdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, { message: 'id must be a positive integer' })
    .transform((value) => Number(value)),
});

export const list{Module}sQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 10))
    .pipe(z.number().int().min(1).max(100)),
  search: z.string().optional(),
});

// ── Inferred Types ──
export type Create{Module}Dto = z.infer<typeof create{Module}Schema>;
export type Update{Module}Dto = z.infer<typeof update{Module}Schema>;
```

## Critical Rules

1. **DTO interface** matches Prisma model — includes `id`, `createdAt`, `updatedAt`
2. **Separate schemas** for `body` (create/update), `query` (list), `params` (id)
3. **Query params are strings** from Express — use `.transform()` to coerce to numbers
4. **Required strings**: `.min(1, 'X is required')` — NEVER bare `.string()`
5. **Update schema**: `.refine()` to require at least one field
6. **ID param**: regex validated + transformed to number
7. **Pagination**: page defaults 1, limit defaults 10, max 100
8. **Type exports**: `Create{Module}Dto` and `Update{Module}Dto` via `z.infer`

## Checklist

- [ ] DTO interface created with all fields
- [ ] `create{Module}Schema` with required field validation
- [ ] `update{Module}Schema` with `.refine()` for at-least-one-field
- [ ] `{module}IdParamSchema` with regex + transform
- [ ] `list{Module}sQuerySchema` with pagination + search
- [ ] Inferred types exported
- [ ] Required strings use `.min(1, 'message')`
