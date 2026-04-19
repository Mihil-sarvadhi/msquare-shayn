---
name: create-context
description: Create a React context with Provider component and typed useHook, following the eslint-disable and throw-on-missing-context pattern
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create React Context

## Reference File

Read `src/contexts/SidebarContext.tsx` as the canonical example before generating.

## Template

Create `src/contexts/{Name}Context.tsx`:

```typescript
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';

interface {Name}ContextType {
  // State
  someState: boolean;
  // Methods
  toggle: () => void;
  setSomeState: (value: boolean) => void;
}

const {Name}Context = createContext<{Name}ContextType | undefined>(undefined);

export function {Name}Provider({ children }: { children: React.ReactNode }) {
  const [someState, setSomeStateInternal] = useState(false);

  const toggle = useCallback(() => setSomeStateInternal((prev) => !prev), []);
  const setSomeState = useCallback((value: boolean) => setSomeStateInternal(value), []);

  return (
    <{Name}Context.Provider value={{ someState, toggle, setSomeState }}>
      {children}
    </{Name}Context.Provider>
  );
}

export function use{Name}() {
  const context = useContext({Name}Context);
  if (!context) {
    throw new Error('use{Name} must be used within {Name}Provider');
  }
  return context;
}
```

## Critical Rules

1. **First line MUST be**: `/* eslint-disable react-refresh/only-export-components */`
2. **Context type**: `createContext<T | undefined>(undefined)` — always undefined default
3. **Hook throws**: `use{Name}` must throw if context is missing
4. **useCallback**: Wrap ALL methods exposed via context value
5. **Named exports only**: `export function {Name}Provider` and `export function use{Name}`
6. **No default export**

## Optional: localStorage Persistence

```typescript
const STORAGE_KEY = 'app-{feature}-state';

export function {Name}Provider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // ...
}
```

## Provider Registration

After creating, register in the provider nesting order at `src/components/layout/AppShell.tsx`:

```typescript
// Provider nesting order (inside ProtectedRoute):
<SidebarProvider>
  <{Name}Provider>        {/* ← Add here */}
    <AppShellContent />
  </{Name}Provider>
</SidebarProvider>
```

## Checklist

- [ ] File created at `src/contexts/{Name}Context.tsx`
- [ ] First line is eslint-disable comment
- [ ] Context created with `undefined` default
- [ ] Provider component with `children` prop
- [ ] `use{Name}` hook with throw on missing context
- [ ] All methods wrapped in `useCallback`
- [ ] Provider registered in AppShell nesting order
