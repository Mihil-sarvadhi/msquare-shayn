# Project Coding Rules

> These rules are mandatory for all development — human or AI. Every file you create or modify must follow these patterns exactly.

## Quick Reference

```bash
npm run local    # Dev server at http://localhost:5000
npm run dev      # Dev server at http://localhost:5001
npm run build    # tsc -b + env-cmd -f .env.production vite build
npm run lint     # ESLint strict mode (0 warnings allowed: --max-warnings 0)
npm run test:run # Run all tests once
```

## Tech Stack

- React 19 + TypeScript 5.9 + Vite 7
- Tailwind CSS 3.4
- Redux Toolkit + redux-persist (state), React Query (mutations)
- React Hook Form + Zod (forms)
- React Router DOM 7
- Lucide React (icons)
- Axios (HTTP)
- Vitest + Testing Library + MSW (testing)

---

## 1. Directory Structure

```
src/
├── components/
│   ├── layout/           # AppShell, Sidebar, TopBar, route guards
│   ├── shared/           # Reusable: ErrorBoundary, PageLoader, EmptyState
│   └── ui/               # UI primitives (toast, add your component library here)
├── contexts/             # React contexts (SidebarContext, etc.)
├── hooks/                # Custom hooks
├── lib/                  # Utilities: utils.ts (cn), permissions.ts, logger.ts
├── pages/{feature}/      # Feature pages
│   ├── page.tsx          # Main page component (named export)
│   ├── detail.page.tsx   # Detail view (optional)
│   ├── components/       # Feature-specific components
│   ├── config/           # Column definitions, config objects
│   └── index.ts          # Barrel exports
├── providers/            # AppProviders, ReduxProvider, QueryProvider
├── routes/               # Route definitions with role guards
├── services/
│   ├── configs/          # baseService (Axios), apiService (unwrapper), app.config
│   ├── react-query/      # queryClient, queryKeys
│   └── {feature}/        # Feature API + query hooks
├── store/
│   ├── hooks.ts          # useAppSelector, useAppDispatch (typed)
│   ├── rootReducer.ts    # combineReducers registration
│   ├── storeSetup.ts     # configureStore + persist config
│   └── slices/           # Redux slices per feature
├── styles/globals.css    # CSS variables and design tokens
├── types/                # TypeScript definitions per domain
└── utils/
    ├── constants/        # api.constant.ts, master.constant.ts, app.constant.ts
    ├── common-functions/ # getApiErrorMessage, date helpers
    ├── status-styles.ts  # Status code → UI style mapping
    └── validations/      # Centralized Zod schemas + helpers
```

---

## 2. TypeScript Rules

### Imports
- **Path alias**: Always use `@/` for all `src/` imports. Never use relative paths like `../../`.
- **verbatimModuleSyntax is ON**: Type-only imports MUST use `import type` syntax. This is enforced by TypeScript and will fail the build if violated.

```typescript
// CORRECT
import type { Task, TaskStatus } from '@/types/task';
import { useAppSelector, type RootState } from '@/store/hooks';

// WRONG — build will fail (TS1484)
import { Task } from '@/types/task';
```

### Strict Mode
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` are enforced.
- Zero unused variables or imports allowed.

### Type Conventions
- API response types: `snake_case` fields (matching backend). File: `src/types/{feature}-api.ts`
- App-level types: `camelCase` fields. File: `src/types/{feature}.ts`
- Props interfaces: `{ComponentName}Props`, defined directly above the component function.
- Union types for finite options: `type Priority = 'critical' | 'high' | 'medium' | 'low'`

---

## 3. Component Rules

### Exports
- **Named exports only**: `export function MyComponent()`. Never use `default export` (exception: Redux slice reducers use `export default`).
- Barrel exports in `index.ts`: `export { MyComponent } from './MyComponent';`

### Props
- Always define a TypeScript interface for props.
- Name it `{ComponentName}Props`.

```typescript
interface ProjectCardProps {
  project: ProjectListItem;
  onEdit: (project: ProjectListItem) => void;
  onDelete?: (id: string) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  // ...
}
```

### Contexts
- All context files MUST have `/* eslint-disable react-refresh/only-export-components */` at the top.
- Pattern: `createContext<T | undefined>(undefined)` → Provider component → `useXxx()` hook that throws if context is missing.

```typescript
/* eslint-disable react-refresh/only-export-components */
const MyContext = createContext<MyContextValue | undefined>(undefined);

