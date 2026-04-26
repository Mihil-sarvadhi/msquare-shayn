import axios from 'axios';
import { ShopifyOrder, ShopifyOrderLineitem } from '@db/models';
import { startBulkBackfill, checkBulkStatus, graphqlRequest } from './shopify.connector';
import { syncShopifyCustomers } from './shopify.sync';
import { mapBulkOrder } from './shopify.mapper';
import { logger } from '@logger/logger';

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
    await ShopifyOrderLineitem.create({
      order_id: orderId,
      sku: (item.sku as string | undefined) || undefined,
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

if (require.main === module) {
  shopifyBackfill().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}
