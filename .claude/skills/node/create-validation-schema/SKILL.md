---
name: create-validation-schema
description: Create Zod validation schemas for a backend module in the types file — create, update, id param, and list query schemas with proper transforms and refinements
allowed tools: Read, Grep, Glob, Edit
---

# Create Validation Schemas

Zod schemas for backend modules are defined in `src/modules/{module}/{module}.types.ts` alongside the DTO.

## Reference File

Read `src/modules/user/user.types.ts` as the canonical example before generating.

## Template (add to `{module}.types.ts`)

```typescript
import { z } from 'zod';

// ── Create Schema ──
export const create{Module}Schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  email: z.string().email('Please enter a valid email'),
  // ... more fields based on requirements
});

// ── Update Schema ──
export const update{Module}Schema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    // ... all fields optional
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  });

// ── ID Param Schema ──
export const {module}IdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, { message: 'id must be a positive integer' })
    .transform((value) => Number(value)),
});

// ── List Query Schema ──
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

## Common Validation Patterns

```typescript
// Required string
name: z.string().min(1, 'Name is required').max(255),

// Email
email: z.string().email('Please enter a valid email'),

// Password
password: z.string().min(8, 'Password must be at least 8 characters').max(255),

// Code field
code: z.string().min(2, 'Code must be at least 2 characters').max(10),

// Enum (from Prisma)
role: z.nativeEnum(UserRole).optional(),

// Boolean
isActive: z.boolean(),

// Integer
quantity: z.number().int().min(0),

// Optional number from query string
status_id: z.string().optional().transform((v) => (v ? Number(v) : undefined)),

// Date string
startDate: z.string().datetime({ message: 'Invalid date format' }),

// Cross-field validation
.refine((data) => !data.endDate || new Date(data.startDate) <= new Date(data.endDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
})
```

## Critical Rules

1. **Schemas live in `{module}.types.ts`** — alongside DTO interface
2. **Required strings**: `.min(1, 'X is required')` — NEVER bare `.string()`
3. **Query params are strings**: Use `.transform()` to coerce to numbers
4. **Update schema**: All fields optional + `.refine()` for at-least-one
5. **ID param**: Regex validated + transformed to number
6. **Always export inferred types**: `Create{Module}Dto`, `Update{Module}Dto`
7. **Pagination defaults**: page = 1, limit = 10, max limit = 100

## Checklist

- [ ] `create{Module}Schema` with all required validations
- [ ] `update{Module}Schema` with `.refine()` at-least-one check
- [ ] `{module}IdParamSchema` with regex + transform
- [ ] `list{Module}sQuerySchema` with pagination + search
- [ ] Required strings use `.min(1, 'message')`
- [ ] Query params use `.transform()` for number coercion
- [ ] Inferred types exported
