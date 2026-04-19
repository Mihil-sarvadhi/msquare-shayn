---
name: scaffold-crud-feature
description: Scaffold a complete CRUD feature with types, API service, Redux slice, query hooks, validation schema, page component, form dialog, table columns, and route registration
allowed tools: Read, Grep, Glob, Write, Edit, Bash
---

# Scaffold Complete CRUD Feature

This is the master orchestration skill. It creates all files needed for a new CRUD feature in the correct dependency order.

## Inputs Required

Before starting, confirm with the user:
1. **Feature name** (plural, kebab-case): e.g., `clients`, `invoices`, `departments`
2. **Entity name** (singular, PascalCase): e.g., `Client`, `Invoice`, `Department`
3. **Key fields**: What fields does this entity have?
4. **Roles**: Which roles can access this feature? (SUPER_ADMIN, ADMIN, MANAGER, MEMBER)

## Files Created (in order)

Execute these steps in the exact dependency order:

### Step 1: Types
Create `src/types/{feature}.ts`
→ Follow pattern from `scaffold-types` skill
→ Reference: `src/types/user.ts`

### Step 2: API Endpoint
Edit `src/utils/constants/api.constant.ts`
→ Add `{FEATURE_UPPER}: '/{feature-path}'`

### Step 3: API Service
Create `src/services/{feature}/{feature}.api.ts`
→ Follow pattern from `create-api-service` skill
→ Reference: `src/services/auth/auth.api.ts`

### Step 4: Validation Schema
Edit `src/utils/validations/index.ts` (append)
→ Follow pattern from `create-validation-schema` skill
→ Add section comment + schema + type export

### Step 5: Redux Slice
Create `src/store/slices/{feature}Slice.ts`
→ Follow pattern from `create-redux-slice` skill
→ Reference: `src/store/slices/authSlice.ts`

### Step 6: Register Slice
Edit `src/store/rootReducer.ts`
→ Import and add to `combineReducers`

### Step 7: Query Hooks
Create `src/services/{feature}/{feature}.query.ts`
→ Follow pattern from `create-query-hooks` skill
→ Reference: `src/services/auth/auth.query.ts`

### Step 8: Query Keys
Edit `src/services/react-query/queryKeys.ts`
→ Add `{feature}: { all, list, detail }` namespace

### Step 9: Table Columns
Create `src/pages/{feature}/config/{feature}Columns.tsx`
→ Follow pattern from `create-table-columns` skill

### Step 10: Form Dialog
Create `src/pages/{feature}/components/{Entity}FormDialog.tsx`
→ Follow pattern from `create-form-dialog` skill

### Step 11: Page Component
Create `src/pages/{feature}/page.tsx`

```typescript
import { useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetch{Entities},
  setSearch,
  setDebouncedSearch,
  setStatusFilter,
  setPage,
  setEditing{Entity},
  setCreateOpen,
} from '@/store/slices/{feature}Slice';
import { Button } from '@/components/ui/button';
import type { {Entity} } from '@/types/{feature}';

export function {Entities}Page() {
  const dispatch = useAppDispatch();
  const {
    {entities},
    isLoading,
    pagination,
    filters: { search, debouncedSearch, statusFilter, page },
    editing{Entity},
    isCreateOpen,
  } = useAppSelector((state) => state.{feature});

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => dispatch(setDebouncedSearch(search)), 300);
    return () => clearTimeout(timer);
  }, [search, dispatch]);

  // Fetch on filter change
  useEffect(() => {
    dispatch(
      fetch{Entities}({
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status_id: Number(statusFilter) }),
        page,
        page_size: 20,
      }),
    );
  }, [debouncedSearch, statusFilter, page, dispatch]);

  // Handlers
  const handleEdit = useCallback(
    (item: {Entity}) => dispatch(setEditing{Entity}(item)),
    [dispatch],
  );

  const handleCreate = useCallback(
    () => dispatch(setCreateOpen(true)),
    [dispatch],
  );

  return (
    <div className="flex-1 flex flex-col p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">{Entities}</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Add {Entity}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        {/* SearchInput + filter dropdowns */}
      </div>

      {/* Data Table / List */}
      {/* Render {entities} with columns */}

      {/* Form Dialog */}
      <{Entity}FormDialog
        open={isCreateOpen || !!editing{Entity}}
        onOpenChange={(open) => {
          if (!open) {
            dispatch(setCreateOpen(false));
            dispatch(setEditing{Entity}(null));
          }
        }}
        item={editing{Entity}}
      />
    </div>
  );
}
```

### Step 12: Barrel Export
Create `src/pages/{feature}/index.ts`:

```typescript
export { {Entities}Page } from './page';
```

### Step 13: Route Registration
Edit `src/routes/route.tsx`:

```typescript
const {Entities}Page = lazy(() =>
  import('@/pages/{feature}/page').then((m) => ({ default: m.{Entities}Page })),
);

// Add to protected > AppShell > children array:
{
  path: '{feature}',
  element: (
    <LazyPage>
      <{Entities}Page />
    </LazyPage>
  ),
  requiredRole: [/* user-specified roles */],
},
```

## Post-Creation Verification

Run these commands to verify:

```bash
npm run build    # TypeScript + Vite build must pass
npm run lint     # 0 warnings allowed
```

## Post-Creation Checklist

- [ ] All 13 files/edits completed
- [ ] `npm run build` passes (TypeScript + Vite)
- [ ] `npm run lint` passes (0 warnings)
- [ ] All imports use `@/` path alias
- [ ] All type imports use `import type`
- [ ] Named exports only (except slice reducer)
- [ ] Toast notifications on all mutations
- [ ] Validation schema in centralized file
- [ ] Slice registered in rootReducer
- [ ] Route registered with lazy loading
