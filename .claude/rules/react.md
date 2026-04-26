# React Frontend Rules

> Auto-loaded when working in `frontend/`. Mandatory for all development — human or AI.

## Quick Reference

```bash
cd frontend
npm run local      # Dev server at http://localhost:5000
npm run dev        # Dev server at http://localhost:5001
npm run build      # tsc -b + env-cmd -f .env.production vite build
npm run lint       # ESLint strict mode (0 warnings: --max-warnings 0)
npm run test:run   # Vitest — run all tests once
```

## Tech Stack

React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3.4 · Redux Toolkit + redux-persist · React Query (mutations) · React Hook Form + Zod · React Router DOM 7 · Axios · Lucide React · Vitest + Testing Library + MSW

---

## 1. Imports & TypeScript

- **Path alias**: Always `@/` for `src/` imports. Never relative paths like `../../`
- **`verbatimModuleSyntax` is ON**: Type-only imports MUST use `import type`
  ```typescript
  // CORRECT
  import type { Task } from '@/types/task';
  import { useAppSelector, type RootState } from '@/store/hooks';

  // WRONG — build fails (TS1484)
  import { Task } from '@/types/task';
  ```
- **Strict mode**: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- API response types: `snake_case` fields → `src/types/{feature}-api.ts`
- App-level types: `camelCase` fields → `src/types/{feature}.ts`
- Props: `{ComponentName}Props` interface, defined directly above the component

---

## 2. Components

### Exports
- **Named exports only**: `export function MyComponent()` — never `default export`
- Exception: Redux slice reducers use `export default`
- Barrel exports: `export { MyComponent } from './MyComponent';`

### Props
```typescript
interface ProjectCardProps {
  project: ProjectListItem;
  onEdit: (project: ProjectListItem) => void;
}

export function ProjectCard({ project, onEdit }: ProjectCardProps) { /* ... */ }
```

### Contexts
- Top of file: `/* eslint-disable react-refresh/only-export-components */`
- Pattern: `createContext<T | undefined>(undefined)` → Provider → `useXxx()` hook with throw guard

### Icons
- Lucide React only. Always `strokeWidth={1.5}`
- Sizes: `h-3 w-3` (tiny), `h-4 w-4` (default), `h-5 w-5` (medium), `h-6 w-6` (large)

### Styling
- `cn()` from `@/lib/utils` for ALL conditional Tailwind classes
- CSS variables from `globals.css` (e.g., `var(--primary)`)
- No inline `style={}` except truly dynamic values
- Primary color: Indigo (`#6366F1`)

### Dialogs & Modals
- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`
- Same dialog handles create + edit — check for existing item to determine mode

---

## 3. State Management

### Redux (ALL API data + UI state)
- Every feature → slice at `src/store/slices/{feature}Slice.ts`
- Always `useAppSelector` / `useAppDispatch` from `src/store/hooks.ts` — NEVER raw hooks
- GET APIs → `createAsyncThunk` → `extraReducers` (.pending/.fulfilled/.rejected)
- **No `useState` for**: filters, pagination, fetched data, view mode, dialog open state
- Register every slice in `src/store/rootReducer.ts`
- Only `auth` slice is persisted

### Slice Structure
```typescript
export const fetchItems = createAsyncThunk(
  'items/fetchItems',
  async (params: ItemListParams) => itemsApi.list(params),
);

interface ItemsState {
  items: Item[];
  pagination: { total: number };
  isLoading: boolean;
  isError: boolean;
  filters: { search: string; debouncedSearch: string; statusFilter: string; page: number };
  editingItem: Item | null;
  isCreateOpen: boolean;
}
```

### React Context
- ONLY for global UI state: sidebar collapse, timer, active modals
- NEVER for API data

---

## 4. API Layer

- `src/services/configs/baseService.ts` — Axios instance + auth interceptor + 401 redirect
- `src/services/configs/apiService.ts` — Auto-unwraps `response.data.data`
- `src/services/{feature}/{feature}.api.ts` — Feature API methods
- **Always PUT for updates**, never PATCH
- `apiService` for JSON, `baseService` for FormData uploads
- `API_ENDPOINTS` from `src/utils/constants/api.constant.ts` — never hardcode URLs
- Backend response: `{ success, statusCode, data, message, pagination }`

---

## 5. React Query — Mutations Only

- Defined in `src/services/{feature}/{feature}.query.ts`
- On success: re-dispatch Redux fetch thunk to refresh list
- Use `useRefetchXxx()` helper (reads Redux filters → dispatches thunk)
- **Always toast** on success and error

```typescript
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

## 6. Toast Notifications (MANDATORY)

Every mutation must have toasts:
```typescript
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/utils/common-functions';

onSuccess: () => { toast.success('Item created successfully'); },
onError: (err) => { toast.error(getApiErrorMessage(err, 'Fallback message')); },
```

---

## 7. Form Validation (MANDATORY)

- ALL Zod schemas in `src/utils/validations/index.ts` — NEVER in component files
- Schema naming: `{action}{Entity}Schema` (camelCase)
- Type naming: `{Action}{Entity}FormValues` (PascalCase)
- Required strings: `.min(1, 'Name is required')` not just `.string()`
- RHF: `useForm<T>({ resolver: zodResolver(schema) })`

---

## 8. Master Data

- NEVER hardcode status names/labels
- Fetch from API, match by `code` (not `name`)
- Use `getStatusStyle()` from `@/utils/status-styles.ts`
- Constants in `src/utils/constants/master.constant.ts`

---

## 9. Routing & Permissions

- Routes in `src/routes/route.tsx` with `requiredRole` arrays
- `<RoleGuard allowedRoles={[...]}>` for restricted pages
- Permission helpers in `src/lib/permissions.ts`
- Roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `MEMBER`

---

## 10. React Best Practices

| Rule | Detail |
|------|--------|
| Error Boundaries | Wrap route-level pages. Never white screen |
| Logging | `logger` from `@/lib/logger` — never `console.log` |
| Code Splitting | `React.lazy()` + `<Suspense>` for page components |
| StrictMode | Must wrap app in `main.tsx` |
| useCallback | Required when passing handlers to child components as props |
| useMemo | Required for expensive computations |
| Keys | NEVER array index — always unique stable IDs |
| Handler naming | Internal: `handle*` / Props: `on*` |
| useEffect cleanup | Always clean up timers, subscriptions, listeners |
| Dependency arrays | Never non-memoized objects/arrays (infinite loop risk) |
| Hooks order | All hooks BEFORE any conditional return |
| Optional chaining | Always `?.` on nullable objects + `??` for fallbacks |

---

## 11. Styling & Design Tokens

Colors in `src/styles/globals.css`:
- Primary: Indigo `#6366F1`
- Success: Green `#4ADE80`
- Warning: Amber `#FBBF24`
- Destructive: Red `#F87171`
- Info: Blue `#60A5FA`

---

## 12. Build & Lint

- **0 warnings** (`--max-warnings 0`) — every warning must be fixed
- Context files: suppress with `/* eslint-disable react-refresh/only-export-components */`
- Always verify `npm run build` + `npm run lint` pass before completing work

---

## 13. Provider Nesting Order

```typescript
<ReduxProvider>
  <QueryProvider>
    <ToastProvider>
      {children}
    </ToastProvider>
  </QueryProvider>
</ReduxProvider>
```

---

## 14. Date Handling

- API: ISO format `2024-01-15T00:00:00.000Z`
- `<input type="date">`: `YYYY-MM-DD`
- Always convert between formats at the boundary
