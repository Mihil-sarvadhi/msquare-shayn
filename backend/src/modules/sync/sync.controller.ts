import { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import {
  triggerShopifySync,
  triggerMetaSync,
  triggerIthinkSync,
  triggerIthinkBackfill,
  triggerJudgeMeSync,
  triggerAllSync,
} from './sync.service';

function errOpts(err: unknown) {
  return { statusCode: 500, message: (err as Error).message, error: err };
}

export async function syncShopifyHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await triggerShopifySync() });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function syncMetaHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await triggerMetaSync() });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function syncIthinkHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await triggerIthinkSync() });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function syncIthinkBackfillHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = req.query as { since?: string; until?: string };
    if (!since || !until) {
      handleErrorResponse(res, {
        statusCode: 400,
        message: 'since and until query params required (YYYY-MM-DD)',
        error: 'BAD_REQUEST',
      });
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(since) || !dateRegex.test(until)) {
      handleErrorResponse(res, {
        statusCode: 400,
        message: 'since and until must be YYYY-MM-DD format',
        error: 'BAD_REQUEST',
      });
      return;
    }
    handleApiResponse(res, { data: await triggerIthinkBackfill(since, until) });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function syncJudgeMeHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await triggerJudgeMeSync() });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}

export async function syncAllHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await triggerAllSync() });
  } catch (err) {
    handleErrorResponse(res, errOpts(err));
  }
}
