---
name: create-validation-schema
description: Create a Zod validation schema in the centralized validations file with inferred TypeScript type for use with React Hook Form
allowed tools: Read, Grep, Glob, Edit
---

# Create Validation Schema

ALL Zod schemas MUST live in `src/utils/validations/index.ts`. NEVER create schemas in component files.

## Reference File

Read `src/utils/validations/index.ts` before editing — append new schemas at the end under a section comment.

## Rules

1. **Schema naming**: `{action}{Entity}Schema` in camelCase (e.g., `createClientSchema`)
2. **Type naming**: `{Action}{Entity}FormValues` in PascalCase (e.g., `CreateClientFormValues`)
3. **Required strings**: Always use `.min(1, 'Field is required')`, never just `.string()`
4. **Select fields**: Use `.string().min(1, 'Select a ...')` — form values are strings, convert to numbers on submit
5. **Optional fields**: Use `.optional()` or `.string().optional()`
6. **Type export**: Always `export type X = z.infer<typeof xSchema>`
7. **Section comment**: Add `// ── {Feature} ──` separator before the schema group

## Template (append to `src/utils/validations/index.ts`)

```typescript
// ── {Feature} ────────────────────────────────────────────────────────

export const create{Entity}Schema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  status_id: z.string().min(1, 'Select a status'),
  // ... more fields
});
export type Create{Entity}FormValues = z.infer<typeof create{Entity}Schema>;

export const update{Entity}Schema = create{Entity}Schema.partial();
export type Update{Entity}FormValues = z.infer<typeof update{Entity}Schema>;
```

## Common Patterns

```typescript
// Email
email: z.string().email('Please enter a valid email'),

// Password with requirements
password: z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter'),

// Code field
code: z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must be at most 10 characters'),

// Boolean
is_active: z.boolean(),

// Cross-field validation
.refine((data) => !data.end_date || new Date(data.start_date) <= new Date(data.end_date), {
  message: 'End date must be after start date',
  path: ['end_date'],
})
```

## Checklist

- [ ] Schema appended to `src/utils/validations/index.ts` (never a separate file)
- [ ] Section comment added (`// ── {Feature} ──`)
- [ ] Schema name is camelCase: `{action}{Entity}Schema`
- [ ] Type export is PascalCase: `{Action}{Entity}FormValues`
- [ ] Required strings use `.min(1, 'X is required')`
- [ ] Select/dropdown fields use `.string().min(1, 'Select a ...')`
