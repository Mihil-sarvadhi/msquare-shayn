import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { handleApiResponse } from '@utils/handleResponse';
import { AppError } from '@utils/appError';
import { ERROR_TYPES } from '@constant';
import * as service from './catalog.service';

const dateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid date' });

const rangeSchema = z.object({ from: dateString, to: dateString });

const productsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.string().optional(),
  product_type: z.string().optional(),
  vendor: z.string().optional(),
  search: z.string().optional(),
});

const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  threshold: z.coerce.number().int().min(0).optional(),
  search: z.string().optional(),
});

export async function kpisHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getCatalogKpis();
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function productsListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = productsQuerySchema.parse(req.query);
    const result = await service.listProducts({
      page: parsed.page,
      limit: parsed.limit,
      status: parsed.status,
      productType: parsed.product_type,
      vendor: parsed.vendor,
      search: parsed.search,
    });
    handleApiResponse(res, {
      data: result.rows,
      pagination: { page: parsed.page, limit: parsed.limit, total: result.total },
    });
  } catch (err) {
    next(err);
  }
}

export async function productDetailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      throw new AppError({
        errorType: ERROR_TYPES.INVALID_REQUEST,
        message: 'Invalid product id',
        code: 'INVALID_ID',
      });
    }
    const data = await service.getProductDetail(id);
    if (!data) {
      throw new AppError({
        errorType: ERROR_TYPES.NOT_FOUND,
        message: 'Product not found',
        code: 'NOT_FOUND',
      });
    }
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function bestSellersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = rangeSchema.parse(req.query);
    const data = await service.getBestSellers(new Date(parsed.from), new Date(parsed.to));
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function slowMoversHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = rangeSchema.extend({
      days_inactive: z.coerce.number().int().min(1).default(30),
    });
    const parsed = schema.parse(req.query);
    const data = await service.getSlowMovers(
      new Date(parsed.from),
      new Date(parsed.to),
      parsed.days_inactive,
    );
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function inventoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = inventoryQuerySchema.parse(req.query);
    const result = await service.listInventory(parsed);
    handleApiResponse(res, {
      data: result.rows,
      pagination: { page: parsed.page, limit: parsed.limit, total: result.total },
    });
  } catch (err) {
    next(err);
  }
}

export async function stockoutsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ threshold: z.coerce.number().int().min(0).default(0) });
    const { threshold } = schema.parse(req.query);
    const data = await service.getStockouts(threshold);
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function marginHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getMargin();
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}

export async function locationsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getLocations();
    handleApiResponse(res, { data });
  } catch (err) {
    next(err);
  }
}
