# Backend Rules

Quick reference for all backend development rules. See `.claude/rules/node.md` for full detail.

## Must Follow

1. **Layering** — Controller → Service → Repository. No Sequelize in controllers (ESLint enforced).
2. **Responses** — Always `handleApiResponse` / `handleErrorResponse`. Never `res.json()` directly (ESLint enforced).
3. **Errors** — Throw `AppError` in services. Never raw `new Error()` in controllers (ESLint enforced).
4. **Logging** — `logger` from `@logger/logger`. Never `console.log` (ESLint enforced).
5. **Config** — All env vars from `environment` object. Never `process.env.*` in business code.
6. **Routes** — No `.patch()` routes. Only GET, POST, PUT, DELETE (ESLint enforced).
7. **Imports** — Always use path aliases. No `../../` relative imports (ESLint enforced).

## ESLint Rules (Custom)

| Rule | What it blocks |
|------|----------------|
| `enforce-path-aliases` | `../../` imports |
| `no-direct-response` | `res.json()`, `res.send()` in controllers |
| `no-patch-route` | `.patch()` router calls |
| `no-raw-error-throw` | `throw new Error()` — forces `AppError` |
| `no-sequelize-in-controllers` | Sequelize imports in `*.controller.ts` |

## Data Access

```typescript
// Reads — named params
const rows = await sequelize.query<T>(
  'SELECT * FROM table WHERE col = :val',
  { type: QueryTypes.SELECT, replacements: { val } }
);

// Writes — model methods
await Model.upsert({ ... });
await Model.update({ ... }, { where: { id } });
await Model.bulkCreate(items, { updateOnDuplicate: ['field'] });
```

## Commit Format

```
feat(module): description
fix(module): description
refactor(module): description
```
