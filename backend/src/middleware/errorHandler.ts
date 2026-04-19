import type { ErrorRequestHandler } from 'express';
import { ERROR_TYPES, type ErrorType } from '@constant/errorTypes.constant';
import { RES_TYPES } from '@constant/message.constant';
import { handleErrorResponse } from '@utils/handleResponse';
import { logger } from '@logger/logger';
import { AppError } from '@utils/appError';

const mapErrorTypeToStatus = (errorType: ErrorType): number => {
  switch (errorType) {
    case ERROR_TYPES.NOT_FOUND: return 404;
    case ERROR_TYPES.FORBIDDEN: return 403;
    case ERROR_TYPES.INVALID_REQUEST:
    case ERROR_TYPES.VALIDATION_ERROR: return 400;
    case ERROR_TYPES.CONFLICT: return 409;
    case ERROR_TYPES.UNAUTHORIZED: return 401;
    default: return 500;
  }
};

export const ErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let message: string = RES_TYPES.INTERNAL_SERVER_ERROR;
  let code: string | undefined;
  let errorPayload: unknown;

  if (err instanceof AppError) {
    statusCode = mapErrorTypeToStatus(err.errorType);
    message = err.message || message;
    code = err.code;
    errorPayload = err.details;
  } else {
    message = err?.message || RES_TYPES.INTERNAL_SERVER_ERROR;
    errorPayload = err;
  }

  logger.error(JSON.stringify({ message, code, error: errorPayload }));
  return handleErrorResponse(res, { statusCode, message, code, error: errorPayload });
};

export const GlobalErrorHandler = () => {
  process.on('uncaughtException', (error) => { logger.error(`Uncaught exception: ${error.message}`); process.exit(1); });
  process.on('unhandledRejection', (reason) => { logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.message : JSON.stringify(reason)}`); });
  process.on('SIGTERM', () => { logger.info('Received SIGTERM, shutting down.'); process.exit(0); });
  process.on('SIGINT', () => { logger.info('Received SIGINT, shutting down.'); process.exit(0); });
};