export function MyProvider({ children }: { children: ReactNode }) { /* ... */ }

export function useMyContext() {
  const ctx = useContext(MyContext);
  if (!ctx) throw new Error('useMyContext must be used within MyProvider');
  return ctx;
}
```

### Icons
- Use Lucide React for all icons.
- **Always** set `strokeWidth={1.5}` for visual consistency.
- Size classes: `h-3 w-3` (tiny), `h-4 w-4` (default), `h-5 w-5` (medium), `h-6 w-6` (large).

### Styling
- Use `cn()` from `@/lib/utils` for all conditional Tailwind classes. Always prefer `cn()` even when combining static + dynamic.
- Reference CSS variables from `globals.css` (e.g., `var(--primary)`).
- No inline `style={}` except for truly dynamic values (e.g., calculated widths).
- Primary color: Indigo (`#6366F1`).

```typescript
className={cn(
  'base-classes here',
  isActive && 'bg-indigo-50 text-indigo-700',
  variant === 'destructive' && 'bg-red-50 text-red-700',
)}
```

### Dialogs & Modals
- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`.
- Same dialog handles create + edit — check for existing item to determine mode.

---

## 4. State Management

### Redux (ALL API data + UI state)
- **Every feature** gets a slice at `src/store/slices/{feature}Slice.ts`.
- **Always** use `useAppSelector` / `useAppDispatch` from `src/store/hooks.ts`. NEVER use raw `useSelector` / `useDispatch`.
- **GET APIs**: Use `createAsyncThunk` → handle in `extraReducers` with `.pending` / `.fulfilled` / `.rejected`.
- **No `useState` for**: filters, pagination, fetched data, view mode, dialog open state. All of this lives in Redux.
- Register every new slice in `src/store/rootReducer.ts`.
- Only the `auth` slice is persisted (redux-persist whitelist).

### Slice Structure

```typescript
// 1. Async thunk
export const fetchItems = createAsyncThunk(
  'items/fetchItems',
  async (params: ItemListParams) => itemsApi.list(params),
);

// 2. State interface
interface ItemsState {
  items: Item[];
  pagination: { total: number };
  isLoading: boolean;
  isError: boolean;
  filters: { search: string; debouncedSearch: string; statusFilter: string; page: number };
  editingItem: Item | null;
  isCreateOpen: boolean;
}

