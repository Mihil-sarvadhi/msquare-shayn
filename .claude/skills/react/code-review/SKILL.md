---
name: code-review
description: Review code for compliance with CLAUDE.md coding rules including imports, exports, Redux patterns, API conventions, toast notifications, validation, master data, and React best practices
allowed tools: Read, Grep, Glob
---

# Code Review Checklist

Review the specified files (or recently changed files via `git diff`) against these 17 rules from CLAUDE.md. Report violations as a numbered list with file path, line number, rule name, and fix suggestion.

## Rules to Check

### 1. Type-Only Imports (CRITICAL — build fails)
**Rule**: `verbatimModuleSyntax` is ON. Type-only imports MUST use `import type` syntax.
```typescript
// VIOLATION
import { Task } from '@/types/task';  // TS1484 error

// FIX
import type { Task } from '@/types/task';
import { useAppSelector, type RootState } from '@/store/hooks';
```
**Search**: Look for imports from `@/types/` without `type` keyword.

### 2. Path Aliases
**Rule**: Always use `@/` for src imports. Never relative `../../`.
**Search**: `from '\.\./` or `from '\./` in non-index files.

### 3. Named Exports Only
**Rule**: Never use `export default` except for Redux slice reducers.
**Search**: `export default` in non-slice files.

### 4. No console.log
**Rule**: Use `logger` from `@/lib/logger`. Raw console.log/info/debug are suppressed in production.
**Search**: `console.log`, `console.info`, `console.debug` (except in `logger.ts` itself).

### 5. No Hardcoded Status Names
**Rule**: Match by `code` (machine-readable), NOT `name` (display label). Use `getStatusStyle()` from `@/utils/status-styles.ts`.
**Search**: String comparisons with status names like `=== 'Active'`, `=== 'Completed'`, `=== 'In Progress'`.

### 6. Toast on Every Mutation
**Rule**: All create/update/delete operations must have `toast.success()` and `toast.error()`.
**Search**: `useMutation` without `toast.success` or `toast.error` in the same hook.

### 7. useCallback on Prop Handlers
**Rule**: Handlers passed to child components as props MUST be wrapped in `useCallback`.
**Search**: Functions defined inline that are passed as `on*` props to child components.

### 8. No Array Index Keys
**Rule**: Never use array index as `key`. Always use unique, stable IDs.
**Search**: `key={index}`, `key={i}`, `key={idx}`.

### 9. Hooks Before Returns
**Rule**: All React hooks must be called before any conditional `return`.
**Search**: `return` statements before `useState`, `useEffect`, `useCallback`, `useMemo`.

### 10. Optional Chaining
**Rule**: Always use `?.` on objects that could be null/undefined/API data.
**Search**: Direct property access on variables from API responses, Redux state, or optional props without `?.`.

### 11. cn() for Class Merging
**Rule**: Use `cn()` from `@/lib/utils` for conditional Tailwind classes.
**Search**: Template literals for className or string concatenation for classes.

### 12. Icon strokeWidth
**Rule**: All Lucide icons MUST have `strokeWidth={1.5}`.
**Search**: Lucide icon components without `strokeWidth` prop.

### 13. PUT not PATCH
**Rule**: Backend expects PUT for updates. Never use PATCH.
**Search**: `.patch(` in API service files.

### 14. Centralized Validation
**Rule**: ALL Zod schemas must be in `src/utils/validations/index.ts`.
**Search**: `z.object(` or `import { z }` in component/page files.

### 15. Typed Redux Hooks
**Rule**: Use `useAppSelector`/`useAppDispatch` from `@/store/hooks`. Never raw `useSelector`/`useDispatch`.
**Search**: `useSelector` or `useDispatch` imported from `react-redux`.

### 16. useEffect Cleanup
**Rule**: Effects with timers, fetch calls, or subscriptions must return cleanup functions.
**Search**: `setTimeout`, `setInterval`, `fetch`, `addEventListener` inside `useEffect` without cleanup return.

### 17. Stable useEffect Dependencies
**Rule**: No non-memoized objects/arrays in `useEffect` dependency arrays.
**Search**: Object/array literals in useEffect dependency arrays like `[{ search, status }]`.

## Output Format

```
## Code Review Results

### Violations Found: {count}

1. **[Rule 3: Named Exports]** `src/pages/feature/page.tsx:15`
   - Found: `export default function FeaturePage()`
   - Fix: Change to `export function FeaturePage()`

2. **[Rule 6: Toast on Mutation]** `src/services/feature/feature.query.ts:25`
   - Found: `useMutation` without `toast.error` handler
   - Fix: Add `onError: (err) => { toast.error(getApiErrorMessage(err, 'Failed to ...')); }`

### No Violations: Rules 1, 2, 4, 5, 7-17
```

## How to Run

1. If user says "review this file" → review the specified file
2. If user says "review my changes" → run `git diff --name-only` and review changed files
3. If user says "review this PR" → run `git diff main...HEAD --name-only` and review all changed files
4. Always report a summary: total violations, violations by rule, clean rules
