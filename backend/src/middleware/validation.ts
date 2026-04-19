import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '@utils/appError';
import { ERROR_TYPES } from '@constant/errorTypes.constant';
import { RES_TYPES } from '@constant/message.constant';

export interface ValidationSchemas { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema; }

export const validateRequest =
  (schemas: ValidationSchemas) => (req: Request, _res: Response, next: NextFunction) => {
    const errors: Record<string, unknown> = {};
    if (schemas.body) {
      const r = schemas.body.safeParse(req.body);
      if (!r.success) errors.body = r.error.flatten(); else req.body = r.data;
    }
    if (schemas.query) {
      const r = schemas.query.safeParse(req.query);
      if (!r.success) errors.query = r.error.flatten(); else req.query = r.data;
    }
    if (schemas.params) {
      const r = schemas.params.safeParse(req.params);
      if (!r.success) errors.params = r.error.flatten(); else req.params = r.data;
    }
    if (Object.keys(errors).length > 0) {
      throw new AppError({ errorType: ERROR_TYPES.VALIDATION_ERROR, message: RES_TYPES.VALIDATION_FAILED, details: errors, code: 'VALIDATION_ERROR' });
    }
    next();
  };
