---
name: register-route
description: Register a new module's router in the root route aggregator (src/routes/index.ts) with proper endpoint constant and import
allowed tools: Read, Grep, Glob, Edit
---

# Register Module Route

## Reference File

Read `src/routes/index.ts` to see existing route registrations before editing.

## Steps

### Step 1: Import the Router

Add import at the top of `src/routes/index.ts`:

```typescript
import { {module}Router } from '@modules/{module}/{module}.routes';
```

### Step 2: Register the Route

Add route registration alongside existing routes:

```typescript
router.use(`${END_POINTS.V1}${END_POINTS.{MODULE}}`, {module}Router);
```

### Step 3: Verify Endpoint Constant

Ensure `END_POINTS.{MODULE}` exists in `src/constant/endPoints.constant.ts`:

```typescript
{MODULE}: '/{module}s',
```

## Final URL Pattern

The module will be accessible at: `/api/v1/{module}s`

Routes:
- `GET    /api/v1/{module}s`       — List
- `GET    /api/v1/{module}s/:id`   — Get by ID
- `POST   /api/v1/{module}s`       — Create
- `PUT    /api/v1/{module}s/:id`   — Update
- `DELETE /api/v1/{module}s/:id`   — Delete

## Critical Rules

1. **Import from `@modules/`** path alias — never relative
2. **Use `END_POINTS` constant** for the path — never hardcode
3. **Router named export**: `{module}Router` — matches the module's routes file
4. **Endpoint must exist** in `endPoints.constant.ts` before registering

## Checklist

- [ ] Router imported from `@modules/{module}/{module}.routes`
- [ ] Route registered with `END_POINTS.V1` + `END_POINTS.{MODULE}`
- [ ] Endpoint constant verified in `endPoints.constant.ts`
