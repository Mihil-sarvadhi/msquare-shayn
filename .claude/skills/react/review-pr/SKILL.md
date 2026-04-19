---
name: review-pr
description: Comprehensive PR code review — checks CLAUDE.md compliance, cross-file completeness, design consistency, security, component maintainability, performance, accessibility, error handling, and code duplication across all changed files in a PR or branch
allowed tools: Read, Grep, Glob, Bash
---

# Comprehensive PR Review

Read-only review skill. Uses Bash only for `git diff`, `git log`, `gh pr diff`. Never modifies files.

## Step 1: Determine Changed Files

Detect input method from user prompt:

| User Says | Command |
|-----------|---------|
| "review PR #42" | `gh pr diff 42 --name-only` |
| "review my branch" | `git diff main...HEAD --name-only` |
| "review my changes" | `git diff --name-only` + `git diff --cached --name-only` |

Store the list of changed files. Read each changed file's full content before running checks.

Also run `git diff` (or `gh pr diff`) to see the actual diff — this helps identify what specifically changed vs. pre-existing code.

---

## Step 2: Run All 9 Check Categories

### Category 1: CLAUDE.md Rule Compliance (17 Rules)

Apply these checks to ALL changed `.ts` and `.tsx` files:

#### Rule 1: Type-Only Imports (CRITICAL)
**Search**: Imports from `@/types/` without `type` keyword.
**Fix**: Change to `import type { X }` or `import { value, type X }`.

#### Rule 2: Path Aliases (HIGH)
**Search**: Relative imports with `../` in non-index files.
**Fix**: Replace with `@/` path alias.

#### Rule 3: Named Exports Only (HIGH)
**Search**: `export default` in non-slice files.
**Fix**: Change to named export.

#### Rule 4: No console.log (LOW)
**Search**: `console.log`, `console.info`, `console.debug`.
**Fix**: Use `logger` from `@/lib/logger`.

#### Rule 5: No Hardcoded Status Names (HIGH)
**Search**: String comparisons with status display names.
**Fix**: Use master data codes + `getStatusStyle()` from `@/utils/status-styles`.

#### Rule 6: Toast on Every Mutation (HIGH)
**Search**: `useMutation` without corresponding `toast.success` and `toast.error`.
**Fix**: Add toast notifications on success and error.

#### Rule 7: useCallback on Prop Handlers (MEDIUM)
**Search**: Functions passed as `on*` props without `useCallback`.
**Fix**: Wrap handler in `useCallback`.

#### Rule 8: No Array Index Keys (MEDIUM)
**Search**: `key={index}`, `key={i}`, `key={idx}`.
**Fix**: Use unique, stable ID.

#### Rule 9: Hooks Before Returns (CRITICAL)
**Search**: `return` statements before hook calls.
**Fix**: Move all hooks above conditional returns.

#### Rule 10: Optional Chaining (MEDIUM)
**Search**: Direct property access on nullable values.
**Fix**: Use `?.` for safe access.

#### Rule 11: cn() for Class Merging (LOW)
**Search**: Template literals or string concatenation for className.
**Fix**: Use `cn()` from `@/lib/utils`.

#### Rule 12: Icon strokeWidth (LOW)
**Search**: Lucide icons without `strokeWidth={1.5}`.
**Fix**: Add `strokeWidth={1.5}` prop.

#### Rule 13: PUT not PATCH (CRITICAL)
**Search**: `.patch(` in API service files.
**Fix**: Change to `.put(`.

#### Rule 14: Centralized Validation (HIGH)
**Search**: `z.object(` in files outside `utils/validations/`.
**Fix**: Move schema to `src/utils/validations/index.ts`.

#### Rule 15: Typed Redux Hooks (HIGH)
**Search**: `useSelector`/`useDispatch` from `react-redux`.
**Fix**: Use `useAppSelector`/`useAppDispatch` from `@/store/hooks`.

#### Rule 16: useEffect Cleanup (MEDIUM)
**Search**: `setTimeout`/`setInterval`/`addEventListener` in useEffect without cleanup.
**Fix**: Return cleanup function.

#### Rule 17: Stable useEffect Dependencies (MEDIUM)
**Search**: Object/array literals in dependency arrays.
**Fix**: Extract primitives or use `useMemo`.

---

### Category 2: Cross-File Completeness

| If PR adds... | Check for... | Severity |
|---------------|-------------|----------|
| `src/store/slices/*Slice.ts` (new) | Import + registration in `src/store/rootReducer.ts` | CRITICAL |
| `src/services/*/xxx.api.ts` (new) | Endpoint constant in `src/utils/constants/api.constant.ts` | CRITICAL |
| `src/pages/*/page.tsx` (new) | Route entry in `src/routes/route.tsx` | CRITICAL |
| `src/services/*/xxx.query.ts` (new) | Keys in `src/services/react-query/queryKeys.ts` | HIGH |
| `src/contexts/*Context.tsx` (new) | Provider wrapped in AppShell or parent | HIGH |
| `z.object(` usage in components | Schema must exist in `src/utils/validations/index.ts` | HIGH |
| New `src/types/*.ts` file | snake_case for API types | MEDIUM |

---

### Category 3: Design Consistency

Only check `.tsx` files that render JSX:

