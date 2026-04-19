---
name: create-api-service
description: Create an API service file with list, getById, create, update, delete methods using baseService and apiService, and register the endpoint constant
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create API Service

## Reference File

Read `src/services/auth/auth.api.ts` as the canonical example before generating.

## Step 1: Register Endpoint

Edit `src/utils/constants/api.constant.ts` and add the endpoint:

```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints
  {FEATURE_UPPER}: '/{feature-path}',  // e.g., CLIENTS: '/clients'
};
```

## Step 2: Create Service File

Create `src/services/{feature}/{feature}.api.ts`:

```typescript
import { apiService } from '@/services/configs/apiService';
import baseService from '@/services/configs/baseService';
import { API_ENDPOINTS } from '@/utils/constants/api.constant';
import type {
  {Entity},
  Create{Entity}Payload,
  Update{Entity}Payload,
  {Entity}ListParams,
  {Entity}ListResponse,
} from '@/types/{feature}';

export const {feature}Api = {
  list: (params?: {Entity}ListParams) =>
    baseService
      .get<{ data: {Entity}[]; pagination: { total: number } }>(
        API_ENDPOINTS.{FEATURE_UPPER},
        { params },
      )
      .then((res) => res.data as {Entity}ListResponse),

  getById: (id: string) =>
    apiService.get<{Entity}>(`${API_ENDPOINTS.{FEATURE_UPPER}}/${id}`),

  create: (data: Create{Entity}Payload) =>
    apiService.post<{Entity}>(API_ENDPOINTS.{FEATURE_UPPER}, data),

  update: (id: string, data: Update{Entity}Payload) =>
    apiService.put<{Entity}>(`${API_ENDPOINTS.{FEATURE_UPPER}}/${id}`, data),

  delete: (id: string) =>
    apiService.delete<void>(`${API_ENDPOINTS.{FEATURE_UPPER}}/${id}`),
};
```

## Critical Rules

1. **`baseService`** (default import) for `list()` — manual unwrap with `.then((res) => res.data as Response)`
2. **`apiService`** (named import) for `getById`, `create`, `update`, `delete` — auto-unwraps `response.data.data`
3. **Always use PUT** for updates, NEVER PATCH
4. **Use `API_ENDPOINTS` constants** — never hardcode URL paths
5. **FormData uploads** use `baseService` with explicit headers:
   ```typescript
   upload: (formData: FormData) =>
     baseService.post<{ data: {Entity} }>(
       API_ENDPOINTS.{FEATURE_UPPER},
       formData,
       { headers: { 'Content-Type': 'multipart/form-data' } },
     ).then((res) => res.data.data),
   ```

## Checklist

- [ ] Endpoint registered in `src/utils/constants/api.constant.ts`
- [ ] Service file created at `src/services/{feature}/{feature}.api.ts`
- [ ] `list()` uses `baseService` with manual unwrap
- [ ] CUD methods use `apiService` (auto-unwrap)
- [ ] `update()` uses `.put()` not `.patch()`
- [ ] All imports use `@/` path alias
- [ ] Type imports use `import type`
