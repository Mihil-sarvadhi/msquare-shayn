---
name: create-page
description: Create a new feature page component with proper directory structure, barrel exports, Redux state integration, and standard page layout pattern
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Page Component

## Reference File

Read `src/routes/route.tsx` for the lazy loading pattern and `src/pages/dashboard/page.tsx` for the page structure.

## Step 1: Create Directory Structure

```
src/pages/{feature}/
├── page.tsx              # Main page component
├── components/           # Feature-specific components
├── config/               # Column definitions, config objects
└── index.ts              # Barrel exports
```

## Step 2: Create Page Component

Create `src/pages/{feature}/page.tsx`:

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
    isError,
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

  // Handlers (wrapped in useCallback for child components)
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
        {/* Search input + filter dropdowns */}
      </div>

      {/* Content: DataTable or card grid */}
      {/* Render {entities} list here */}

      {/* Form Dialog */}
      {/* <{Entity}FormDialog
        open={isCreateOpen || !!editing{Entity}}
        onOpenChange={(open) => {
          if (!open) {
            dispatch(setCreateOpen(false));
            dispatch(setEditing{Entity}(null));
          }
        }}
        item={editing{Entity}}
      /> */}
    </div>
  );
}
```

## Step 3: Create Barrel Export

Create `src/pages/{feature}/index.ts`:

```typescript
export { {Entities}Page } from './page';
```

## Critical Rules

1. **Named export only**: `export function {Entities}Page()` — no default exports
2. **Page padding**: Root div uses `p-5`
3. **Page title**: `text-lg font-semibold`
4. **Debounced search**: `setTimeout` with 300ms delay + cleanup
5. **useCallback**: Wrap handlers passed to child components
6. **Icons**: `strokeWidth={1.5}` on all Lucide icons
7. **Redux state**: All filters, pagination, dialog state in Redux — no `useState` for these

## Checklist

- [ ] Page created at `src/pages/{feature}/page.tsx`
- [ ] `components/` directory created
- [ ] `config/` directory created
- [ ] `index.ts` barrel export created
- [ ] Debounced search with cleanup
- [ ] Handlers wrapped in `useCallback`
- [ ] Redux state for filters, pagination, dialog
- [ ] Named export only
