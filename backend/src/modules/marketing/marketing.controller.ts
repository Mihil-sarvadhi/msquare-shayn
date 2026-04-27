import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { handleApiResponse } from '@utils/handleResponse';
import * as repo from './marketing.repository';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function marketingKpisHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await repo.getMarketingKpis();
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function riskKpisHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await repo.getRiskKpis();
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function discountCodesListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = paginationSchema.parse(req.query);
    const result = await repo.listDiscountCodes(parsed);
    handleApiResponse(res, {
      data: result.rows,
      pagination: { page: parsed.page, limit: parsed.limit, total: result.total },
    });
  } catch (err) {
    next(err);
  }
}

export async function codePerformanceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const code = String(req.params.code ?? '');
    const data = await repo.getCodePerformance(code);
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function priceRulesListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = paginationSchema.parse(req.query);
    const result = await repo.listPriceRules(parsed);
    handleApiResponse(res, {
      data: result.rows,
      pagination: { page: parsed.page, limit: parsed.limit, total: result.total },
    });
  } catch (err) {
    next(err);
  }
}

export async function giftCardsListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = paginationSchema.parse(req.query);
    const result = await repo.listGiftCards(parsed);
    handleApiResponse(res, {
      data: result.rows,
      pagination: { page: parsed.page, limit: parsed.limit, total: result.total },
    });
  } catch (err) {
    next(err);
  }
}

export async function activeDisputesHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await repo.listActiveDisputes();
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function disputesListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = paginationSchema.extend({ status: z.string().optional() });
    const parsed = schema.parse(req.query);
    const result = await repo.listAllDisputes(parsed);
    handleApiResponse(res, {
      data: result.rows,
      pagination: { page: parsed.page, limit: parsed.limit, total: result.total },
    });
  } catch (err) {
    next(err);
  }
}
