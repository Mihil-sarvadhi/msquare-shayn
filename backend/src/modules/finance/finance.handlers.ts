import axios from 'axios';
import { logger } from '@logger/logger';
import { SOURCE } from '@constant';
import {
  fetchLocations,
  fetchRefundsDelta,
  fetchReturnsDelta,
  fetchTransactionsDelta,
  startTransactionsBulkBackfill,
  waitForBulkOperationUrl,
  type ShopifyOrderWithTransactions,
} from '@modules/shopify/shopify.connector';
import {
  mapLocation,
  mapRefunds,
  mapReturns,
  mapTransactions,
} from './finance.mapper';
import { upsertLocations } from './locations.repository';
import { upsertRefunds } from './refunds.repository';
import { upsertReturns } from './returns.repository';
import { upsertTransactions } from './transactions.repository';
import type {
  ResourceHandler,
  SyncResult,
} from '@modules/sync-orchestrator/sync-orchestrator.types';

const SHOPIFY_BACKFILL_FROM = new Date('2023-01-01T00:00:00.000Z');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; duration_ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, duration_ms: Date.now() - start };
}

async function downloadJsonl(url: string): Promise<Record<string, unknown>[]> {
  const response = await axios.get<string>(url, { responseType: 'text' });
  const lines = response.data.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((l) => JSON.parse(l) as Record<string, unknown>);
}

/**
 * Bulk JSONL files from Shopify return one row per line. Top-level rows are the
 * primary entity (here: an order). Nested rows include `__parentId` pointing to
 * the parent's GID. We group children under their parent to reconstruct the
 * nested shape that the mapper expects.
 */
function groupBulkOrders<TChild>(
  lines: Record<string, unknown>[],
  childArrayKey: string,
): Map<string, { id: string; [key: string]: TChild[] | string }> {
  const orders = new Map<string, { id: string; [key: string]: TChild[] | string }>();
  for (const node of lines) {
    const parentId = node.__parentId as string | undefined;
    const id = node.id as string | undefined;
    if (!parentId && id) {
      orders.set(id, { id, [childArrayKey]: [] as TChild[] });
    } else if (parentId) {
      const parent = orders.get(parentId);
      if (parent) {
        const arr = parent[childArrayKey] as TChild[];
        arr.push(node as unknown as TChild);
      }
    }
  }
  return orders;
}

export const locationsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'locations',
  backfill: async (): Promise<SyncResult> => {
    const { result, duration_ms } = await timed(() => fetchLocations());
    const rows = result.map(mapLocation);
    const count = await upsertLocations(rows);
    return { resource: 'locations', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
  incremental: async (): Promise<SyncResult> => {
    const { result, duration_ms } = await timed(() => fetchLocations());
    const rows = result.map(mapLocation);
    const count = await upsertLocations(rows);
    return { resource: 'locations', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
};

export const refundsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'refunds',
  // Bulk operations reject `refundLineItems { edges }` because Shopify forbids
  // connection fields inside list fields. Backfill uses the paginated query with
  // BACKFILL_FROM_DATE instead — slower but it preserves the line-item details.
  backfill: async ({ fromDate }): Promise<SyncResult> => {
    const start = Date.now();
    const since = fromDate ?? SHOPIFY_BACKFILL_FROM;
    const orders = await fetchRefundsDelta(since);
    let total = 0;
    for (const order of orders) {
      total += await upsertRefunds(mapRefunds(order));
    }
    logger.info(
      `[Refunds Backfill] since=${since.toISOString()} orders=${orders.length} refunds=${total}`,
    );
    return {
      resource: 'refunds',
      source: SOURCE.SHOPIFY,
      records_synced: total,
      duration_ms: Date.now() - start,
    };
  },
  incremental: async ({ sinceDate }): Promise<SyncResult> => {
    const start = Date.now();
    const since = sinceDate ?? new Date(Date.now() - ONE_DAY_MS);
    const orders = await fetchRefundsDelta(since);
    let total = 0;
    for (const order of orders) {
      total += await upsertRefunds(mapRefunds(order));
    }
    return {
      resource: 'refunds',
      source: SOURCE.SHOPIFY,
      records_synced: total,
      duration_ms: Date.now() - start,
    };
  },
};

export const returnsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'returns',
  backfill: async ({ fromDate }): Promise<SyncResult> => {
    const start = Date.now();
    const since = fromDate ?? SHOPIFY_BACKFILL_FROM;
    const orders = await fetchReturnsDelta(since);
    let total = 0;
    for (const order of orders) {
      total += await upsertReturns(mapReturns(order));
    }
    logger.info(
      `[Returns Backfill] since=${since.toISOString()} orders=${orders.length} returns=${total}`,
    );
    return {
      resource: 'returns',
      source: SOURCE.SHOPIFY,
      records_synced: total,
      duration_ms: Date.now() - start,
    };
  },
  incremental: async ({ sinceDate }): Promise<SyncResult> => {
    const start = Date.now();
    const since = sinceDate ?? new Date(Date.now() - ONE_DAY_MS);
    const orders = await fetchReturnsDelta(since);
    let total = 0;
    for (const order of orders) {
      total += await upsertReturns(mapReturns(order));
    }
    return {
      resource: 'returns',
      source: SOURCE.SHOPIFY,
      records_synced: total,
      duration_ms: Date.now() - start,
    };
  },
};

export const transactionsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'transactions',
  backfill: async (): Promise<SyncResult> => {
    const start = Date.now();
    const op = await startTransactionsBulkBackfill();
    logger.info(`[Transactions Backfill] Bulk op submitted: ${op.id}`);
    const url = await waitForBulkOperationUrl(op.id);
    const lines = await downloadJsonl(url);
    const orders = groupBulkOrders<ShopifyOrderWithTransactions['transactions'][number]>(
      lines,
      'transactions',
    );
    let total = 0;
    for (const order of orders.values()) {
      const mapped = mapTransactions({
        id: order.id,
        transactions: order.transactions as ShopifyOrderWithTransactions['transactions'],
      });
      total += await upsertTransactions(mapped);
    }
    logger.info(`[Transactions Backfill] op=${op.id} orders=${orders.size} txs=${total}`);
    return {
      resource: 'transactions',
      source: SOURCE.SHOPIFY,
      records_synced: total,
      duration_ms: Date.now() - start,
      bulk_op_id: op.id,
    };
  },
  incremental: async ({ sinceDate }): Promise<SyncResult> => {
    const start = Date.now();
    const since = sinceDate ?? new Date(Date.now() - ONE_DAY_MS);
    const orders = await fetchTransactionsDelta(since);
    let total = 0;
    for (const order of orders) {
      total += await upsertTransactions(mapTransactions(order));
    }
    return {
      resource: 'transactions',
      source: SOURCE.SHOPIFY,
      records_synced: total,
      duration_ms: Date.now() - start,
    };
  },
};
