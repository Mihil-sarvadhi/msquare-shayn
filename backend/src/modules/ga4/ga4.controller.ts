import { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import * as service from './ga4.service';
import type { DateRangeQuery } from '@utils/resolveDateRange';

function resolve(req: Request) {
  return service.resolveDateRange(req.query as DateRangeQuery);
}

function errOpts(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { statusCode: 500, message, error: err };
}

export async function overviewHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getTrafficDaily(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function channelsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getChannels(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function ecommerceHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getEcommerceDaily(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function productsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getProducts(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function devicesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getDevices(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function geographyHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getGeography(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function realtimeHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getRealtime() });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function summaryHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getSummary(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}