// 3. Slice
const itemsSlice = createSlice({
  name: 'items',
  initialState,
  reducers: {
    setSearch(state, action: PayloadAction<string>) { state.filters.search = action.payload; },
    setDebouncedSearch(state, action: PayloadAction<string>) {
      state.filters.debouncedSearch = action.payload;
      state.filters.page = 1; // Reset page on filter change
    },
    setPage(state, action: PayloadAction<number>) { state.filters.page = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => { state.isLoading = true; state.isError = false; })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.items = action.payload.data;
        state.pagination = action.payload.pagination;
        state.isLoading = false;
      })
      .addCase(fetchItems.rejected, (state) => { state.isLoading = false; state.isError = true; });
  },
});
```

### Page Pattern

```typescript
export function ItemsPage() {
  const dispatch = useAppDispatch();
  const { items, isLoading, isError, filters } = useAppSelector((s) => s.items);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => dispatch(setDebouncedSearch(searchValue)), 300);
    return () => clearTimeout(timer);
  }, [searchValue, dispatch]);

  // Fetch on filter change
  useEffect(() => {
    dispatch(fetchItems(queryParams));
  }, [queryParams, dispatch]);
}
```

### React Context
- Use ONLY for global UI state: sidebar collapse, timer, active modals.
- NOT for API data. API data always goes through Redux.

---

## 5. API Layer

### Service Structure
- `src/services/configs/baseService.ts` — Axios instance with auth interceptor + 401 redirect.
- `src/services/configs/apiService.ts` — Wrapper that auto-unwraps `response.data.data`.
- `src/services/{feature}/{feature}.api.ts` — Feature-specific API methods.

### API Conventions
- **Always use PUT for updates**, never PATCH. Backend expects PUT.
- Use `apiService` for standard JSON requests. Use `baseService` directly for FormData uploads (with `Content-Type: multipart/form-data`).
- Use `API_ENDPOINTS` constants from `src/utils/constants/api.constant.ts`. Never hardcode URL paths.
- Backend response format: `{ success, statusCode, data, message, pagination }`.

```typescript
export const itemsApi = {
  list: (params?: ListParams) =>
    baseService.get<{ data: Item[] }>(API_ENDPOINTS.ITEMS, { params }).then((r) => r.data),
  create: (data: CreatePayload) => apiService.post<Item>(API_ENDPOINTS.ITEMS, data),
  update: (id: string, data: UpdatePayload) => apiService.put<Item>(`${API_ENDPOINTS.ITEMS}/${id}`, data),
  delete: (id: string) => apiService.delete<void>(`${API_ENDPOINTS.ITEMS}/${id}`),
};
```

---

## 6. React Query Hooks

### Mutations (create/update/delete)
- Defined in `src/services/{feature}/{feature}.query.ts`.
- On success: re-dispatch the Redux fetch thunk to refresh the list with current filters.
- Use `useRefetchXxx()` helper that reads current Redux filters → rebuilds params → dispatches thunk.
- **Always** add toast notifications (see section 7).

```typescript
function useRefetchItems() {
  const dispatch = useAppDispatch();
  const { debouncedSearch, statusFilter, page } = useAppSelector((s) => s.items.filters);
  return () => {
    dispatch(fetchItems({
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(statusFilter !== 'all' && { status_id: Number(statusFilter) }),
      page, page_size: 20,
    }));
  };
}

export function useCreateItem() {
  const refetch = useRefetchItems();
  return useMutation({
    mutationFn: (data: CreatePayload) => itemsApi.create(data),
    onSuccess: () => { toast.success('Item created successfully'); refetch(); },
    onError: (err) => { toast.error(getApiErrorMessage(err, 'Failed to create item')); },
  });
}
```

---

## 7. Toast Notifications (MUST follow)

**ALWAYS add toasts for**: create, update, delete, invite, assign, status change, form submit — any mutation.

```typescript
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/utils/common-functions';

onSuccess: () => { toast.success('Item created successfully'); },
onError: (err) => { toast.error(getApiErrorMessage(err, 'Failed to create item')); },
```

- Error toasts MUST show the actual backend message via `getApiErrorMessage(err, 'Fallback')`.
- Import `getApiErrorMessage` from `@/utils/common-functions`.

---

## 8. Form Validation (MUST follow)

- **ALL Zod schemas** live in `src/utils/validations/index.ts`. NEVER define schemas in component files.
- Every schema exports an inferred type: `export type XFormValues = z.infer<typeof xSchema>;`
- Naming: schemas = `{action}{Entity}Schema` (camelCase), types = `{Action}{Entity}FormValues` (PascalCase).
- Required string fields: `.min(1, 'Name is required')`, not just `.string()`.
- RHF dialogs: `useForm<T>({ resolver: zodResolver(schema) })`.
- useState forms: use `validateBeforeSubmit()` + `isFormValid()` from `@/utils/validations/helpers`.

```typescript
// src/utils/validations/index.ts
export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});
export type CreateItemFormValues = z.infer<typeof createItemSchema>;

