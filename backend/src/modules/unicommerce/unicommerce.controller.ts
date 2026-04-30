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

export async function inventorySummaryHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getInventorySummary() });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function fastMovingSkusHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getFastMovingSkus(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function zeroOrderSkusHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getZeroOrderSkus(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function todaySnapshotHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getTodaySnapshot() });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function channelReturnsHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getChannelReturns(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function topCategoriesHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getTopCategories(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function topProductsByChannelHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getTopProductsByChannel(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function topProductsWithPctHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getTopProductsWithPct(query(req)) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
