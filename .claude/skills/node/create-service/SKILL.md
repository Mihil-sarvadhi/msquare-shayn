---
name: create-service
description: Create a service file with business logic, AppError handling, and proper layer separation calling repository functions for a backend module
allowed tools: Read, Grep, Glob, Write, Edit
---

# Create Module Service

## Reference File

Read `src/modules/user/user.service.ts` as the canonical example before generating.

## Template

Create `src/modules/{module}/{module}.service.ts`:

```typescript
import { ERROR_TYPES } from '@constant/errorTypes.constant';
import { RES_TYPES } from '@constant/message.constant';
import { AppError } from '@utils/appError';
import type { Create{Module}Dto, {Module}DTO, Update{Module}Dto } from './{module}.types';
import {
  create{Module},
  delete{Module},
  findAll{Module}s,
  find{Module}ById,
  update{Module},
} from './{module}.repository';

export interface List{Module}sServiceParams {
  page: number;
  limit: number;
  search?: string;
}

export interface List{Module}sServiceResult {
  {module}s: {Module}DTO[];
  total: number;
  page: number;
  limit: number;
}

export const create{Module}Service = async (
  dto: Create{Module}Dto,
): Promise<{Module}DTO> => {
  // Add uniqueness checks if needed:
  // const existing = await find{Module}ByField(dto.field);
  // if (existing) {
  //   throw new AppError({
  //     errorType: ERROR_TYPES.CONFLICT,
  //     message: RES_TYPES.CONFLICT,
  //     code: '{MODULE}_ALREADY_EXISTS',
  //   });
  // }

  const {module} = await create{Module}({
    name: dto.name,
    description: dto.description,
  });

  return {module};
};

export const get{Module}ByIdService = async (id: number): Promise<{Module}DTO> => {
  const {module} = await find{Module}ById(id);

  if (!{module}) {
    throw new AppError({
      errorType: ERROR_TYPES.NOT_FOUND,
      message: RES_TYPES.RESOURCE_NOT_FOUND,
      code: '{MODULE}_NOT_FOUND',
    });
  }

  return {module};
};

export const list{Module}sService = async (
  params: List{Module}sServiceParams,
): Promise<List{Module}sServiceResult> => {
  const result = await findAll{Module}s(params);

  return {
    {module}s: result.{module}s,
    total: result.total,
    page: params.page,
    limit: params.limit,
  };
};

export const update{Module}Service = async (
  id: number,
  dto: Update{Module}Dto,
): Promise<{Module}DTO> => {
  const existing = await find{Module}ById(id);

  if (!existing) {
    throw new AppError({
      errorType: ERROR_TYPES.NOT_FOUND,
      message: RES_TYPES.RESOURCE_NOT_FOUND,
      code: '{MODULE}_NOT_FOUND',
    });
  }

  const updated = await update{Module}(id, {
    name: dto.name,
    description: dto.description,
  });

  if (!updated) {
    throw new AppError({
      errorType: ERROR_TYPES.UNKNOWN_ERROR,
      message: RES_TYPES.INTERNAL_SERVER_ERROR,
      code: '{MODULE}_UPDATE_FAILED',
    });
  }

  return updated;
};

export const delete{Module}Service = async (id: number): Promise<void> => {
  const existing = await find{Module}ById(id);

  if (!existing) {
    throw new AppError({
      errorType: ERROR_TYPES.NOT_FOUND,
      message: RES_TYPES.RESOURCE_NOT_FOUND,
      code: '{MODULE}_NOT_FOUND',
    });
  }

  await delete{Module}(id);
};
```

## Critical Rules

1. **Only throw `AppError`** — NEVER raw `Error`
2. **`AppError` shape**: `{ errorType, message, code }` matching `src/utils/appError.ts`
3. **`errorType`** uses `ERROR_TYPES` constants — never hardcoded
4. **`message`** uses `RES_TYPES` constants — never hardcoded
5. **`code`** is unique machine-readable: `{MODULE}_NOT_FOUND`, `{MODULE}_ALREADY_EXISTS`
6. **Service ONLY calls Repository** — never direct Prisma access
7. **Always verify entity exists** before update/delete
8. **Business rules** (uniqueness, permissions) live HERE — not in controller or repository
9. **`import type`** for type-only imports

## Checklist

- [ ] `create{Module}Service` with optional uniqueness check
- [ ] `get{Module}ByIdService` with NOT_FOUND error
- [ ] `list{Module}sService` with pagination passthrough
- [ ] `update{Module}Service` with existence check + update + null check
- [ ] `delete{Module}Service` with existence check
- [ ] Only `AppError` thrown — no raw `Error`
- [ ] All error types/messages from constants
- [ ] Service only calls repository — no direct Prisma
