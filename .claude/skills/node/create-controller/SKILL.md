---
name: create-controller
description: Create a controller file with HTTP handlers using handleApiResponse, proper RES_STATUS/RES_TYPES constants, and pagination support for a backend module
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Module Controller

## Reference File

Read `src/modules/user/user.controller.ts` as the canonical example before generating.

## Template

Create `src/modules/{module}/{module}.controller.ts`:

```typescript
import type { Request, Response } from 'express';
import { RES_STATUS, RES_TYPES } from '@constant/message.constant';
import { handleApiResponse } from '@utils/handleResponse';
import {
  create{Module}Service,
  delete{Module}Service,
  get{Module}ByIdService,
  list{Module}sService,
  update{Module}Service,
} from './{module}.service';

export const create{Module}Controller = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {module} = await create{Module}Service(req.body);

  return handleApiResponse(res, {
    responseType: RES_STATUS.CREATE,
    message: RES_TYPES.{MODULE}_CREATED,
    data: {module},
  });
};

export const get{Module}ByIdController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {module}Id = Number(req.params.id);
  const {module} = await get{Module}ByIdService({module}Id);

  return handleApiResponse(res, {
    responseType: RES_STATUS.GET,
    message: RES_TYPES.{MODULE}_FETCHED,
    data: {module},
  });
};

export const list{Module}sController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { page, limit, search } = req.query as unknown as {
    page: number;
    limit: number;
    search?: string;
  };

  const result = await list{Module}sService({ page, limit, search });

  return handleApiResponse(res, {
    responseType: RES_STATUS.GET,
    message: RES_TYPES.{MODULE}S_FETCHED,
    data: result.{module}s,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
  });
};

export const update{Module}Controller = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {module}Id = Number(req.params.id);
  const {module} = await update{Module}Service({module}Id, req.body);

  return handleApiResponse(res, {
    responseType: RES_STATUS.UPDATE,
    message: RES_TYPES.{MODULE}_UPDATED,
    data: {module},
  });
};

export const delete{Module}Controller = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {module}Id = Number(req.params.id);
  await delete{Module}Service({module}Id);

  return handleApiResponse(res, {
    responseType: RES_STATUS.DELETE,
    message: RES_TYPES.{MODULE}_DELETED,
  });
};
```

## Critical Rules

1. **Controllers are HTTP-ONLY** — no business logic, no direct DB access
2. **`handleApiResponse`** for ALL responses — `{ responseType, message, data?, pagination? }`
3. **`responseType`** uses `RES_STATUS`: `CREATE` | `GET` | `UPDATE` | `DELETE`
4. **`message`** uses `RES_TYPES` constants — never hardcoded strings
5. **List endpoint** returns `pagination: { page, limit, total }`
6. **Errors propagate** to `ErrorHandler` middleware via route `.catch(next)` wrappers
7. **`import type`** for `Request` and `Response` from express
8. **Query params type assertion**: `req.query as unknown as { ... }` (already validated by middleware)

## Checklist

- [ ] `create{Module}Controller` returns `RES_STATUS.CREATE`
- [ ] `get{Module}ByIdController` returns `RES_STATUS.GET`
- [ ] `list{Module}sController` returns `RES_STATUS.GET` with pagination
- [ ] `update{Module}Controller` returns `RES_STATUS.UPDATE`
- [ ] `delete{Module}Controller` returns `RES_STATUS.DELETE`
- [ ] All use `handleApiResponse` — no direct `res.json()`
- [ ] All messages from `RES_TYPES` constants
- [ ] `import type` for Request/Response
