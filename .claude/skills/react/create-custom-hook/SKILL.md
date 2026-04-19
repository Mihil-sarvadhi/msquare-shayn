---
name: create-custom-hook
description: Generate custom React hooks following boilerplate conventions with proper TypeScript generics, useEffect cleanup, and logger usage
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Custom Hook

## Reference Files

Read `src/hooks/` directory for existing hooks as reference patterns.

## Template

Create `src/hooks/use{Name}.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

export function use{Name}(/* params */) {
  // State
  const [value, setValue] = useState<T>(initialValue);

  // Refs for cleanup
  const mountedRef = useRef(true);

  // Core logic
  const handler = useCallback(() => {
    if (!mountedRef.current) return;
    // ... logic
  }, [/* deps */]);

  // Effect with cleanup
  useEffect(() => {
    mountedRef.current = true;

    // ... setup

    return () => {
      mountedRef.current = false;
      // ... cleanup (clear timers, remove listeners, etc.)
    };
  }, [/* deps */]);

  return { value, handler };
}
```

## Common Hook Patterns

### Debounced Value

```typescript
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### Media Query

```typescript
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

### localStorage Sync

```typescript
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key],
  );

  return [storedValue, setValue] as const;
}
```

### Click Outside

```typescript
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
```

### Keyboard Shortcut

```typescript
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {},
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== key) return;
      if (modifiers.ctrl && !event.ctrlKey && !event.metaKey) return;
      if (modifiers.shift && !event.shiftKey) return;
      if (modifiers.alt && !event.altKey) return;

      event.preventDefault();
      callback();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, callback, modifiers]);
}
```

## Critical Rules

1. **Named export only**: `export function use{Name}()`
2. **File location**: `src/hooks/use{Name}.ts`
3. **useEffect cleanup**: ALWAYS return cleanup functions for timers, listeners, subscriptions
4. **Logger**: Use `logger` from `@/lib/logger`, never `console.log`
5. **TypeScript generics**: Use generics where the hook accepts variable types
6. **useCallback**: Wrap returned functions in `useCallback`
7. **Mounted ref**: Use `mountedRef` guard for async operations to prevent state updates after unmount
8. **`@/` imports**: Always use path alias

## Checklist

- [ ] Hook file at `src/hooks/use{Name}.ts`
- [ ] Named export only
- [ ] Proper TypeScript types/generics
- [ ] useEffect cleanup for all side effects
- [ ] useCallback on returned functions
- [ ] Uses logger, not console.log
- [ ] `@/` path alias for imports
