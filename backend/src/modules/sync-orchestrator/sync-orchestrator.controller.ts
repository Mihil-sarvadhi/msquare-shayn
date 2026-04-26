import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { handleApiResponse } from '@utils/handleResponse';
import { isValidSource, RES_TYPES, type SourceType } from '@constant';
import {
  listCursors,
  runBackfill,
  runBackfillAll,
  runIncrementalAll,
} from './sync-orchestrator.service';

const sourceParamSchema = z.object({
  source: z.string().refine(isValidSource, { message: 'Invalid source' }),
});

const backfillQuerySchema = z.object({
  resource: z.string().min(1).optional(),
});

const cursorsQuerySchema = z.object({
  source: z.string().refine(isValidSource).optional(),
});

export async function backfillHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = sourceParamSchema.parse(req.params);
    const query = backfillQuerySchema.parse(req.query);
    const source = params.source as SourceType;

    if (query.resource) {
      handleApiResponse(res, {
        statusCode: 202,
        message: RES_TYPES.SYNC_TRIGGERED,
        data: { accepted: true, source, resource: query.resource },
      });
      void runBackfill(source, query.resource).catch(() => {
        /* logged by service */
      });
      return;
    }

    handleApiResponse(res, {
      statusCode: 202,
      message: RES_TYPES.SYNC_TRIGGERED,
      data: { accepted: true, source, mode: 'all' },
    });
    void runBackfillAll(source).catch(() => {
      /* logged by service */
    });
  } catch (err) {
    next(err);
  }
}

export async function incrementalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = sourceParamSchema.parse(req.params);
    const source = params.source as SourceType;

    handleApiResponse(res, {
      statusCode: 202,
      message: RES_TYPES.SYNC_TRIGGERED,
      data: { accepted: true, source },
    });
    void runIncrementalAll(source).catch(() => {
      /* logged by service */
    });
  } catch (err) {
    next(err);
  }
}

export async function listCursorsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { source } = cursorsQuerySchema.parse(req.query);
    const cursors = await listCursors(source as SourceType | undefined);
    handleApiResponse(res, { data: cursors });
  } catch (err) {
    next(err);
  }
}
