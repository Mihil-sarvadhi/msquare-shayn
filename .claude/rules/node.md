# Node.js Backend Rules

> Auto-loaded when working in `backend/`. Mandatory for all development — human or AI.

## Quick Reference

```bash
cd backend
npm run dev              # Dev server (tsx --watch)
npm run build            # TypeScript compilation
npm run db:migrate       # Sequelize CLI db:migrate
npm run db:migrate:undo  # Rollback last migration
npm run db:seed          # Sequelize CLI db:seed:all
npm run lint             # ESLint strict mode
npm run typecheck        # tsc --noEmit
```

## Tech Stack

Node.js 18+ · Express · TypeScript 5.7 (strict) · Sequelize 6 · PostgreSQL · JWT · Zod · Winston · Helmet · CORS · express-rate-limit

---

## 1. Architecture: Controller → Service → Repository

| Layer | Responsibility | Can Call |
|-------|---------------|---------|
| **Controller** | HTTP only — parse request, call service, return via `handleApiResponse` | Service |
| **Service** | Business rules, orchestration, throw `AppError` | Repository |
| **Repository** | Data access only (Sequelize) | Database |

---

## 2. Data Access — Sequelize Rules

### Reads: Raw SQL via sequelize.query()
```typescript
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';

const rows = await sequelize.query<UserDTO>(
  `SELECT id, email, name FROM users WHERE role = :role LIMIT :limit OFFSET :offset`,
  { type: QueryTypes.SELECT, replacements: { role, limit, offset } }
);
```
- Use named `:param` replacements — never string interpolation
- Select only required columns (never SELECT *)
- Always paginate with LIMIT/OFFSET

### Writes: Sequelize Model Methods
```typescript
await ShopifyOrder.upsert({ order_id, revenue, payment_mode });
await ShopifyOrder.bulkCreate(orders, { updateOnDuplicate: ['revenue', 'synced_at'] });
```

---

## 3. Responses & Errors

```typescript
// Success
return handleApiResponse(res, { responseType: RES_STATUS.GET, message: RES_TYPES.SUCCESS, data });

// Error
throw new AppError({ errorType: ERROR_TYPES.NOT_FOUND, message: RES_TYPES.RESOURCE_NOT_FOUND, code: 'NOT_FOUND' });
```

---

## 4. Validation

- Zod schemas in `{feature}.types.ts`
- `validateRequest({ body, query, params })` middleware on all routes

---

## 5. Security & Auth

- `helmet` + `cors` + `express-rate-limit` registered in `app.ts`
- `authenticate` + `authorizeByRole`/`authorizeByAnyRole` for protected routes

---

## 6. Environment Flavors

`APP_ENV`: `local` | `dev` | `staging` | `production`

Shayn env vars: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `FRONTEND_URL`, `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`, `META_USER_TOKEN`, `META_AD_ACCOUNT_ID`, `META_API_VERSION`, `ITHINK_ACCESS_TOKEN`, `ITHINK_SECRET_KEY`, `ITHINK_BASE_URL`, `JUDGEME_API_TOKEN`, `JUDGEME_SHOP_DOMAIN`

---

## 7. Logging

- Use `logger` from `src/logger/logger.ts` (Winston) — NEVER `console.log`

---

## 8. Path Aliases

```
@app/*        → src/*      @config/*    → src/config/*
@constant     → src/constant/index.ts
@middleware   → src/middleware/index.ts
@logger/*     → src/logger/*    @utils/*  → src/utils/*
@routes/*     → src/routes/*    @modules/* → src/modules/*
@db/*         → src/db/*
```

---

## 9. Database (Sequelize)

- Instance: `src/db/sequelize.ts`
- Models: `src/db/models/` (one per table)
- Migrations: `src/db/migrations/` (Sequelize CLI JS files)
- Seeders: `src/db/seeders/`
- CLI config: `backend/.sequelizerc`

```bash
npx sequelize-cli db:migrate        # run pending
npx sequelize-cli db:migrate:undo   # rollback last
npx sequelize-cli db:seed:all       # run seeders
```

---

## 10. Quality Standards

- TypeScript strict mode — zero `any`, zero unused vars
- ESLint + Prettier must pass before merge
- Never hardcode strings — use `src/constant/`
