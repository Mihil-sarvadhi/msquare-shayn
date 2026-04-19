import axios from 'axios';
import { ShopifyOrder, ShopifyOrderLineitem } from '@db/models';
import { startBulkBackfill, checkBulkStatus, graphqlRequest } from './shopify.connector';
import { logger } from '@logger/logger';

async function cancelExistingBulkOperation(): Promise<void> {
  const checkQuery = `query { currentBulkOperation { id status } }`;
  try {
    const data = await graphqlRequest<{ currentBulkOperation: { id: string; status: string } | null }>(checkQuery);
    const current = data.currentBulkOperation;
    if (current && ['CREATED', 'RUNNING'].includes(current.status)) {
      logger.info(`[Shopify Backfill] Cancelling existing operation ${current.id} (${current.status})...`);
      const cancelMutation = `mutation { bulkOperationCancel(id: "${current.id}") { bulkOperation { id status } userErrors { message } } }`;
      await graphqlRequest(cancelMutation);
      await new Promise((r) => setTimeout(r, 5000));
      logger.info('[Shopify Backfill] Operation cancelled.');
    }
  } catch (err) {
    logger.warn(`[Shopify Backfill] Could not cancel existing operation: ${(err as Error).message}`);
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
    const paymentGateways = (order.paymentGatewayNames as string[]) || [];
    const isCOD =
      paymentGateways.includes('cash on delivery') ||
      paymentGateways.some((g) => g.toLowerCase().includes('cod'));
    const priceSet = order.totalPriceSet as { shopMoney: { amount: string } } | undefined;

    await ShopifyOrder.upsert({
      order_id: order.id as string,
      order_name: order.name as string,
      created_at: new Date(order.createdAt as string),
      revenue: parseFloat(priceSet?.shopMoney?.amount || '0'),
      payment_mode: isCOD ? 'COD' : 'Prepaid',
      financial_status: order.displayFinancialStatus as string,
      fulfillment_status: order.displayFulfillmentStatus as string,
      customer_id: (order.customer as Record<string, string> | undefined)?.id || undefined,
      customer_email: (order.customer as Record<string, string> | undefined)?.email || undefined,
      customer_city: (order.customer as { defaultAddress?: Record<string, string> } | undefined)?.defaultAddress?.city || undefined,
      customer_state: (order.customer as { defaultAddress?: Record<string, string> } | undefined)?.defaultAddress?.province || undefined,
      discount_code: (order.discountCodes as Array<{ code: string }> | undefined)?.[0]?.code || undefined,
    });

    inserted++;
  }

  for (const item of lineItems) {
    const orderId = item.__parentId as string;
    if (!orders[orderId]) continue;
    const price = item.originalUnitPriceSet as { shopMoney: { amount: string } } | undefined;
    await ShopifyOrderLineitem.findOrCreate({
      where: { order_id: orderId, sku: (item.sku as string) || undefined, title: item.title as string },
      defaults: {
        order_id: orderId,
        sku: item.sku as string,
        title: item.title as string,
        quantity: item.quantity as number,
        unit_price: parseFloat(price?.shopMoney?.amount || '0'),
      },
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
      logger.info(`[Shopify Backfill] Done. Inserted ${count} orders.`);
      return;
    }
    if (status === 'FAILED') {
      throw new Error(`[Shopify Backfill] Bulk operation failed: ${result.errorCode}`);
    }
  }
}

if (require.main === module) {
  shopifyBackfill().catch((err) => { logger.error(err); process.exit(1); });
}
