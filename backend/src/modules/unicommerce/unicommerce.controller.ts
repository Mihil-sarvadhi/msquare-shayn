import type { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import * as service from './unicommerce.service';
import type { UnicommerceQuery } from './unicommerce.service';

function query(req: Request): UnicommerceQuery {
  return req.query as UnicommerceQuery;
}

function errOpts(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { statusCode: 500, message, error: err };
}

export async function summaryHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getSummary(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function revenueTrendHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getRevenueTrend(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function topProductsHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getTopProducts(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function orderStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getOrderStatus(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function channelComparisonHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getChannelComparison(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function returnsHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getReturns(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function recentOrdersHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getRecentOrders(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
