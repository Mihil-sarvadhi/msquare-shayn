---
name: create-redux-slice
description: Create a Redux Toolkit slice with async thunks, typed state interface, filters, pagination, UI state, and register it in rootReducer
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Redux Slice

## Reference File

Read `src/store/slices/authSlice.ts` as the canonical example before generating. Note: the auth slice is simpler (no async thunks or filters) — the template below shows the full pattern for feature slices.

## Step 1: Create Slice File

Create `src/store/slices/{feature}Slice.ts`:

```typescript
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { {feature}Api } from '@/services/{feature}/{feature}.api';
import type { {Entity}, {Entity}ListParams, {Entity}ListResponse } from '@/types/{feature}';

// ── Async Thunks (GET APIs) ──────────────────────────────────────────

export const fetch{Entities} = createAsyncThunk(
  '{feature}/fetch{Entities}',
  async (params: {Entity}ListParams) => {
    const response = await {feature}Api.list(params);
    return response;
  },
);

// ── State ────────────────────────────────────────────────────────────

interface {Entities}Filters {
  search: string;
  debouncedSearch: string;
  statusFilter: string;
  page: number;
}

interface {Entities}State {
  // API data (managed by extraReducers)
  {entities}: {Entity}[];
  pagination: { total: number };
  isLoading: boolean;
  isError: boolean;

  // UI state (managed by reducers)
  filters: {Entities}Filters;
  editing{Entity}: {Entity} | null;
  isCreateOpen: boolean;
}

const initialState: {Entities}State = {
  {entities}: [],
  pagination: { total: 0 },
  isLoading: false,
  isError: false,

  filters: {
    search: '',
    debouncedSearch: '',
    statusFilter: 'all',
    page: 1,
  },
  editing{Entity}: null,
  isCreateOpen: false,
};

// ── Slice ────────────────────────────────────────────────────────────

const {feature}Slice = createSlice({
  name: '{feature}',
  initialState,
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
    },
    setDebouncedSearch(state, action: PayloadAction<string>) {
      state.filters.debouncedSearch = action.payload;
      state.filters.page = 1; // Reset page on filter change
    },
    setStatusFilter(state, action: PayloadAction<string>) {
      state.filters.statusFilter = action.payload;
      state.filters.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.filters.page = action.payload;
    },
    setEditing{Entity}(state, action: PayloadAction<{Entity} | null>) {
      state.editing{Entity} = action.payload;
    },
    setCreateOpen(state, action: PayloadAction<boolean>) {
      state.isCreateOpen = action.payload;
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetch{Entities}.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(fetch{Entities}.fulfilled, (state, action: PayloadAction<{Entity}ListResponse>) => {
        state.{entities} = action.payload.data;
        state.pagination = action.payload.pagination;
        state.isLoading = false;
        state.isError = false;
      })
      .addCase(fetch{Entities}.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      });
  },
});

export const {
  setSearch,
  setDebouncedSearch,
  setStatusFilter,
  setPage,
  setEditing{Entity},
  setCreateOpen,
  resetFilters,
} = {feature}Slice.actions;

export default {feature}Slice.reducer;
```

## Step 2: Register in rootReducer

Edit `src/store/rootReducer.ts`:

```typescript
import {feature}Reducer from './slices/{feature}Slice';

const rootReducer = combineReducers({
  // ... existing slices
  {feature}: {feature}Reducer,
});
```

## Critical Rules

1. **`export default`** is allowed ONLY for slice reducers
2. **All other exports** must be named (actions, thunks)
3. **`setDebouncedSearch`** must reset `page` to 1
4. **Use `type PayloadAction`** with `import type` syntax in combined imports
5. **Use `useAppSelector` / `useAppDispatch`** from `@/store/hooks` — never raw Redux hooks
6. **Thunk prefix** format: `'{feature}/fetch{Entities}'`

## Checklist

- [ ] Slice file created at `src/store/slices/{feature}Slice.ts`
- [ ] Async thunk defined for list fetch
- [ ] State interface includes: items, pagination, isLoading, isError, filters, editingItem, isCreateOpen
- [ ] Filters include: search, debouncedSearch, statusFilter, page
- [ ] `setDebouncedSearch` resets page to 1
- [ ] `extraReducers` handles .pending, .fulfilled, .rejected
- [ ] Slice registered in `src/store/rootReducer.ts`
