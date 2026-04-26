---
name: create-msw-handlers
description: Generate MSW request handlers for a feature API matching the project's existing MSW setup with proper response format
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create MSW Handlers

## Reference Files

Read these before generating:
- `src/test/msw/handlers/auth.handlers.ts` — Canonical handler pattern
- `src/test/msw/handlers.ts` — Barrel file where handlers are registered
- `src/test/msw/server.ts` — MSW server setup

## Step 1: Create Handler File

Create `src/test/msw/handlers/{feature}.handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

const BASE = '*/api/v1';

// ── Mock Data ────────────────────────────────────────────────────────

const mock{Entity} = {
  id: '1',
  name: 'Test {Entity}',
  status_id: 1,
  status_name: 'Active',
  created_at: '2024-01-15T00:00:00.000Z',
  updated_at: '2024-01-15T00:00:00.000Z',
  deleted_at: null,
};

const mock{Entities} = [
  mock{Entity},
  {
    ...mock{Entity},
    id: '2',
    name: 'Second {Entity}',
  },
];

// ── Handlers ─────────────────────────────────────────────────────────

export const {feature}Handlers = [
  // List
  http.get(`${BASE}/{feature-path}`, () => {
    return HttpResponse.json({
      success: true,
      data: mock{Entities},
      pagination: { total: mock{Entities}.length },
    });
  }),

  // Get by ID
  http.get(`${BASE}/{feature-path}/:id`, ({ params }) => {
    const item = mock{Entities}.find((i) => i.id === params.id);
    if (!item) {
      return HttpResponse.json(
        { success: false, message: '{Entity} not found' },
        { status: 404 },
      );
    }
    return HttpResponse.json({ success: true, data: item });
  }),

  // Create
  http.post(`${BASE}/{feature-path}`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      data: {
        ...mock{Entity},
        id: String(Date.now()),
        ...body,
      },
    });
  }),

  // Update (PUT — never PATCH)
  http.put(`${BASE}/{feature-path}/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      data: {
        ...mock{Entity},
        id: params.id as string,
        ...body,
      },
    });
  }),

  // Delete
  http.delete(`${BASE}/{feature-path}/:id`, () => {
    return HttpResponse.json({ success: true, data: null });
  }),
];
```

## Step 2: Register in Barrel

Edit `src/test/msw/handlers.ts`:

```typescript
import { authHandlers } from './handlers/auth.handlers';
import { {feature}Handlers } from './handlers/{feature}.handlers';

export const handlers = [
  ...authHandlers,
  ...{feature}Handlers,
];
```

## Response Format

Backend API responses follow this structure:

```typescript
// Success (list)
{
  success: true,
  data: [...items],
  pagination: { total: number }
}

// Success (single item)
{
  success: true,
  data: { ...item }
}

// Success (delete/void)
{
  success: true,
  data: null
}

// Error
{
  success: false,
  message: 'Error description'
}
```

## Advanced: Error Handlers

For testing error scenarios, use `server.use()` in individual tests:

```typescript
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

it('handles API error', async () => {
  server.use(
    http.get('*/api/v1/{feature-path}', () => {
      return HttpResponse.json(
        { success: false, message: 'Server error' },
        { status: 500 },
      );
    }),
  );

  // ... test error handling
});
```

## Critical Rules

1. **BASE pattern**: Always use `'*/api/v1'` prefix — matches any origin
2. **Response format**: `{ success: true, data: ... }` for success, `{ success: false, message: ... }` for errors
3. **PUT for updates**: Use `http.put()`, never `http.patch()`
4. **Register in barrel**: Always add to `src/test/msw/handlers.ts`
5. **Mock data shape**: Must match the TypeScript types in `src/types/{feature}.ts`
6. **Pagination**: List endpoints include `pagination: { total: number }`

## Checklist

- [ ] Handler file at `src/test/msw/handlers/{feature}.handlers.ts`
- [ ] Mock data matches feature type definitions
- [ ] All CRUD handlers: GET (list), GET (by ID), POST, PUT, DELETE
- [ ] Response format matches backend: `{ success, data, pagination }`
- [ ] Uses `http.put()` not `http.patch()` for updates
- [ ] Registered in `src/test/msw/handlers.ts` barrel
- [ ] 404 handling for get-by-ID
