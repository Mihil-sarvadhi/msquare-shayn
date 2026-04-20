import type { Response } from 'express';
import { RES_STATUS, RES_TYPES, type ResponseStatus } from '@constant/message.constant';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponseOptions<T> {
  statusCode?: number;
  responseType?: ResponseStatus;
  message?: string;
  data?: T;
  pagination?: PaginationMeta;
}

export interface ErrorResponseOptions {
  statusCode: number;
  message: string;
  code?: string;
  error?: unknown;
}

const getStatusCode = (responseType: ResponseStatus): number => {
  switch (responseType) {
    case RES_STATUS.CREATE:
      return 201;
    default:
      return 200;
  }
};

export const handleApiResponse = <T>(res: Response, options: ApiResponseOptions<T>) => {
  const { statusCode, responseType = RES_STATUS.GET, message, data, pagination } = options;
  const httpStatus = statusCode ?? getStatusCode(responseType);
  return res.status(httpStatus).json({
    success: true,
    statusCode: httpStatus,
    message: message ?? RES_TYPES.SUCCESS,
    data,
    pagination,
  });
};

export const handleErrorResponse = (res: Response, options: ErrorResponseOptions) => {
  const { statusCode, message, code, error } = options;
  return res.status(statusCode).json({ success: false, statusCode, message, code, error });
};
