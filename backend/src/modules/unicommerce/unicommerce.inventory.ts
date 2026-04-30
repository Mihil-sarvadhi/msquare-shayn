import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ConnectorHealth, UnicommerceInventory } from '@db/models';
import * as connector from './unicommerce.connector';
import type { UCInventorySnapshot } from './unicommerce.connector';
import { logger } from '@logger/logger';

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 300;

function toInt(value: number | string | undefined | null, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  const n = typeof value === 'number' ? Math.floor(value) : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Union the SKU universe across every table that knows about products:
 *   - product_variants       (~1948) full Shopify catalog incl. unsold SKUs
 *   - inventory_items        (~1948) Shopify inventory tracking
 *   - shopify_order_lineitems (~724) historic orders (catches SKUs that may
 *                                    have been deleted from the catalog)
 *   - unicommerce_order_items (~760) Uniware-side line items
 *
 * Pulling from `shopify_order_lineitems` alone (the previous behaviour)
 * missed every catalog SKU that's never been ordered — Uniware reports
 * the full ~2070 SKUs, so we need the union.
 */
async function loadDistinctSkus(): Promise<string[]> {
  const rows = await sequelize.query<{ sku: string }>(
    `SELECT DISTINCT sku FROM (
       SELECT sku FROM product_variants        WHERE sku IS NOT NULL AND sku <> ''
       UNION
       SELECT sku FROM inventory_items         WHERE sku IS NOT NULL AND sku <> ''
       UNION
       SELECT sku FROM shopify_order_lineitems WHERE sku IS NOT NULL AND sku <> ''
       UNION
       SELECT sku FROM unicommerce_order_items WHERE sku IS NOT NULL AND sku <> ''
     ) all_skus
     ORDER BY sku`,
    { type: QueryTypes.SELECT },
  );
  return rows.map((r) => r.sku);
}

async function persistSnapshot(snapshot: UCInventorySnapshot): Promise<void> {
  const sku = snapshot.itemTypeSKU ?? snapshot.itemSKU;
  if (!sku) return;

  const available = toInt(snapshot.inventory);
  const onHold = toInt(snapshot.inventoryOnHold);
  const damaged = toInt(snapshot.inventoryDamaged);
  const bad = toInt(snapshot.badInventory);
  const notSynced = toInt(snapshot.inventoryNotSynced);
  const virtual = toInt(snapshot.virtualInventory);
  const batchRecall = toInt(snapshot.batchRecallQuantity);
  const total = toInt(snapshot.totalInventory) || available + onHold + damaged + bad;

  await UnicommerceInventory.upsert({
    sku,
    available_qty: available,
    on_hold_qty: onHold,
    damaged_qty: damaged,
    total_qty: total,
    bad_inventory: bad,
    inventory_not_synced: notSynced,
    virtual_inventory: virtual,
    batch_recall_qty: batchRecall,
    facility_code: snapshot.facilityCode,
    synced_at: new Date(),
  });
}

/**
 * Compute and persist sales_last_30_days + days_of_inventory for every row in
 * unicommerce_inventory. Runs as a single SQL UPDATE — fast and idempotent.
 *
 *   sales_last_30_days = COUNT of unicommerce_order_items rows for this SKU
 *                        on non-cancelled orders within the trailing 30 IST days
 *   days_of_inventory  = available_qty / (sales_last_30_days / 30)
 *                        NULL when sales_last_30_days = 0 (avoid /0)
 */
export async function recomputeInventoryMetrics(): Promise<void> {
  await sequelize.query(
    `WITH sales AS (
       SELECT
         i.sku,
         COUNT(*)::int AS sales_30d
       FROM unicommerce_order_items i
       JOIN unicommerce_orders o ON o.order_code = i.order_code
       WHERE (o.order_date AT TIME ZONE 'Asia/Kolkata')::date
             >= ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - 30)
         AND o.status IS DISTINCT FROM 'CANCELLED'
         AND i.sku IS NOT NULL AND i.sku <> ''
       GROUP BY i.sku
     )
     UPDATE unicommerce_inventory inv SET
       sales_last_30_days = COALESCE(s.sales_30d, 0),
       days_of_inventory  = CASE
         WHEN COALESCE(s.sales_30d, 0) = 0 THEN NULL
         ELSE ROUND((inv.available_qty::numeric / (s.sales_30d::numeric / 30))::numeric, 2)
       END
     FROM sales s
     WHERE inv.sku = s.sku`,
    { type: QueryTypes.UPDATE },
  );

  // Reset sales_30d for SKUs not in the sales CTE (no orders in window).
  await sequelize.query(
    `UPDATE unicommerce_inventory
        SET sales_last_30_days = 0,
            days_of_inventory  = NULL
      WHERE sku NOT IN (
        SELECT DISTINCT i.sku
          FROM unicommerce_order_items i
          JOIN unicommerce_orders o ON o.order_code = i.order_code
         WHERE (o.order_date AT TIME ZONE 'Asia/Kolkata')::date
               >= ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - 30)
           AND o.status IS DISTINCT FROM 'CANCELLED'
           AND i.sku IS NOT NULL AND i.sku <> ''
      )`,
    { type: QueryTypes.UPDATE },
  );
}

/**
 * Pull inventory for every SHAYN SKU we know about. Batched 50-at-a-time
 * with a 300ms gap to stay polite with Uniware's rate limits.
 */
export async function syncInventory(): Promise<{ skus: number; persisted: number }> {
  const startedAt = Date.now();
  const skus = await loadDistinctSkus();
  if (!skus.length) {
    logger.warn(
      '[Unicommerce Inventory] No SKUs found in shopify_order_lineitems — nothing to sync',
    );
    return { skus: 0, persisted: 0 };
  }

  logger.info(
    `[Unicommerce Inventory] Fetching snapshots for ${skus.length} SKUs in batches of ${BATCH_SIZE}`,
  );

  let persisted = 0;
  for (let i = 0; i < skus.length; i += BATCH_SIZE) {
    const chunk = skus.slice(i, i + BATCH_SIZE);
    const batchNo = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(skus.length / BATCH_SIZE);
    try {
      const res = await connector.getInventory(chunk);
      const snapshots = res.inventorySnapshots ?? [];
      for (const snap of snapshots) {
        await persistSnapshot(snap);
        persisted++;
      }
      logger.info(
        `[Unicommerce Inventory] Batch ${batchNo}/${totalBatches}: requested ${chunk.length}, persisted ${snapshots.length}`,
      );
    } catch (err) {
      logger.error(
        `[Unicommerce Inventory] Batch ${batchNo}/${totalBatches} failed: ${(err as Error).message}`,
      );
    }
    if (i + BATCH_SIZE < skus.length) await sleep(BATCH_DELAY_MS);
  }

  logger.info(`[Unicommerce Inventory] Recomputing sales_last_30_days + days_of_inventory...`);
  await recomputeInventoryMetrics();

  const durationS = Math.round((Date.now() - startedAt) / 1000);
  logger.info(
    `[Unicommerce Inventory] Done — ${persisted}/${skus.length} SKUs persisted in ${durationS}s`,
  );

  await ConnectorHealth.update(
    { last_sync_at: new Date(), status: 'green', error_message: undefined },
    { where: { connector_name: 'unicommerce' } },
  );

  return { skus: skus.length, persisted };
}

/** Module entrypoint for `npm run backfill:unicommerce:inventory`. */
if (require.main === module) {
  syncInventory()
    .then(({ skus, persisted }) => {
      logger.info(`[Unicommerce Inventory] Exit — ${persisted}/${skus} persisted`);
      process.exit(0);
    })
    .catch((err) => {
      logger.error(`[Unicommerce Inventory] Fatal: ${(err as Error).message}`);
      process.exit(1);
    });
}
