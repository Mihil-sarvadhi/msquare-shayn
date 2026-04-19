---
name: create-middleware
description: Create a custom Express middleware following project patterns — typed, error-safe, using AppError and project constants
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Custom Middleware

## Reference Files

Read these as canonical examples before generating:
- `src/middleware/auth.ts` — authentication + role guard pattern
- `src/middleware/validation.ts` — request validation pattern
- `src/middleware/security.ts` — configuration-based middleware pattern

## Template — Request Middleware

Create `src/middleware/{name}.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';
import { ERROR_TYPES } from '@constant/errorTypes.constant';
import { RES_TYPES } from '@constant/message.constant';
import { AppError } from '@utils/appError';
import { logger } from '@logger/logger';

export const {middlewareName} = (/* config params if needed */) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Middleware logic here
      // Access req.user for authenticated user info
      // Access req.body, req.query, req.params for request data

      // On failure:
      // throw new AppError({
      //   errorType: ERROR_TYPES.FORBIDDEN,
      //   message: RES_TYPES.FORBIDDEN,
      //   code: 'MIDDLEWARE_CHECK_FAILED',
      // });

      next();
    } catch (error) {
      next(error);
    }
  };
};
```

## Template — Async Middleware

```typescript
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/appError';
import { ERROR_TYPES } from '@constant/errorTypes.constant';
import { RES_TYPES } from '@constant/message.constant';

export const {asyncMiddlewareName} = () => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Async middleware logic (DB lookups, external API calls)
      // const result = await someAsyncOperation();

      next();
    } catch (error) {
      next(error);
    }
  };
};
```

## Template — Response Middleware (runs after response)

```typescript
import type { Request, Response, NextFunction } from 'express';
import { logger } from '@logger/logger';

export const {responseMiddleware} = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.on('finish', () => {
    logger.info(`${res.statusCode} - ${req.method} ${req.originalUrl}`);
  });
  next();
};
```

## Critical Rules

1. **`import type`** for `Request`, `Response`, `NextFunction`
2. **Errors**: Only throw `AppError` with `ERROR_TYPES` + `RES_TYPES` constants
3. **Always call `next()`** on success, `next(error)` on failure
4. **Unused params**: prefix with `_` (e.g., `_res`, `_next`)
5. **Logging**: Use `logger` from `@logger/logger` — never `console.log`
6. **Factory pattern**: Return middleware function from outer function for configuration
7. **Register**: Add to `src/middleware/index.ts` barrel export if reused across modules

## Registration

After creating, export from `src/middleware/index.ts`:
```typescript
export { {middlewareName} } from './{name}';
```

Then use in routes:
```typescript
import { {middlewareName} } from '@middleware';

router.get('/', authenticate, {middlewareName}(), controller);
```

## Checklist

- [ ] Middleware file created at `src/middleware/{name}.ts`
- [ ] Types imported with `import type`
- [ ] Errors use `AppError` with constants
- [ ] `next()` called on success, `next(error)` on failure
- [ ] Logging uses `logger` — no `console.log`
- [ ] Exported from `src/middleware/index.ts`
