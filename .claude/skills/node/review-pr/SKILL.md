---
name: review-pr
description: Comprehensive PR code review for backend — checks node.md compliance, architecture layers, raw SQL reads, error handling, security, cross-file completeness, performance, and code duplication across all changed files
allowed tools: Read, Grep, Glob, Bash
---

# Comprehensive PR Review — Node.js Backend

Read-only review skill. Uses Bash only for `git diff`, `git log`, `gh pr diff`. Never modifies files.

## Step 1: Determine Changed Files

Detect input method from user prompt:

| User Says | Command |
|-----------|---------|
| "review PR #42" | `gh pr diff 42 --name-only` |
| "review my branch" | `git diff main...HEAD --name-only` |
| "review my changes" | `git diff --name-only` + `git diff --cached --name-only` |

Filter to backend files only (`backend/src/**`). Read each changed file's full content before running checks.

Also run `git diff` to see the actual diff — identify what specifically changed vs. pre-existing code.

---

## Step 2: Run All 7 Check Categories

### Category 1: Node.md Rule Compliance (15 Rules)

Apply these checks to ALL changed `.ts` files in `backend/src/`:

#### Rule 1: Architecture Layers (CRITICAL)
**Search**: Controllers importing repository. Services importing Prisma directly.

#### Rule 2: Raw SQL for Reads (CRITICAL)
**Search**: `findMany`, `findUnique`, `findFirst` in repository files.

#### Rule 3: AppError Only (HIGH)
**Search**: `throw new Error(` in service/controller files.

#### Rule 4: Constants Usage (HIGH)
**Search**: Hardcoded status codes, hardcoded response messages.

#### Rule 5: handleApiResponse (HIGH)
**Search**: `res.json(`, `res.send(`, `res.status(` in controllers.

#### Rule 6: import type (HIGH)
**Search**: Type imports without `type` keyword.

#### Rule 7: Path Aliases (HIGH)
**Search**: Relative imports crossing module boundaries.

#### Rule 8: Validation via Middleware (HIGH)
**Search**: Manual validation in controllers. Zod schemas in controllers.

#### Rule 9: PUT not PATCH (CRITICAL)
**Search**: `.patch(` or `router.patch(` in routes.

#### Rule 10: No console.log (MEDIUM)
**Search**: `console.log/error/warn/info` in app code.

#### Rule 11: Route Handler Pattern (HIGH)
**Search**: Missing `.catch(next)` wrapper on async controllers.

#### Rule 12: Auth Middleware (HIGH)
**Search**: Routes without `authenticate` (unless public).

#### Rule 13: Middleware Order (MEDIUM)
**Search**: Wrong middleware order on routes.

#### Rule 14: Pagination (MEDIUM)
**Search**: List queries without LIMIT/OFFSET. Missing pagination in responses.

#### Rule 15: Required String Validation (MEDIUM)
**Search**: `z.string()` without `.min(1,` on required fields.

---

### Category 2: Cross-File Completeness

| If PR adds... | Check for... | Severity |
|---------------|-------------|----------|
| `src/modules/{mod}/{mod}.routes.ts` (new) | Route registered in `src/routes/index.ts` | CRITICAL |
| `src/modules/{mod}/` (new module) | Constants in `message.constant.ts` + `endPoints.constant.ts` | CRITICAL |
| New Prisma model | Migration file exists | CRITICAL |
| `src/modules/{mod}/{mod}.types.ts` (new) | All 4 schemas: create, update, idParam, listQuery | HIGH |
| New module | All 5 files: types, repository, service, controller, routes | HIGH |
| New endpoint constant | Matching route registration | HIGH |

---

### Category 3: Security

| Check | Pattern | Severity |
|-------|---------|----------|
| Exposed secrets | `API_KEY`, `SECRET`, `PASSWORD`, `TOKEN` as string literals | CRITICAL |
| SQL injection | String concatenation in SQL queries instead of parameterized | CRITICAL |
| Missing auth | New routes without `authenticate` middleware | HIGH |
| Missing role guard | Protected routes without `authorizeByAnyRole` | HIGH |
| Type suppression | `@ts-ignore` or `@ts-expect-error` | MEDIUM |
| `any` type | `: any` or `as any` in new code | MEDIUM |
| Raw error exposure | Error stacks sent in responses | MEDIUM |

---

### Category 4: Error Handling Quality

| Check | Pattern | Severity |
|-------|---------|----------|
| Empty catch block | `catch { }` with no body | HIGH |
| Raw Error thrown | `throw new Error(` instead of `AppError` | HIGH |
| Missing existence check | Update/delete without checking entity exists first | HIGH |
| Hardcoded error message | String literals instead of `RES_TYPES` constants | MEDIUM |
| Missing error code | `AppError` without `code` field | MEDIUM |

---

### Category 5: Performance

| Check | Pattern | Severity |
|-------|---------|----------|
| N+1 queries | Loop with DB query inside | HIGH |
| Missing pagination | List endpoint without LIMIT/OFFSET | HIGH |
| SELECT * | `SELECT *` in raw SQL queries | MEDIUM |
| Missing index | Foreign key without `@@index` in Prisma schema | MEDIUM |
| Unnecessary DB calls | Multiple queries that could be one | MEDIUM |

---

### Category 6: Code Duplication

| What to Check | Severity |
|--------------|---------|
| Same SQL query in 2+ repositories | HIGH |
| Duplicated business logic across services | HIGH |
| Same validation pattern that could share a schema | MEDIUM |
| Duplicated error handling blocks | MEDIUM |
| Helper that should be in `src/utils/` | MEDIUM |

---

### Category 7: Module Structure

| Check | Pattern | Severity |
|-------|---------|----------|
| File naming | `{module}.{layer}.ts` convention | HIGH |
| Module directory | All files in `src/modules/{module}/` | HIGH |
| Layer separation | Business logic in controller or repository | HIGH |
| Direct Prisma in service | Service importing from `@db/prisma` | HIGH |
| Missing layer | Module missing one of the 5 required files | MEDIUM |

---

## Step 3: Generate Report

```markdown
## PR Review Report — Backend

### Summary
- **Files reviewed**: {count}
- **Violations found**: {total} ({critical} critical, {high} high, {medium} medium)
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

---

### Score Card

| Category | Score |
|----------|-------|
| Node.md Compliance | {pass}/{total} rules pass |
| Cross-File Completeness | {pass}/{total} checks pass |
| Security | Clean / {count} issue(s) |
| Error Handling | {count} issue(s) |
| Performance | {count} issue(s) |
| Code Duplication | {count} alert(s) |
| Module Structure | {count} issue(s) |

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

- [ ] All changed backend files identified and read
- [ ] All 15 node.md rules checked
- [ ] Cross-file completeness verified
- [ ] Security patterns checked
- [ ] Error handling quality checked
- [ ] Performance patterns checked
- [ ] Code duplication scan completed
- [ ] Module structure verified
- [ ] Report generated with Score Card
- [ ] Verdict determined based on severity counts
- [ ] Only violations in NEW/CHANGED code reported
