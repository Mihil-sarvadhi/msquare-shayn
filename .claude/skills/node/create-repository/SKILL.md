---
name: create-repository
description: Create a repository file with raw SQL reads (prisma.$queryRaw) and Prisma client writes for a backend module, following the mandatory read/write pattern
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Module Repository

## Reference File

Read `src/modules/user/user.repository.ts` as the canonical example before generating.

## Template

Create `src/modules/{module}/{module}.repository.ts`:

```typescript
import { prisma } from '@db/prisma';
import type { {Module}DTO } from './{module}.types';

// ── Repository Input Types ──
export interface Create{Module}RepositoryInput {
  name: string;
  description?: string;
  // ... fields from create schema
}

export interface Update{Module}RepositoryInput {
  name?: string;
  description?: string;
  // ... fields from update schema (all optional)
}

export interface List{Module}sParams {
  page: number;
  limit: number;
  search?: string;
}

export interface List{Module}sResult {
  {module}s: {Module}DTO[];
  total: number;
}

// ── READS: Raw SQL ONLY — MANDATORY ──

export const findAll{Module}s = async (
  params: List{Module}sParams,
): Promise<List{Module}sResult> => {
  const offset = (params.page - 1) * params.limit;

  const {module}s = await prisma.$queryRaw<{Module}DTO[]>`
    SELECT "id", "name", "description", "createdAt", "updatedAt"
    FROM "{Module}"
    WHERE (${params.search ?? null}::text IS NULL
      OR "name" ILIKE ${'%' + (params.search ?? '') + '%'})
    ORDER BY "createdAt" DESC
    LIMIT ${params.limit} OFFSET ${offset}
  `;

  const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "{Module}"
    WHERE (${params.search ?? null}::text IS NULL
      OR "name" ILIKE ${'%' + (params.search ?? '') + '%'})
  `;

  return {
    {module}s,
    total: Number(count),
  };
};

export const find{Module}ById = async (id: number): Promise<{Module}DTO | null> => {
  const rows = await prisma.$queryRaw<{Module}DTO[]>`
    SELECT "id", "name", "description", "createdAt", "updatedAt"
    FROM "{Module}"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
};

// ── WRITES: Prisma client allowed ──

export const create{Module} = async (
  input: Create{Module}RepositoryInput,
): Promise<{Module}DTO> => {
  const created = await prisma.{module}.create({
    data: {
      name: input.name,
      description: input.description,
    },
  });

  // Return via raw SQL read for consistent DTO shape
  const [row] = await prisma.$queryRaw<{Module}DTO[]>`
    SELECT "id", "name", "description", "createdAt", "updatedAt"
    FROM "{Module}"
    WHERE "id" = ${created.id}
    LIMIT 1
  `;

  return row;
};

export const update{Module} = async (
  id: number,
  input: Update{Module}RepositoryInput,
): Promise<{Module}DTO | null> => {
  await prisma.{module}.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
    },
  });

  const rows = await prisma.$queryRaw<{Module}DTO[]>`
    SELECT "id", "name", "description", "createdAt", "updatedAt"
    FROM "{Module}"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
};

export const delete{Module} = async (id: number): Promise<void> => {
  await prisma.{module}.delete({
    where: { id },
  });
};
```

## Critical Rules

1. **ALL reads use `prisma.$queryRaw`** — NEVER `findMany` / `findUnique` / `findFirst`
2. **Parameterized template strings** for SQL injection protection
3. **Select only required columns** — never `SELECT *` in list queries
4. **Always paginate** with `LIMIT` + `OFFSET`
5. **Writes use Prisma client** but return via raw SQL read for consistent DTO shape
6. **`rows[0] ?? null`** for single-item queries — null-safe
7. **`Number(count)`** to convert BigInt from PostgreSQL COUNT
8. **Repository input types** defined in this file — separate from Zod DTOs
9. **Import type** for `{Module}DTO` — `import type`

## Checklist

- [ ] Repository input interfaces defined
- [ ] `findAll{Module}s` uses raw SQL with pagination
- [ ] `find{Module}ById` uses raw SQL with `LIMIT 1`
- [ ] `create{Module}` uses Prisma client + raw SQL return
- [ ] `update{Module}` uses Prisma client + raw SQL return
- [ ] `delete{Module}` uses Prisma client
- [ ] No `findMany`/`findUnique`/`findFirst` anywhere
- [ ] All SQL uses parameterized template strings
- [ ] `import type` for DTO
