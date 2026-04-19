---
name: create-route
description: Add a new route to route.tsx with proper lazy loading, ErrorBoundary wrapping via LazyPage, and role guards
allowed tools: Read, Grep, Glob, Edit
---

# Create Route

## Reference File

Read `src/routes/route.tsx` as the canonical example — it contains the `LazyPage` wrapper, `RouteConfig` interface, and all route nesting patterns.

## Route Types

### 1. Public Standalone Route (no auth wrapper)

```typescript
// Add lazy import at top:
const {Entities}Page = lazy(() =>
  import('@/pages/{feature}/page').then((m) => ({ default: m.{Entities}Page })),
);

// Add to routes array (top level):
{
  path: '/{feature}',
  element: (
    <LazyPage>
      <{Entities}Page />
    </LazyPage>
  ),
},
```

### 2. Public Route with Redirect (redirects authenticated users)

```typescript
// Add inside the PublicRoute children array:
{
  path: '/{feature}',
  element: <PublicRoute />,
  children: [
    {
      path: '',
      index: true,
      element: (
        <LazyPage>
          <{Entities}Page />
        </LazyPage>
      ),
    },
  ],
},
```

### 3. Protected Route (most common — requires authentication)

```typescript
// Add inside ProtectedRoute > AppShell > children array:
{
  path: '{feature}',
  element: (
    <LazyPage>
      <{Entities}Page />
    </LazyPage>
  ),
  requiredRole: ALL_ROLES,  // or specific: ['SUPER_ADMIN', 'ADMIN']
},
```

### 4. Protected Route with Role Guard

```typescript
// Import RoleGuard if not already imported:
import { RoleGuard } from '@/components/layout/RoleGuard';

// Add inside ProtectedRoute > AppShell > children array:
{
  path: '{feature}',
  element: (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
      <LazyPage>
        <{Entities}Page />
      </LazyPage>
    </RoleGuard>
  ),
  requiredRole: ['SUPER_ADMIN', 'ADMIN'],
},
```

### 5. Detail Route (nested under feature)

```typescript
// Add lazy import:
const {Entity}DetailPage = lazy(() =>
  import('@/pages/{feature}/detail.page').then((m) => ({
    default: m.{Entity}DetailPage,
  })),
);

// Add inside ProtectedRoute > AppShell > children array:
{
  path: '{feature}/:{entity}Id',
  element: (
    <LazyPage>
      <{Entity}DetailPage />
    </LazyPage>
  ),
  requiredRole: ALL_ROLES,
},
```

## Critical Rules

1. **Lazy import pattern**: Always use `.then((m) => ({ default: m.{ComponentName} }))` — components use named exports, not default exports
2. **LazyPage wrapper**: Always wrap in `<LazyPage>` — it provides `<ErrorBoundary>` + `<Suspense fallback={<PageLoader />}>`
3. **Protected routes**: Add under `ProtectedRoute > AppShell > children` array — this is at `routes[2].children[0].children`
4. **Role groups**: Use predefined `ALL_ROLES` constant, or define new groups as needed
5. **Path format**: No leading slash for nested routes (`'{feature}'` not `'/{feature}'`)

## Checklist

- [ ] Lazy import added at top of `src/routes/route.tsx`
- [ ] Uses `.then((m) => ({ default: m.ComponentName }))` pattern
- [ ] Route entry added in correct nesting level
- [ ] Wrapped in `<LazyPage>` for ErrorBoundary + Suspense
- [ ] `requiredRole` set appropriately
- [ ] RoleGuard wrapping added if role restriction needed
