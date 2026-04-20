import type { NextFunction, Request, Response } from 'express';
import { ERROR_TYPES } from '@constant/errorTypes.constant';
import { RES_TYPES } from '@constant/message.constant';
import { AppError } from '@utils/appError';
import { verifyToken } from '@utils/jwt';

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError({
      errorType: ERROR_TYPES.UNAUTHORIZED,
      message: RES_TYPES.UNAUTHORIZED,
      code: 'UNAUTHORIZED',
    });
  }
  try {
    const payload = verifyToken(authHeader.split(' ')[1]);
    req.user = { id: payload.sub, email: payload.email, role: payload.role as string };
    next();
  } catch {
    throw new AppError({
      errorType: ERROR_TYPES.UNAUTHORIZED,
      message: RES_TYPES.UNAUTHORIZED,
      code: 'INVALID_TOKEN',
    });
  }
};

export const authorizeByRole =
  (role: string) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user)
      throw new AppError({
        errorType: ERROR_TYPES.UNAUTHORIZED,
        message: RES_TYPES.UNAUTHORIZED,
        code: 'UNAUTHORIZED',
      });
    if (req.user.role !== role)
      throw new AppError({
        errorType: ERROR_TYPES.FORBIDDEN,
        message: RES_TYPES.FORBIDDEN,
        code: 'FORBIDDEN',
      });
    next();
  };

export const authorizeByAnyRole =
  (roles: string[]) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user)
      throw new AppError({
        errorType: ERROR_TYPES.UNAUTHORIZED,
        message: RES_TYPES.UNAUTHORIZED,
        code: 'UNAUTHORIZED',
      });
    if (!roles.includes(req.user.role))
      throw new AppError({
        errorType: ERROR_TYPES.FORBIDDEN,
        message: RES_TYPES.FORBIDDEN,
        code: 'FORBIDDEN',
      });
    next();
  };
