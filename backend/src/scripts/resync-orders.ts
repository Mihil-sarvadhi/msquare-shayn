/**
 * One-off: re-fetch & upsert orders since a given date so newly-added columns
 * (total_received, total_outstanding, current_total_price) get populated.
 * Usage: npx tsx src/scripts/resync-orders.ts 2026-04-01
 */
import { fetchRecentOrders } from '@modules/shopify/shopify.connector';
import { mapShopifyOrder } from '@modules/shopify/shopify.mapper';
import { ShopifyOrder } from '@db/models';
import { logger } from '@logger/logger';
import { sequelize } from '@db/sequelize';

const since = process.argv[2] ?? '2026-04-01';

async function main(): Promise<void> {
  await sequelize.authenticate();
  const sinceIso = new Date(`${since}T00:00:00Z`).toISOString();
  logger.info(`[Resync Orders] Fetching orders updated since ${sinceIso}`);
  const orders = await fetchRecentOrders(sinceIso);
  logger.info(`[Resync Orders] Got ${orders.length} orders, upserting...`);
  let count = 0;
  for (const order of orders) {
    await ShopifyOrder.upsert(mapShopifyOrder(order));
    count++;
  }
  logger.info(`[Resync Orders] DONE — upserted ${count} orders`);
  await sequelize.close();
}

main().catch((err) => {
  logger.error(`[Resync Orders] FAILED: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
