import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { handleApiResponse } from '@utils/handleResponse';
import { AppError } from '@utils/appError';
import { ERROR_TYPES } from '@constant';
import * as service from './finance.service';

const dateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid date' });

const rangeSchema = z.object({
  from: dateString,
  to: dateString,
});

const breakdownSchema = rangeSchema.extend({
  group_by: z.enum(['day', 'week', 'month']).default('day'),
});

const paginatedSchema = rangeSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const refundsListSchema = paginatedSchema.extend({
  reason: z.string().optional(),
});

const txListSchema = paginatedSchema.extend({
  gateway: z.string().optional(),
  kind: z.string().optional(),
});

const payoutsListSchema = paginatedSchema.extend({
  status: z.string().optional(),
});

function parseRange(q: unknown): { from: Date; to: Date } {
  const parsed = rangeSchema.parse(q);
  return { from: new Date(parsed.from), to: new Date(parsed.to) };
}

export async function kpisHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const range = parseRange(req.query);
    const data = await service.getKpis(range.from, range.to);
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function revenueBreakdownHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = breakdownSchema.parse(req.query);
    const data = await service.getRevenueBreakdown(
      new Date(parsed.from),
      new Date(parsed.to),
      parsed.group_by,
    );
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function paymentMethodSplitHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const range = parseRange(req.query);
    const data = await service.getPaymentMethodSplit(range.from, range.to);
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function payoutsListHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = payoutsListSchema.parse(req.query);
    const result = await service.listPayouts({
      from: new Date(parsed.from),
      to: new Date(parsed.to),
      page: parsed.page,
      limit: parsed.limit,
      status: parsed.status,
    });
    handleApiResponse(res, {
      data: result.rows,
      pagination: { page: parsed.page, limit: parsed.limit, total: result.total },
    });
  } catch (err) {
    next(err);
  }
}

export async function payoutDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      throw new AppError({
        errorType: ERROR_TYPES.INVALID_REQUEST,
        message: 'Invalid payout id',
        code: 'INVALID_ID',
      });
    }
    const data = await service.getPayoutDetail(id);
    if (!data) {
      throw new AppError({
        errorType: ERROR_TYPES.NOT_FOUND,
        message: 'Payout not found',
        code: 'NOT_FOUND',
      });
    }
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function refundsListHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = refundsListSchema.parse(req.query);
    const result = await service.listRefunds({
      from: new Date(parsed.from),
      to: new Date(parsed.to),
      page: parsed.page,
      limit: parsed.limit,
      reason: parsed.reason,
    });
    handleApiResponse(res, {
      data: result.rows,
      pagination: { page: parsed.page, limit: parsed.limit, total: result.total },
    });
  } catch (err) {
    next(err);
  }
}

export async function refundsSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const range = parseRange(req.query);
    const data = await service.getRefundsSummary(range.from, range.to);
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function salesBreakdownHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const schema = rangeSchema.extend({
      mode: z.enum(['computed', 'shopify_native']).default('computed'),
    });
    const parsed = schema.parse(req.query);
    const data = await service.getSalesBreakdown(
      new Date(parsed.from),
      new Date(parsed.to),
      parsed.mode,
    );
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function transactionsListHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = txListSchema.parse(req.query);
    const result = await service.listTransactions({
      from: new Date(parsed.from),
      to: new Date(parsed.to),
      page: parsed.page,
      limit: parsed.limit,
      gateway: parsed.gateway,
      kind: parsed.kind,
    });
    handleApiResponse(res, {
      data: result.rows,
      pagination: { page: parsed.page, limit: parsed.limit, total: result.total },
    });
  } catch (err) {
    next(err);
  }
}
