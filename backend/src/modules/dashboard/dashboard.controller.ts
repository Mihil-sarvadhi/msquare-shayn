import { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import * as service from './dashboard.service';
import type { AllReviewsQuery } from './dashboard.types';
import type { DateRangeQuery } from '@utils/resolveDateRange';

function resolve(req: Request) {
  return service.resolveDateRange(req.query as DateRangeQuery);
}

function errOpts(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { statusCode: 500, message, error: err };
}

export async function kpisHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getKpis(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function revenueTrendHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getRevenueTrend(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function metaFunnelHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getMetaFunnel(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function campaignsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getCampaigns(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function topProductsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getTopProducts(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function logisticsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getLogistics(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function abandonedCartsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getAbandonedCarts(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function reviewsSummaryHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getReviewsSummary(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function reviewsTrendHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getReviewsTrend(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function topRatedProductsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getTopRatedProducts(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function recentReviewsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getRecentReviews(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function allReviewsHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getAllReviews(req.query as AllReviewsQuery) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function recentOrdersHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getRecentOrders() });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function revenueVsSpendHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getRevenueVsSpend(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
