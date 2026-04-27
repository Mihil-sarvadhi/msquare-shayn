import { logger } from '@logger/logger';
import { SyncCursor } from '@db/models';
import { SOURCE, type SourceType } from '@constant';
import { getResource, listResources } from './sync-orchestrator.registry';
import type { SyncResult } from './sync-orchestrator.types';

/**
 * Sequelize bulkCreate often surfaces a useless "Validation error" string. This
 * helper digs out the actual per-row constraint failures so logs point at the
 * real problem (column name, value, rule).
 */
function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const anyErr = err as Error & {
    name?: string;
    errors?: { message: string; path?: string; value?: unknown }[];
    original?: { message?: string; detail?: string; code?: string };
    parent?: { message?: string; detail?: string; code?: string };
  };
  const parts: string[] = [`${anyErr.name ?? 'Error'}: ${anyErr.message}`];
  const pgErr = anyErr.original ?? anyErr.parent;
  if (pgErr?.detail) parts.push(`pg_detail=${pgErr.detail}`);
  if (pgErr?.code) parts.push(`pg_code=${pgErr.code}`);
  if (Array.isArray(anyErr.errors) && anyErr.errors.length > 0) {
    const sample = anyErr.errors.slice(0, 3).map((e) => {
      const v = typeof e.value === 'object' ? JSON.stringify(e.value) : String(e.value);
      return `${e.path ?? '?'}=${v.slice(0, 60)} (${e.message})`;
    });
    parts.push(`row_errors[${anyErr.errors.length}]: ${sample.join('; ')}`);
  }
  return parts.join(' | ');
}

const BACKFILL_FROM_DATE = new Date('2023-01-01T00:00:00.000Z');

async function setCursorRunning(source: SourceType, resource: string): Promise<void> {
  const now = new Date();
  await SyncCursor.upsert({
    source,
    resource,
    status: 'running',
    error_message: null,
    updated_at: now,
  });
}

async function setCursorIdle(
  source: SourceType,
  resource: string,
  lastSyncedAt: Date,
  bulkOpId?: string,
): Promise<void> {
  const now = new Date();
  await SyncCursor.upsert({
    source,
    resource,
    status: 'idle',
    error_message: null,
    last_synced_at: lastSyncedAt,
    last_bulk_op_id: bulkOpId ?? null,
    updated_at: now,
  });
}

async function setCursorFailed(
  source: SourceType,
  resource: string,
  errorMessage: string,
): Promise<void> {
  const now = new Date();
  await SyncCursor.upsert({
    source,
    resource,
    status: 'failed',
    error_message: errorMessage,
    updated_at: now,
  });
}

async function getCursor(source: SourceType, resource: string): Promise<SyncCursor | null> {
  return SyncCursor.findOne({ where: { source, resource } });
}

export async function runBackfill(source: SourceType, resource: string): Promise<SyncResult> {
  const handler = getResource(source, resource);
  if (!handler) {
    throw new Error(`No handler registered for ${source}:${resource}`);
  }
  logger.info(`[Backfill] Starting ${source}:${resource} from ${BACKFILL_FROM_DATE.toISOString()}`);
  await setCursorRunning(source, resource);
  try {
    const result = await handler.backfill({ fromDate: BACKFILL_FROM_DATE });
    await setCursorIdle(source, resource, new Date(), result.bulk_op_id);
    logger.info(
      `[Backfill] Completed ${source}:${resource} - ${result.records_synced} records in ${result.duration_ms}ms`,
    );
    return result;
  } catch (err) {
    const message = describeError(err);
    await setCursorFailed(source, resource, message);
    logger.error(`[Backfill] Failed ${source}:${resource}: ${message}`);
    throw err;
  }
}

export async function runBackfillAll(source: SourceType): Promise<SyncResult[]> {
  const handlers = listResources(source);
  logger.info(`[Backfill] Running ${handlers.length} resources for ${source}`);
  const results: SyncResult[] = [];
  for (const handler of handlers) {
    try {
      const result = await runBackfill(source, handler.resource);
      results.push(result);
    } catch {
      // Already logged in runBackfill; continue with remaining resources.
    }
  }
  return results;
}

export async function runIncremental(source: SourceType, resource: string): Promise<SyncResult> {
  const handler = getResource(source, resource);
  if (!handler) {
    throw new Error(`No handler registered for ${source}:${resource}`);
  }
  const cursor = await getCursor(source, resource);
  const sinceDate = cursor?.last_synced_at ?? null;
  await setCursorRunning(source, resource);
  try {
    const result = await handler.incremental({ sinceDate });
    await setCursorIdle(source, resource, new Date());
    logger.info(
      `[Incremental] ${source}:${resource} - ${result.records_synced} records in ${result.duration_ms}ms`,
    );
    return result;
  } catch (err) {
    const message = describeError(err);
    await setCursorFailed(source, resource, message);
    logger.error(`[Incremental] Failed ${source}:${resource}: ${message}`);
    throw err;
  }
}

export async function runIncrementalAll(source: SourceType): Promise<SyncResult[]> {
  const handlers = listResources(source);
  const results: SyncResult[] = [];
  for (const handler of handlers) {
    try {
      const result = await runIncremental(source, handler.resource);
      results.push(result);
    } catch {
      // Already logged in runIncremental; continue.
    }
  }
  return results;
}

export async function listCursors(source?: SourceType): Promise<SyncCursor[]> {
  return source ? SyncCursor.findAll({ where: { source } }) : SyncCursor.findAll();
}

export { SOURCE, BACKFILL_FROM_DATE };
