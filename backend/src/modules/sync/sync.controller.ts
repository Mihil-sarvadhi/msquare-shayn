import { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import { syncShopifyOrders } from '@modules/shopify/shopify.sync';
import { syncMetaInsights } from '@modules/meta/meta.sync';
import { syncIthinkShipments, syncDailyRemittance } from '@modules/ithink/ithink.sync';
import { syncJudgeMe } from '@modules/judgeme/judgeme.sync';

function errOpts(err: unknown) {
  return { statusCode: 500, message: (err as Error).message, error: err };
}

export async function syncShopifyHandler(_req: Request, res: Response): Promise<void> {
  try {
    await syncShopifyOrders();
    handleApiResponse(res, { data: { message: 'Shopify sync triggered' } });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function syncMetaHandler(_req: Request, res: Response): Promise<void> {
  try {
    await syncMetaInsights();
    handleApiResponse(res, { data: { message: 'Meta sync triggered' } });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function syncIthinkHandler(_req: Request, res: Response): Promise<void> {
  try {
    await syncIthinkShipments();
    await syncDailyRemittance();
    handleApiResponse(res, { data: { message: 'iThink sync triggered' } });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function syncJudgeMeHandler(_req: Request, res: Response): Promise<void> {
  try {
    await syncJudgeMe();
    handleApiResponse(res, { data: { message: 'Judge.me sync triggered' } });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}
