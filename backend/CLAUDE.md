# Backend — Claude Code Rules

See root `CLAUDE.md` for monorepo commands.

## Tech Stack

Node.js 18+ · Express · TypeScript 5.7 (strict) · Sequelize 6 · PostgreSQL · Winston · Helmet · Zod · JWT

## Quick Start

```bash
npm run dev              # dev server (tsx --watch) on :4000
npm run build            # tsc -p tsconfig.build.json
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint strict
npm run db:migrate       # sequelize-cli db:migrate
npm run db:seed          # sequelize-cli db:seed:all
```

## Architecture: Controller → Service → Repository

| Layer | Responsibility |
|-------|---------------|
| Controller | HTTP only — parse request, call service, respond via `handleApiResponse` |
| Service | Business logic, orchestration |
| Repository | Data access only (Sequelize) |

## Path Aliases

```
@app/*        → src/*
@config/*     → src/config/*
@constant     → src/constant/index.ts
@middleware   → src/middleware/index.ts
@logger/*     → src/logger/*
@utils/*      → src/utils/*
@routes/*     → src/routes/*
@modules/*    → src/modules/*
@db/*         → src/db/*
```

## Reads vs Writes

```typescript
// Reads: raw SQL via sequelize.query()
const rows = await sequelize.query<RowType>(
  `SELECT ... FROM table WHERE col = :val`,
  { type: QueryTypes.SELECT, replacements: { val } }
);

// Writes: Sequelize model methods
await Model.upsert({ field: value });
await Model.update({ field: value }, { where: { id } });
```

## Logging

Always use `logger` from `@logger/logger`. Never `console.log`.

## Error Handling

```typescript
// Services
throw new AppError({ errorType: ERROR_TYPES.NOT_FOUND, message: 'Not found', code: 'NOT_FOUND' });

// Controllers
try { handleApiResponse(res, { data }); }
catch (err) { handleErrorResponse(res, { statusCode: 500, message: (err as Error).message }); }
```
