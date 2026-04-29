import axios from 'axios';
import { ShopifyOrder, ShopifyOrderLineitem, ShopifyAnalyticsDaily } from '@db/models';
import {
  startBulkBackfill,
  checkBulkStatus,
  graphqlRequest,
  fetchAnalyticsDaily,
} from './shopify.connector';
import { syncShopifyCustomers } from './shopify.sync';
import { mapBulkOrder } from './shopify.mapper';
import { logger } from '@logger/logger';
import { SOURCE } from '@constant';

async function cancelExistingBulkOperation(): Promise<void> {
  const checkQuery = `query { currentBulkOperation { id status } }`;
  try {
    const data = await graphqlRequest<{
      currentBulkOperation: { id: string; status: string } | null;
    }>(checkQuery);
    const current = data.currentBulkOperation;
    if (current && ['CREATED', 'RUNNING'].includes(current.status)) {
      logger.info(
        `[Shopify Backfill] Cancelling existing operation ${current.id} (${current.status})...`,
      );
      const cancelMutation = `mutation { bulkOperationCancel(id: "${current.id}") { bulkOperation { id status } userErrors { message } } }`;
      await graphqlRequest(cancelMutation);
      await new Promise((r) => setTimeout(r, 5000));
      logger.info('[Shopify Backfill] Operation cancelled.');
    }
  } catch (err) {
    logger.warn(
      `[Shopify Backfill] Could not cancel existing operation: ${(err as Error).message}`,
    );
  }
}

async function downloadAndInsertBulkData(url: string): Promise<number> {
  const res = await axios.get<string>(url, { responseType: 'text' });
  const lines = res.data.trim().split('\n').filter(Boolean);

  const orders: Record<string, Record<string, unknown>> = {};
  const lineItems: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    const obj = JSON.parse(line) as Record<string, unknown>;
    if (!obj.__parentId) {
      orders[obj.id as string] = obj;
    } else {
      lineItems.push(obj);
    }
  }

  let inserted = 0;
  for (const order of Object.values(orders)) {
    await ShopifyOrder.upsert(mapBulkOrder(order));
    inserted++;
  }

  const orderIds = Object.keys(orders);
  if (orderIds.length > 0) {
    await ShopifyOrderLineitem.destroy({ where: { order_id: orderIds } });
  }

  for (const item of lineItems) {
    const orderId = item.__parentId as string;
    if (!orders[orderId]) continue;
    const price = item.originalUnitPriceSet as { shopMoney: { amount: string } } | undefined;
    const product = item.product as { id?: string } | undefined;
    await ShopifyOrderLineitem.create({
      order_id: orderId,
      sku: (item.sku as string | undefined) || undefined,
      product_id: product?.id || undefined,
      title: item.title as string,
      quantity: item.quantity as number,
      unit_price: parseFloat(price?.shopMoney?.amount || '0'),
    });
  }

  return inserted;
}

export async function shopifyBackfill(): Promise<void> {
  logger.info('[Shopify Backfill] Starting bulk operation...');
  await cancelExistingBulkOperation();

  const op = await startBulkBackfill();
  logger.info(`[Shopify Backfill] Bulk operation started: ${op.id}`);

  let status = op.status;
  while (!['COMPLETED', 'FAILED', 'CANCELED'].includes(status)) {
    await new Promise((r) => setTimeout(r, 10000));
    const result = await checkBulkStatus(op.id);
    status = result.status;
    logger.info(`[Shopify Backfill] Status: ${status}`);
    if (status === 'COMPLETED' && result.url) {
      const count = await downloadAndInsertBulkData(result.url);
      const customersSynced = await syncShopifyCustomers();
      logger.info(
        `[Shopify Backfill] Done. Inserted ${count} orders and synced ${customersSynced} customers.`,
      );
      return;
    }
    if (status === 'FAILED') {
      throw new Error(`[Shopify Backfill] Bulk operation failed: ${result.errorCode}`);
    }
  }
}

/**
 * Shopify Analytics — daily Sessions backfill from 2023-01-01 forward.
 *
 * ShopifyQL caps responses at 1000 rows per call (~2.7 years of daily data),
 * so we chunk by calendar year and merge. Rows are upserted on (source, date).
 * Idempotent.
 */
const ANALYTICS_BACKFILL_ANCHOR_YEAR = 2023;

export async function backfillAnalyticsDaily(): Promise<{ rows_written: number }> {
  const until = new Date();
  const finalYear = until.getUTCFullYear();
  const allRows: Array<{ date: string; sessions: number }> = [];

  for (let year = ANALYTICS_BACKFILL_ANCHOR_YEAR; year <= finalYear; year += 1) {
    const since = new Date(Date.UTC(year, 0, 1));
    const upTo = year === finalYear ? until : new Date(Date.UTC(year + 1, 0, 1));
    logger.info(
      `[Shopify Analytics Backfill] year=${year} ${since
        .toISOString()
        .slice(0, 10)} → ${upTo.toISOString().slice(0, 10)}`,
    );
    const rows = await fetchAnalyticsDaily(since, upTo);
    logger.info(`[Shopify Analytics Backfill] year=${year} got ${rows.length} rows`);
    allRows.push(...rows);
  }

  if (allRows.length === 0) {
    logger.warn('[Shopify Analytics Backfill] No rows returned from Shopify.');
    return { rows_written: 0 };
  }

  // Dedupe by date — yearly chunks can overlap on boundary days, and Postgres
  // ON CONFLICT DO UPDATE can't touch the same row twice in one statement.
  const byDate = new Map<string, { date: string; sessions: number }>();
  for (const r of allRows) byDate.set(r.date, r);
  const deduped = Array.from(byDate.values());

  const now = new Date();
  await ShopifyAnalyticsDaily.bulkCreate(
    deduped.map((r) => ({
      source: SOURCE.SHOPIFY,
      date: r.date,
      sessions: r.sessions,
      synced_at: now,
    })),
    {
      updateOnDuplicate: ['sessions', 'synced_at', 'updated_at'],
      conflictAttributes: ['source', 'date'],
    },
  );

  logger.info(`[Shopify Analytics Backfill] Wrote ${deduped.length} rows total.`);
  return { rows_written: deduped.length };
}

if (require.main === module) {
  shopifyBackfill().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}
