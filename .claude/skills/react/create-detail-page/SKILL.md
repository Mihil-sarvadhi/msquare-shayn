---
name: create-detail-page
description: Create a detail page component with useParams, tab navigation via useSearchParams, Redux fetch on mount, loading and error states, and tab content rendering
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Detail Page

## Template

Create `src/pages/{feature}/detail.page.tsx`:

```typescript
import { useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetch{Entity}ById } from '@/store/slices/{feature}Slice';

type {Entity}Tab = 'overview' | 'settings'; // Define tab union type

export function {Entity}DetailPage() {
  const { {entity}Id } = useParams<{ {entity}Id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();

  const { selected{Entity}, isSelectedLoading, isSelectedError } = useAppSelector(
    (state) => state.{feature},
  );

  const activeTab = (searchParams.get('tab') as {Entity}Tab) || 'overview';

  const handleTabChange = (tab: {Entity}Tab) => {
    setSearchParams({ tab }, { replace: true });
  };

  // Fetch on mount
  useEffect(() => {
    if ({entity}Id) {
      dispatch(fetch{Entity}ById({entity}Id));
    }
  }, [{entity}Id, dispatch]);

  // Loading state
  if (isSelectedLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" strokeWidth={1.5} />
      </div>
    );
  }

  // Error state
  if (isSelectedError || !selected{Entity}) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">{Entity} not found</p>
        <Link
          to="/dashboard/{feature}"
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="inline h-4 w-4 mr-1" strokeWidth={1.5} />
          Back to {feature}
        </Link>
      </div>
    );
  }

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <div>Overview content</div>;
      case 'settings':
        return <div>Settings content</div>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/{feature}"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </Link>
          <h1 className="text-lg font-semibold">{selected{Entity}.name}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 border-b border-gray-200">
        <nav className="flex gap-6">
          {(['overview', 'settings'] as {Entity}Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors capitalize',
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-5">{renderTabContent()}</div>
    </div>
  );
}
```

## Route Registration

Add to `src/routes/route.tsx`:

```typescript
const {Entity}DetailPage = lazy(() =>
  import('@/pages/{feature}/detail.page').then((m) => ({
    default: m.{Entity}DetailPage,
  })),
);

// In routes array (under protected > AppShell > children):
{
  path: '{feature}/:{entity}Id',
  element: (
    <LazyPage>
      <{Entity}DetailPage />
    </LazyPage>
  ),
  requiredRole: [/* user-specified roles */],
},
```

## Critical Rules

1. **Hooks before returns**: All hooks (`useParams`, `useSearchParams`, `useAppDispatch`, `useAppSelector`, `useEffect`) must be called BEFORE any conditional `return`
2. **Tab state in URL**: Use `useSearchParams` with `{ replace: true }` — not local state
3. **Loading spinner**: Centered `Loader2` with `strokeWidth={1.5}`
4. **Error state**: "Not found" message + back link
5. **Lazy loading**: Register route with `React.lazy()` + `LazyPage` wrapper
6. **Named export**: `export function {Entity}DetailPage()`

## Checklist

- [ ] Detail page at `src/pages/{feature}/detail.page.tsx`
- [ ] `useParams` for ID extraction
- [ ] `useSearchParams` for tab state (not useState)
- [ ] `useEffect` fetches by ID on mount
- [ ] Loading state with `Loader2`
- [ ] Error state with back link
- [ ] All hooks called before early returns
- [ ] Route registered with lazy loading
- [ ] Lucide icons use `strokeWidth={1.5}`
