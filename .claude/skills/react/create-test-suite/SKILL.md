---
name: create-test-suite
description: Generate a complete test file for a feature component, hook, page, or Redux slice using Vitest, Testing Library, and the project's test utilities
allowed tools: Read, Grep, Glob, Write, Edit, Bash
---

# Create Test Suite

## Reference Files

Read these before generating tests:
- `src/test/test-utils.tsx` — `renderWithProviders`, `userEvent` exports
- `src/test/factories/store.factory.ts` — `createTestStore` with preloaded state
- `src/test/msw/handlers/auth.handlers.ts` — MSW handler patterns
- `src/test/setup.ts` — Global test setup

## Test File Location

Tests go in `__tests__/` directories next to the code they test:
- Component: `src/pages/{feature}/components/__tests__/{Component}.test.tsx`
- Page: `src/pages/{feature}/__tests__/page.test.tsx`
- Hook: `src/hooks/__tests__/use{Name}.test.ts`
- Slice: `src/store/slices/__tests__/{feature}Slice.test.ts`
- API service: `src/services/{feature}/__tests__/{feature}.api.test.ts`
- Query hooks: `src/services/{feature}/__tests__/{feature}.query.test.tsx`

## Template: Component/Page Test

```typescript
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/test-utils';
import { {ComponentName} } from '../{ComponentName}';

describe('{ComponentName}', () => {
  it('renders correctly', () => {
    renderWithProviders(<{ComponentName} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    renderWithProviders(<{ComponentName} />);

    await user.click(screen.getByRole('button', { name: /action/i }));
    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });

  it('renders loading state', () => {
    renderWithProviders(<{ComponentName} />, {
      preloadedState: {
        {feature}: { isLoading: true, /* ... */ },
      },
    });
    // Check for loading indicator
  });

  it('renders error state', () => {
    renderWithProviders(<{ComponentName} />, {
      preloadedState: {
        {feature}: { isError: true, /* ... */ },
      },
    });
    // Check for error message
  });
});
```

## Template: Redux Slice Test

```typescript
import { configureStore } from '@reduxjs/toolkit';
import {feature}Reducer, {
  setSearch,
  setDebouncedSearch,
  setPage,
  setStatusFilter,
  setCreateOpen,
  resetFilters,
} from '../{feature}Slice';

describe('{feature}Slice', () => {
  const createStore = () =>
    configureStore({ reducer: { {feature}: {feature}Reducer } });

  it('sets search', () => {
    const store = createStore();
    store.dispatch(setSearch('test'));
    expect(store.getState().{feature}.filters.search).toBe('test');
  });

  it('resets page on debounced search change', () => {
    const store = createStore();
    store.dispatch(setPage(3));
    store.dispatch(setDebouncedSearch('query'));
    expect(store.getState().{feature}.filters.page).toBe(1);
  });

  it('resets page on status filter change', () => {
    const store = createStore();
    store.dispatch(setPage(3));
    store.dispatch(setStatusFilter('active'));
    expect(store.getState().{feature}.filters.page).toBe(1);
  });

  it('resets all filters', () => {
    const store = createStore();
    store.dispatch(setSearch('test'));
    store.dispatch(setPage(5));
    store.dispatch(resetFilters());
    expect(store.getState().{feature}.filters).toEqual({
      search: '',
      debouncedSearch: '',
      statusFilter: 'all',
      page: 1,
    });
  });
});
```

## Template: Custom Hook Test

```typescript
import { renderHook, act } from '@testing-library/react';
import { use{Name} } from '../use{Name}';

describe('use{Name}', () => {
  it('returns initial value', () => {
    const { result } = renderHook(() => use{Name}(/* params */));
    expect(result.current.value).toBe(initialValue);
  });

  it('updates on action', () => {
    const { result } = renderHook(() => use{Name}(/* params */));
    act(() => {
      result.current.handler();
    });
    expect(result.current.value).toBe(expectedValue);
  });
});
```

## Template: Query Hook Test

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { createTestStore } from '@/test/factories/store.factory';
import { useCreate{Entity} } from '../{feature}.query';

function createWrapper() {
  const store = createTestStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    );
  };
}

describe('useCreate{Entity}', () => {
  it('calls API on mutate', async () => {
    const { result } = renderHook(() => useCreate{Entity}(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ name: 'Test' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

## Critical Rules

1. **Import from test-utils**: Use `renderWithProviders` from `@/test/test-utils`, NOT raw `render`
2. **userEvent over fireEvent**: Always use `userEvent.setup()` for interaction tests
3. **Preloaded state**: Use `preloadedState` option for testing different Redux states
4. **waitFor for async**: Wrap async assertions in `waitFor`
5. **Accessible queries**: Prefer `getByRole`, `getByLabelText`, `getByText` over `getByTestId`
6. **MSW for API**: Use MSW handlers for API mocking, not manual mocks
7. **Describe/it pattern**: Use `describe` for grouping, `it` for individual tests
8. **No console.log**: Use `logger` if logging needed in tests

## Running Tests

```bash
npm run test:run                    # Run all tests once
npx vitest run src/path/to/test    # Run specific test file
npm run test:coverage               # Run with coverage report
```

## Checklist

- [ ] Test file in `__tests__/` directory next to source
- [ ] Uses `renderWithProviders` from `@/test/test-utils`
- [ ] Uses `userEvent.setup()` for interactions
- [ ] Tests loading, error, and success states
- [ ] Tests user interactions
- [ ] Uses accessible queries (getByRole, getByText)
- [ ] Async operations wrapped in `waitFor`
- [ ] MSW handlers for API calls (if needed)
- [ ] All tests pass: `npm run test:run`
