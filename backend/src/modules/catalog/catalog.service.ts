import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { SOURCE } from '@constant';
import {
  findProductById,
  listProducts as listProductsRepo,
  type ProductsListParams,
} from './products.repository';
import { listVariantsByProduct } from './variants.repository';
import {
  avgMarginPct,
  countActiveSkus,
  countStockouts,
  listInventory as listInventoryRepo,
  listPerLocationInventory,
  totalInventoryValue,
  type InventoryRowData,
} from './inventory.repository';
import { listLocations } from '@modules/finance/locations.repository';
import type {
  BestSellerRow,
  CatalogKpis,
  InventoryRow,
  MarginRow,
  SlowMoverRow,
} from './catalog.types';

export async function getCatalogKpis(
  from: Date | null = null,
  to: Date | null = null,
): Promise<CatalogKpis> {
  const [active_skus, stockouts, avg_margin_pct, total_inventory_value, active_skus_daily] =
    await Promise.all([
      countActiveSkus(),
      countStockouts(0),
      avgMarginPct(),
      totalInventoryValue(),
      from && to ? activeSkusDaily(from, to) : Promise.resolve([] as number[]),
    ]);
  return { active_skus, stockouts, avg_margin_pct, total_inventory_value, active_skus_daily };
}

/**
 * Cumulative count of active products that existed on/before each day in the
 * window. We only have product `created_at` in DB (no archive timestamp), so
 * "active on day D" approximates to "status = 'active' today AND created_at <= D".
 * Good enough for a sparkline showing catalog growth.
 */
