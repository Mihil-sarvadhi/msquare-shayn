---
name: create-constants
description: Add module-specific constants to message.constant.ts (RES_TYPES) and endPoints.constant.ts (END_POINTS) for a new backend module
allowed tools: Read, Grep, Glob, Edit
---

# Create Module Constants

## Reference Files

Read before editing:
- `src/constant/message.constant.ts` — existing `RES_TYPES` entries
- `src/constant/endPoints.constant.ts` — existing `END_POINTS` entries

## Step 1: Add Response Messages

Edit `src/constant/message.constant.ts` — add to `RES_TYPES` object:

```typescript
// ── {Module} ──
{MODULE}_CREATED: '{Module} created successfully.',
{MODULE}_UPDATED: '{Module} updated successfully.',
{MODULE}_DELETED: '{Module} deleted successfully.',
{MODULE}_FETCHED: '{Module} fetched successfully.',
{MODULE}S_FETCHED: '{Module}s fetched successfully.',
```

## Step 2: Add Endpoint Path

Edit `src/constant/endPoints.constant.ts` — add to `END_POINTS` object:

```typescript
{MODULE}: '/{module}s',
```

## Naming Convention

| Placeholder | Example (module = `project`) |
|-------------|------------------------------|
| `{module}` | `project` (lowercase) |
| `{Module}` | `Project` (PascalCase) |
| `{MODULE}` | `PROJECT` (UPPER_SNAKE_CASE) |
| `{module}s` | `projects` (plural lowercase) |

## Critical Rules

1. **Never hardcode strings** in controllers/services — always use constants
2. **RES_TYPES format**: `{MODULE}_CREATED`, `{MODULE}_UPDATED`, etc.
3. **Message format**: `'{Module} created successfully.'` — sentence with period
4. **END_POINTS format**: `{MODULE}: '/{module}s'` — plural, lowercase, leading slash
5. **Add section comment** (`// ── {Module} ──`) for grouping

## Checklist

- [ ] 5 `RES_TYPES` messages added (CREATED, UPDATED, DELETED, FETCHED, S_FETCHED)
- [ ] 1 `END_POINTS` entry added
- [ ] Section comment added for grouping
- [ ] Naming follows UPPER_SNAKE_CASE convention
- [ ] Messages end with period
