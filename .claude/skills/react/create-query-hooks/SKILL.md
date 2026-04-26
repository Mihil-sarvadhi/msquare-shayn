---
name: create-query-hooks
description: Create React Query mutation hooks with useRefetch helper that reads Redux filters, plus toast notifications for success and error
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create React Query Hooks

## Reference File

Read `src/services/auth/auth.query.ts` as the canonical example before generating.

## Step 1: Register Query Keys

Edit `src/services/react-query/queryKeys.ts` and add:

```typescript
export const queryKeys = {
  // ... existing keys

  // {Feature}
  {feature}: {
    all: ['{feature}'] as const,
    list: (filters?: Record<string, unknown>) => ['{feature}', 'list', filters] as const,
    detail: (id: string) => ['{feature}', 'detail', id] as const,
  },
};
```

## Step 2: Create Query File

Create `src/services/{feature}/{feature}.query.ts`:

```typescript
import { useMutation } from '@tanstack/react-query';
import { {feature}Api } from './{feature}.api';
import type { Create{Entity}Payload, Update{Entity}Payload } from '@/types/{feature}';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetch{Entities} } from '@/store/slices/{feature}Slice';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/utils/common-functions';

/**
 * Helper: re-dispatches fetch{Entities} with current Redux filter params.
 * Used by mutation hooks to refresh the list after CUD operations.
 */
function useRefetch{Entities}() {
  const dispatch = useAppDispatch();
  const { debouncedSearch, statusFilter, page } = useAppSelector(
    (state) => state.{feature}.filters,
  );

  return () => {
    dispatch(
      fetch{Entities}({
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status_id: Number(statusFilter) }),
        page,
        page_size: 20,
      }),
    );
  };
}

export function useCreate{Entity}() {
  const refetch = useRefetch{Entities}();
  return useMutation({
    mutationFn: (data: Create{Entity}Payload) => {feature}Api.create(data),
    onSuccess: () => {
      toast.success('{Entity} created successfully');
      refetch();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to create {entity}'));
    },
  });
}

export function useUpdate{Entity}() {
  const refetch = useRefetch{Entities}();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update{Entity}Payload }) =>
      {feature}Api.update(id, data),
    onSuccess: () => {
      toast.success('{Entity} updated successfully');
      refetch();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to update {entity}'));
    },
  });
}

export function useDelete{Entity}() {
  const refetch = useRefetch{Entities}();
  return useMutation({
    mutationFn: (id: string) => {feature}Api.delete(id),
    onSuccess: () => {
      toast.success('{Entity} deleted');
      refetch();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to delete {entity}'));
    },
  });
}
```

## Critical Rules

1. **`useRefetch` pattern**: Always read current Redux filters and rebuild params
2. **Toast on EVERY mutation**: `toast.success()` on success, `toast.error(getApiErrorMessage())` on error
3. **`getApiErrorMessage`** imported from `@/utils/common-functions` — shows backend error message with fallback
4. **Refetch on success**: Call `refetch()` to re-dispatch the Redux fetch thunk with current filters
5. **Named exports only**: `export function useCreate{Entity}()` — never default export
6. **Import toast** from `@/components/ui/toast`

## Checklist

- [ ] Query keys added to `src/services/react-query/queryKeys.ts`
- [ ] Query file created at `src/services/{feature}/{feature}.query.ts`
- [ ] `useRefetch{Entities}` reads Redux filters and dispatches thunk
- [ ] `useCreate{Entity}` has toast.success + refetch
- [ ] `useUpdate{Entity}` accepts `{ id, data }` shape
- [ ] `useDelete{Entity}` has toast.success + refetch
- [ ] All error handlers use `getApiErrorMessage(err, 'Fallback message')`
