---
name: scaffold-types
description: Scaffold TypeScript type definitions for a feature including entity interface, list item, create/update payloads, list params, and list response
allowed tools: Read, Grep, Glob, Write, Edit
---

# Scaffold TypeScript Types

When a new feature needs type definitions, create them at `src/types/{feature}.ts`.

## Reference File

Read `src/types/user.ts` as the canonical example before generating.

## Rules

1. **All API types use snake_case** — fields must match backend response exactly
2. **Use `export interface`** for object types, `export type` for unions
3. **Use `import type`** when importing these types elsewhere (verbatimModuleSyntax)
4. **Use `@/` path alias** for all imports

## Template

Create `src/types/{feature}.ts` with the following structure:

```typescript
// ── Main Entity (matches API response — snake_case) ─────────────────

export interface {Entity} {
  id: string;
  name: string;
  // ... feature-specific fields (snake_case)
  status_id: number;
  status_name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ── Mutation Payloads ───────────────────────────────────────────────

export interface Create{Entity}Payload {
  name: string;
  // ... required fields for creation (snake_case)
}

export interface Update{Entity}Payload {
  name?: string;
  // ... all fields optional for PUT update (snake_case)
}

// ── Query Parameters ────────────────────────────────────────────────

export interface {Entity}ListParams {
  search?: string;
  status_id?: number;
  page?: number;
  page_size?: number;
}

// ── Response Type ───────────────────────────────────────────────────

export interface {Entity}ListResponse {
  data: {Entity}[];
  pagination: { total: number };
}
```

## Checklist

- [ ] File created at `src/types/{feature}.ts`
- [ ] All fields are snake_case (matching backend)
- [ ] Main entity has `id`, `created_at`, `updated_at` at minimum
- [ ] Nullable fields use `| null` (e.g., `deleted_at: string | null`)
- [ ] CreatePayload has only required fields
- [ ] UpdatePayload has all fields optional
- [ ] ListParams includes `search?`, `page?`, `page_size?`
- [ ] ListResponse wraps `data: Entity[]` + `pagination: { total: number }`
