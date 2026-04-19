import { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import {
  triggerShopifySync, triggerMetaSync,
  triggerIthinkSync, triggerJudgeMeSync,
} from './sync.service';

function errOpts(err: unknown) {
  return { statusCode: 500, message: (err as Error).message, error: err };
}

export async function syncShopifyHandler(_req: Request, res: Response): Promise<void> {
  try { handleApiResponse(res, { data: await triggerShopifySync() }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function syncMetaHandler(_req: Request, res: Response): Promise<void> {
  try { handleApiResponse(res, { data: await triggerMetaSync() }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function syncIthinkHandler(_req: Request, res: Response): Promise<void> {
  try { handleApiResponse(res, { data: await triggerIthinkSync() }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function syncJudgeMeHandler(_req: Request, res: Response): Promise<void> {
  try { handleApiResponse(res, { data: await triggerJudgeMeSync() }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