// Component
import { createItemSchema, type CreateItemFormValues } from '@/utils/validations';
const form = useForm<CreateItemFormValues>({ resolver: zodResolver(createItemSchema) });
```

---

## 9. Master Data (MUST follow)

**NEVER hardcode status names/labels** for conditional logic (colors, icons, visibility).

- Fetch master data from the API.
- Match by `code` (machine-readable), NOT `name` (display label).
- Use `getStatusStyle()` from `@/utils/status-styles.ts` for UI styling.
- Master codes defined in `src/utils/constants/master.constant.ts`.

---

## 10. Routing & Permissions

- Route definitions in `src/routes/route.tsx` with `requiredRole` arrays.
- Wrap restricted pages with `<RoleGuard allowedRoles={[...]}>`.
- Permission helpers in `src/lib/permissions.ts`.
- Roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `MEMBER`.

---

## 11. React Best Practices (MUST follow)

### Error Boundaries
- Wrap route-level pages with `ErrorBoundary`. Show a fallback UI, never a white screen.

### Logging — Use Logger, Not console.log
- **Never use raw `console.log`** — use the project logger from `@/lib/logger` instead.
- `src/lib/logger.ts` patches `console.log`, `console.info`, `console.debug` to no-ops in production.
- For new code: `import { logger } from '@/lib/logger'; logger.log('message');`
- Only `console.error` is acceptable in error interceptors/boundaries.

### Code Splitting
- Use `React.lazy()` + `<Suspense>` for route-level page components.

```typescript
const ProjectsPage = React.lazy(() => import('@/pages/projects/page'));
<Suspense fallback={<PageLoader />}><ProjectsPage /></Suspense>
```

### React Strict Mode
- `<StrictMode>` MUST wrap the app in `main.tsx` during development.

### useCallback & useMemo
- **Handlers passed to child components as props**: MUST be wrapped in `useCallback`.
- **Inline handlers** on leaf JSX elements (`onClick={() => ...}` on a `<button>`): fine without `useCallback`.
- **Expensive computations**: wrap in `useMemo` with correct dependency arrays.

```typescript
// CORRECT — handler passed to child component
const handleEdit = useCallback((item: Item) => {
  dispatch(setEditingItem(item));
}, [dispatch]);

// FINE — inline handler on leaf element
<button onClick={() => setOpen(false)}>Close</button>
```

### Stable Keys
- **NEVER use array index as `key`**. Always use unique, stable IDs.

```typescript
// CORRECT
{items.map((item) => <ItemRow key={item.id} item={item} />)}

// WRONG
{items.map((item, index) => <ItemRow key={index} item={item} />)}
```

### Event Handler Naming
- Internal handlers: prefix with `handle` → `handleClick`, `handleSubmit`.
- Callback props: prefix with `on` → `onClick`, `onSubmit`.

### useEffect Cleanup
- Async operations in `useEffect` MUST handle component unmounting.
- Always return cleanup functions from effects that create subscriptions, timers, or listeners.

### useEffect Dependency Discipline
- Never put non-memoized objects or arrays in `useEffect` dependency arrays — they cause infinite loops.
- Extract primitive values or use `useMemo` to stabilize references.

### Hooks Before Early Returns
- All React hooks MUST be called before any conditional `return`.

### Defensive Access — Always Use Optional Chaining (`?.`)
- **Always use `?.`** when accessing properties on objects that could be `null`, `undefined`, or from API responses.
- Use **nullish coalescing (`??`)** for fallback values: `const count = pagination?.total ?? 0;`

---

## 12. Styling & Design Tokens

Colors defined in `src/styles/globals.css`:
- Primary: Indigo (`#6366F1`)
- Success: Green (`#4ADE80`)
- Warning: Amber (`#FBBF24`)
- Destructive: Red (`#F87171`)
- Info: Blue (`#60A5FA`)

---

## 13. ESLint & Build

- **0 warnings allowed** (`--max-warnings 0`). Every warning must be fixed.
- Pre-existing `react-refresh/only-export-components` in context files: suppress with `/* eslint-disable react-refresh/only-export-components */`.
- Always run `npm run build` to verify TypeScript + production build pass before considering work complete.
- `npm run lint` to verify lint passes.

---

## 14. Date Handling

- API dates come as ISO format: `2024-01-15T00:00:00.000Z`.
- `<input type="date">` requires `YYYY-MM-DD` format.
- Always convert between formats when reading from / writing to the API.

---

## 15. Provider Nesting Order

```typescript
// src/providers/AppProviders.tsx
<ReduxProvider>          {/* Redux store + PersistGate */}
  <QueryProvider>        {/* React Query client */}
    <ToastProvider>      {/* Toast notifications */}
      {children}
    </ToastProvider>
  </QueryProvider>
</ReduxProvider>

// src/components/layout/AppShell.tsx (inside ProtectedRoute)
<SidebarProvider>
  <AppShellContent />    {/* Sidebar + TopBar + Outlet */}
</SidebarProvider>
```
