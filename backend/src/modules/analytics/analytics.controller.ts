import type { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import * as service from './analytics.service';
import type { DateRangeQuery } from '@utils/resolveDateRange';

function resolve(req: Request) {
  return service.resolveDateRange(req.query as DateRangeQuery);
}
function errOpts(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { statusCode: 500, message, error: err };
}

export async function netRevenueHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getNetRevenue(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function rtoByStateHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getRtoByState(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function codVsPrepaidRtoHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getCodVsPrepaidRto(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function geoRevenueHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getGeoRevenue(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function logisticsCostsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getLogisticsCosts(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function codCashFlowHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getCodCashFlow(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function customerOverviewHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    const isAllTime = (req.query as DateRangeQuery).range === 'all';
    handleApiResponse(res, { data: await service.getCustomerOverview(since, until, isAllTime) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function customerSegmentsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getCustomerSegments(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function topCustomersHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getTopCustomers(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function discountAnalysisHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getDiscountAnalysis(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function marketingTrendHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getMarketingTrend(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function attributionGapHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getAttributionGap(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function topSkusHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getTopSkus(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function moneyStuckHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getMoneyStuck(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function channelRevenueHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getChannelRevenue(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function courierScorecardHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getCourierScorecard(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function slaByZoneHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getSlaByZone(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function creativeFatigueHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getCreativeFatigue(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function cohortRetentionHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getCohortRetention() });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
export async function returnReasonsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getReturnReasons(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
