import type { NextFunction, Request, Response } from 'express';
import { logger } from '@logger/logger';

export const responseHandler = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(
      `${res.statusCode} - ${req.method} ${req.originalUrl} - ${Date.now() - start}ms - ${req.ip}`,
    );
  });
  next();
};