| Check | What to Look For | Severity |
|-------|-----------------|----------|
| Hardcoded colors | Hex values in className or style | MEDIUM |
| Status color styling | Manual colors instead of `getStatusStyle()` | HIGH |
| Page wrapper spacing | Should use `p-5` | LOW |
| Page title typography | Should be `text-lg font-semibold` | LOW |
| Missing shared components | Custom loader instead of `<PageLoader />` | MEDIUM |
| Missing shared components | Custom empty state instead of `<EmptyState />` | MEDIUM |
| Delete confirmation | Using `Dialog` instead of `AlertDialog` for destructive actions | MEDIUM |

---

### Category 4: Security

| Check | Pattern | Severity |
|-------|---------|----------|
| Exposed secrets | `API_KEY`, `SECRET`, `PASSWORD`, `TOKEN` as string literals | CRITICAL |
| Unsafe HTML | `dangerouslySetInnerHTML` without sanitization | HIGH |
| Type suppression | `@ts-ignore` or `@ts-expect-error` | MEDIUM |
| `any` type | `: any` or `as any` in new code | MEDIUM |
| Sensitive localStorage | `localStorage.setItem` with sensitive data outside auth module | MEDIUM |

---

### Category 5: Component Design & Maintainability

| Check | Threshold | Severity |
|-------|-----------|---------|
| File too large | `.tsx` file over 500 lines | HIGH |
| Single component too large | Function body over 300 lines | MEDIUM |
| Too many props | Props interface with 8+ props | MEDIUM |
| Nested ternaries | 3+ levels deep | MEDIUM |
| Business logic in JSX | Non-trivial transforms inline in return | LOW |

---

### Category 6: Performance

| Check | Pattern | Severity |
|-------|---------|---------|
| Inline object/array props | `<Comp style={{ }} />` | MEDIUM |
| Missing React.memo on list items | Component in `.map()` without memo | MEDIUM |
| New page not code-split | New page not imported via `React.lazy()` | MEDIUM |

---

### Category 7: Accessibility (a11y)

| Check | Pattern | Severity |
|-------|---------|---------|
| Icon-only button without aria-label | Button with only icon, no text or aria-label | HIGH |
| Non-semantic click handler | `<div onClick>` or `<span onClick>` | HIGH |
| Missing `type="button"` in forms | Button in form without explicit type | HIGH |
| `<img>` without `alt` | Image without alt attribute | MEDIUM |

---

### Category 8: Error Handling Quality

| Check | Pattern | Severity |
|-------|---------|---------|
| Empty catch block | `catch { }` with no body | HIGH |
| Missing error UI state | useQuery without isError handling | MEDIUM |
| Error boundary missing | New page not wrapped in ErrorBoundary | MEDIUM |
| Promise without catch | Unawaited `.then()` chain without `.catch()` | MEDIUM |

---

### Category 9: Code Duplication

| What to Check | Severity |
|--------------|---------|
| Same function name in 2+ files | HIGH |
| Formatter/helper duplicated instead of using `@/utils/common-functions` | HIGH |
| Near-duplicate UI components for same entity | MEDIUM |
| Custom empty state instead of `<EmptyState />` | MEDIUM |
| Custom loader instead of `<PageLoader />` | MEDIUM |
| 8+ identical lines between files | MEDIUM |

**Known canonical utilities — check before flagging:**
- `getApiErrorMessage` → `src/utils/common-functions/index.ts`

---

## Step 3: Generate Report

```markdown
## PR Review Report

### Summary
- **Files reviewed**: {count}
- **Violations found**: {total} ({critical} critical, {high} high, {medium} medium, {low} low)
- **Verdict**: {verdict_emoji} {VERDICT}

---

### Critical Issues (must fix before merge)

1. **[{Category}: {Rule Name}]** `{file_path}:{line_number}`
   - Found: `{code snippet}`
   - Fix: {suggested fix}

### High Issues (should fix)
{same format}

### Medium Issues (recommended)
{same format}

### Low Issues (optional)
{same format}

---

### Score Card

| Category | Score |
|----------|-------|
| CLAUDE.md Compliance | {pass}/{total} rules pass |
| Cross-File Completeness | {pass}/{total} checks pass |
| Design Consistency | {count} issue(s) |
| Security | Clean / {count} issue(s) |
| Component Design | {count} issue(s) |
| Performance | {count} issue(s) |
| Accessibility | {count} issue(s) |
| Error Handling | {count} issue(s) |
| Code Duplication | {count} alert(s) |

### Verdict: {verdict_emoji} {VERDICT}
{one-line summary}
```

### Verdict Logic

| Verdict | Condition |
|---------|-----------|
| APPROVE | 0 critical AND 0 high |
| REQUEST_CHANGES | Any critical OR >= 3 high |
| NEEDS_DISCUSSION | 1-2 high, OR duplication alerts |

---

## Step 4: GitHub Integration (Optional)

Only if user explicitly asks to post the review to GitHub:

```bash
gh pr comment {number} --body "{review_content}"
```

**Default behavior**: Output review locally. Never post to GitHub unless asked.

## Checklist

- [ ] All changed files identified and read
- [ ] All 17 CLAUDE.md rules checked
- [ ] Cross-file completeness verified
- [ ] Design consistency checked on UI files
- [ ] Security patterns checked
- [ ] Component size and design checked
- [ ] Performance patterns checked
- [ ] Accessibility checked
- [ ] Error handling quality checked
- [ ] Code duplication scan completed
- [ ] Report generated with Score Card
- [ ] Verdict determined based on severity counts
- [ ] Only violations in NEW/CHANGED code reported
