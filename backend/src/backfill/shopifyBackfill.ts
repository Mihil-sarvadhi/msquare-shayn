import * as dotenv from 'dotenv';
dotenv.config();

import db from '../config/database';
import { startBulkBackfill, checkBulkStatus, graphqlRequest } from '../connectors/shopify';
import axios from 'axios';

async function cancelExistingBulkOperation(): Promise<void> {
  const checkQuery = `query { currentBulkOperation { id status } }`;
  try {
    const data = await graphqlRequest<{
      currentBulkOperation: { id: string; status: string } | null;
    }>(checkQuery);
    const current = data.currentBulkOperation;
    if (current && ['CREATED', 'RUNNING'].includes(current.status)) {
      console.error(
        `[Shopify Backfill] Cancelling existing bulk operation ${current.id} (status: ${current.status})...`,
      );
      const cancelMutation = `mutation { bulkOperationCancel(id: "${current.id}") { bulkOperation { id status } userErrors { message } } }`;
      await graphqlRequest(cancelMutation);
      // Wait for cancellation to complete
      await new Promise((r) => setTimeout(r, 5000));
      console.error('[Shopify Backfill] Existing operation cancelled.');
    }
  } catch (err) {
    console.error(
      '[Shopify Backfill] Could not check/cancel existing operation:',
      (err as Error).message,
    );
  }
}

async function downloadAndInsertBulkData(url: string): Promise<number> {
  const res = await axios.get(url, { responseType: 'text' });
  const lines: string[] = (res.data as string).trim().split('\n').filter(Boolean);

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

    await db.query(
      `INSERT INTO shopify_orders
        (order_id, order_name, created_at, revenue, payment_mode,
         financial_status, fulfillment_status, customer_id, customer_email,
         customer_city, customer_state, discount_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (order_id) DO NOTHING`,
      [
        order.id,
        order.name,
        order.createdAt,
        parseFloat(
          (order.totalPriceSet as Record<string, Record<string, string>>)?.shopMoney?.amount || '0',
        ),
        isCOD ? 'COD' : 'Prepaid',
        order.displayFinancialStatus,
        order.displayFulfillmentStatus,
        (order.customer as Record<string, string>)?.id || null,
        (order.customer as Record<string, string>)?.email || null,
        (
          (order.customer as Record<string, Record<string, string>>)?.defaultAddress as Record<
            string,
            string
          >
        )?.city || null,
        (
          (order.customer as Record<string, Record<string, string>>)?.defaultAddress as Record<
            string,
            string
          >
        )?.province || null,
        (order.discountCodes as string) || null,
      ],
    );
    inserted++;
  }

  for (const item of lineItems) {
    await db.query(
      `INSERT INTO shopify_order_lineitems
        (order_id, sku, title, quantity, unit_price)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT DO NOTHING`,
      [
        item.__parentId,
        item.sku,
        item.title,
        item.quantity,
        parseFloat(
          (item.originalUnitPriceSet as Record<string, Record<string, string>>)?.shopMoney
            ?.amount || '0',
        ),
      ],
    );
  }

  return inserted;
}

async function shopifyBackfill(): Promise<void> {
  console.error('[Shopify Backfill] Starting bulk operation...');

  await cancelExistingBulkOperation();
  const op = await startBulkBackfill();
  console.error(`[Shopify Backfill] Bulk operation started: ${op.id}`);

  let status = op.status;
  while (status !== 'COMPLETED' && status !== 'FAILED') {
    await new Promise((r) => setTimeout(r, 10000));
    const current = await checkBulkStatus(op.id);
    status = current.status;
    console.error(`[Shopify Backfill] Status: ${status}`);

    if (status === 'COMPLETED' && current.url) {
      const count = await downloadAndInsertBulkData(current.url);
      console.error(`[Shopify Backfill] Done. Inserted ${count} orders.`);
    }
  }

  if (status === 'FAILED') {
    console.error('[Shopify Backfill] Bulk operation failed.');
    process.exit(1);
  }

  await db.end();
}

shopifyBackfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