async function activeSkusDaily(from: Date, to: Date): Promise<number[]> {
  const rows = await sequelize.query<{ date: string; cum: string }>(
    `WITH days AS (
       SELECT generate_series((:from)::date, (:to)::date, '1 day'::interval)::date AS d
     )
     SELECT d::text AS date,
            (SELECT COUNT(*)
               FROM products
               WHERE source = :source
                 AND status = 'active'
                 AND created_at <= (days.d + INTERVAL '1 day'))::text AS cum
       FROM days
       ORDER BY d ASC`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  return rows.map((r) => parseInt(r.cum, 10) || 0);
}

export async function listProducts(params: ProductsListParams) {
  return listProductsRepo(params);
}

export async function getProductDetail(id: number) {
  const products = await findProductById(id);
  const product = products[0] ?? null;
  if (!product) return null;
  const variants = await listVariantsByProduct(id);
  return { product, variants };
}

export async function getBestSellers(from: Date, to: Date, limit = 20): Promise<BestSellerRow[]> {
  const rows = await sequelize.query<{
    source_variant_id: string;
    sku: string | null;
    product_title: string | null;
    variant_title: string | null;
    units_sold: string;
    revenue: string;
  }>(
    `SELECT pv.source_variant_id,
            pv.sku,
            p.title AS product_title,
            pv.title AS variant_title,
            COALESCE(SUM(li.quantity), 0)::text AS units_sold,
            COALESCE(SUM(li.quantity * li.unit_price), 0)::text AS revenue
       FROM product_variants pv
       LEFT JOIN products p ON p.id = pv.product_id
       LEFT JOIN shopify_order_lineitems li ON li.sku = pv.sku
       LEFT JOIN shopify_orders o ON o.order_id = li.order_id
       WHERE pv.source = :source
         AND (o.created_at IS NULL OR o.created_at BETWEEN :from AND :to)
       GROUP BY pv.source_variant_id, pv.sku, p.title, pv.title
       HAVING COALESCE(SUM(li.quantity), 0) > 0
       ORDER BY units_sold DESC
       LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: { source: SOURCE.SHOPIFY, from, to, limit },
    },
  );
  return rows.map((r) => ({
    source_variant_id: r.source_variant_id,
    sku: r.sku,
    product_title: r.product_title,
    variant_title: r.variant_title,
    units_sold: parseInt(r.units_sold, 10),
    revenue: parseFloat(r.revenue),
  }));
}

export async function getSlowMovers(
  from: Date,
  to: Date,
  daysInactive = 30,
): Promise<SlowMoverRow[]> {
  const rows = await sequelize.query<{
    source_variant_id: string;
    sku: string | null;
    product_title: string | null;
    units_sold: string;
    available: string;
    last_sold_at: string | null;
  }>(
    `SELECT pv.source_variant_id,
            pv.sku,
            p.title AS product_title,
            COALESCE(SUM(li.quantity), 0)::text AS units_sold,
            COALESCE((
              SELECT SUM(il.available)
                FROM inventory_items ii
                JOIN inventory_levels il ON il.source_inventory_item_id = ii.source_inventory_item_id
                WHERE ii.source_variant_id = pv.source_variant_id
            ), 0)::text AS available,
            MAX(o.created_at)::text AS last_sold_at
       FROM product_variants pv
       LEFT JOIN products p ON p.id = pv.product_id
       LEFT JOIN shopify_order_lineitems li ON li.sku = pv.sku
       LEFT JOIN shopify_orders o ON o.order_id = li.order_id AND o.created_at BETWEEN :from AND :to
       WHERE pv.source = :source AND p.status = 'active'
       GROUP BY pv.source_variant_id, pv.sku, p.title
       HAVING COALESCE(SUM(li.quantity), 0) <= 1
          AND COALESCE((
            SELECT SUM(il.available)
              FROM inventory_items ii
              JOIN inventory_levels il ON il.source_inventory_item_id = ii.source_inventory_item_id
              WHERE ii.source_variant_id = pv.source_variant_id
          ), 0) > 0
          AND (MAX(o.created_at) IS NULL OR MAX(o.created_at) < NOW() - (:days || ' days')::interval)
       ORDER BY units_sold ASC, available DESC
       LIMIT 50`,
    {
      type: QueryTypes.SELECT,
      replacements: { source: SOURCE.SHOPIFY, from, to, days: daysInactive },
    },
  );
  return rows.map((r) => ({
    source_variant_id: r.source_variant_id,
    sku: r.sku,
    product_title: r.product_title,
    units_sold: parseInt(r.units_sold, 10),
    available: parseInt(r.available, 10),
    last_sold_at: r.last_sold_at,
  }));
}

export async function listInventory(params: {
  page: number;
  limit: number;
  threshold?: number;
  search?: string;
}): Promise<{ rows: InventoryRow[]; total: number }> {
  const { rows, total } = await listInventoryRepo(params);
  if (rows.length === 0) return { rows: [], total };
  const variantIds = rows.map((r: InventoryRowData) => r.variant_id);
  const perLoc = await listPerLocationInventory(variantIds);
  const perLocByVariant = new Map<number, { location_id: number; location_name: string | null; available: number }[]>();
  for (const p of perLoc) {
    if (!perLocByVariant.has(p.variant_id)) perLocByVariant.set(p.variant_id, []);
    perLocByVariant.get(p.variant_id)!.push({
      location_id: p.location_id,
      location_name: p.location_name,
      available: p.available,
    });
  }
  const enriched: InventoryRow[] = rows.map((r) => ({
    variant_id: r.variant_id,
    source_variant_id: r.source_variant_id,
    sku: r.sku,
    product_title: r.product_title,
    variant_title: r.variant_title,
    total_available: r.total_available,
    per_location: perLocByVariant.get(r.variant_id) ?? [],
  }));
  return { rows: enriched, total };
}

export async function getStockouts(threshold = 0): Promise<InventoryRow[]> {
  const { rows } = await listInventory({ page: 1, limit: 200, threshold });
  return rows;
}

export async function getMargin(): Promise<MarginRow[]> {
  const rows = await sequelize.query<{
    source_variant_id: string;
    sku: string | null;
    product_title: string | null;
    variant_title: string | null;
    price: string;
    cost: string | null;
  }>(
    `SELECT pv.source_variant_id, pv.sku, p.title AS product_title, pv.title AS variant_title,
            pv.price::text AS price, ii.cost::text AS cost
       FROM product_variants pv
       LEFT JOIN products p ON p.id = pv.product_id
       LEFT JOIN inventory_items ii ON ii.source_variant_id = pv.source_variant_id
       WHERE pv.source = :source
       ORDER BY p.title NULLS LAST, pv.position ASC
       LIMIT 500`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  return rows.map((r) => {
    const price = r.price ? parseFloat(r.price) : null;
    const cost = r.cost ? parseFloat(r.cost) : null;
    let margin_amount: number | null = null;
    let margin_pct: number | null = null;
    if (price !== null && cost !== null && price > 0) {
      margin_amount = price - cost;
      margin_pct = (margin_amount / price) * 100;
    }
    return {
      source_variant_id: r.source_variant_id,
      sku: r.sku,
      product_title: r.product_title,
      variant_title: r.variant_title,
      price,
      cost,
      margin_amount,
      margin_pct,
    };
  });
}

export async function getLocations() {
  return listLocations();
}
