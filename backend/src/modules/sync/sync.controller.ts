import type { Request, Response } from 'express';
import { handleErrorResponse } from '@utils/handleResponse';
import { logger } from '@logger/logger';
import {
  triggerShopifySync,
  triggerMetaSync,
  triggerIthinkSync,
  triggerIthinkBackfill,
  triggerJudgeMeSync,
  triggerGA4Sync,
  triggerGA4TokenRefresh,
  triggerAllSync,
} from './sync.service';

// All sync handlers respond 202 immediately and run in background to avoid client timeout.
// Shopify/Meta are fast enough to await but kept consistent for simplicity.

function fireAndForget(res: Response, name: string, fn: () => Promise<unknown>): void {
  res.status(202).json({ success: true, message: `${name} sync started` });
  fn().catch((err: Error) => logger.error(`[Sync:${name}] ${err.message}`));
}

export function syncShopifyHandler(_req: Request, res: Response): void {
  fireAndForget(res, 'shopify', triggerShopifySync);
}

export function syncMetaHandler(_req: Request, res: Response): void {
  fireAndForget(res, 'meta', triggerMetaSync);
}

export function syncIthinkHandler(_req: Request, res: Response): void {
  fireAndForget(res, 'ithink', triggerIthinkSync);
}

export async function syncIthinkBackfillHandler(req: Request, res: Response): Promise<void> {
  const { since, until } = req.query as { since?: string; until?: string };
  if (!since || !until) {
    handleErrorResponse(res, { statusCode: 400, message: 'since and until query params required (YYYY-MM-DD)', error: 'BAD_REQUEST' });
    return;
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(since) || !dateRegex.test(until)) {
    handleErrorResponse(res, { statusCode: 400, message: 'since and until must be YYYY-MM-DD format', error: 'BAD_REQUEST' });
    return;
  }
  fireAndForget(res, 'ithink-backfill', () => triggerIthinkBackfill(since, until));
}

export function syncJudgeMeHandler(_req: Request, res: Response): void {
  fireAndForget(res, 'judgeme', triggerJudgeMeSync);
}

export function syncGA4Handler(_req: Request, res: Response): void {
  fireAndForget(res, 'ga4', triggerGA4Sync);
}

export async function refreshGA4TokenHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = await triggerGA4TokenRefresh();
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    handleErrorResponse(res, {
      statusCode: 500,
      message: (err as Error).message,
      error: 'GA4_TOKEN_REFRESH_FAILED',
    });
  }
}

export function syncAllHandler(_req: Request, res: Response): void {
  fireAndForget(res, 'all', triggerAllSync);
}
