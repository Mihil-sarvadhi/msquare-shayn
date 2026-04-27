import { QueryTypes, type CreationAttributes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { InventoryItem, InventoryLevel } from '@db/models';
import { SOURCE } from '@constant';

export async function upsertInventoryItems(
  rows: CreationAttributes<InventoryItem>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await InventoryItem.bulkCreate(rows, {
    updateOnDuplicate: [
      'source_variant_id',
      'variant_id',
      'sku',
      'cost',
      'tracked',
      'hsn_code',
      'country_of_origin',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
    conflictAttributes: ['source', 'source_inventory_item_id'],
  });
  return rows.length;
}

export async function upsertInventoryLevels(
  rows: CreationAttributes<InventoryLevel>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await InventoryLevel.bulkCreate(rows, {
    updateOnDuplicate: [
      'inventory_item_id',
      'location_id',
      'available',
      'on_hand',
      'committed',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
    conflictAttributes: ['source', 'source_inventory_item_id', 'source_location_id'],
  });
  return rows.length;
}

/**
 * Resolve foreign keys after products + variants + locations are synced.
 */
export async function linkInventoryFKs(): Promise<{ items: number; levels: number }> {
  const [, itemsMeta] = (await sequelize.query(
    `UPDATE inventory_items ii
        SET variant_id = pv.id, updated_at = NOW()
       FROM product_variants pv
       WHERE ii.variant_id IS NULL
         AND ii.source = pv.source
         AND ii.source_variant_id = pv.source_variant_id`,
  )) as [unknown, unknown];

  const [, levelItemsMeta] = (await sequelize.query(
    `UPDATE inventory_levels il
        SET inventory_item_id = ii.id, updated_at = NOW()
       FROM inventory_items ii
       WHERE il.inventory_item_id IS NULL
         AND il.source = ii.source
         AND il.source_inventory_item_id = ii.source_inventory_item_id`,
  )) as [unknown, unknown];

  const [, levelLocsMeta] = (await sequelize.query(
    `UPDATE inventory_levels il
        SET location_id = l.id, updated_at = NOW()
       FROM locations l
       WHERE il.location_id IS NULL
         AND il.source = l.source
         AND il.source_location_id = l.source_location_id`,
  )) as [unknown, unknown];

  const rowCount = (m: unknown) =>
    typeof m === 'object' && m !== null && 'rowCount' in m
      ? Number((m as { rowCount: number }).rowCount)
      : 0;
  return {
    items: rowCount(itemsMeta),
    levels: rowCount(levelItemsMeta) + rowCount(levelLocsMeta),
  };
}

export interface InventoryRowData {
  variant_id: number;
  source_variant_id: string;
  sku: string | null;
  product_title: string | null;
  variant_title: string | null;
  total_available: number;
}

export async function listInventory(params: {
  page: number;
  limit: number;
  threshold?: number;
  search?: string;
}): Promise<{ rows: InventoryRowData[]; total: number }> {
  const offset = (params.page - 1) * params.limit;
  const having: string[] = [];
  const where: string[] = ['pv.source = :source'];
  const replacements: Record<string, unknown> = {
    source: SOURCE.SHOPIFY,
    limit: params.limit,
    offset,
  };
  if (params.search) {
    where.push('(pv.sku ILIKE :search OR p.title ILIKE :search)');
    replacements.search = `%${params.search}%`;
  }
  if (params.threshold !== undefined) {
    having.push('COALESCE(SUM(il.available), 0) <= :threshold');
    replacements.threshold = params.threshold;
  }
  const whereClause = where.join(' AND ');
  const havingClause = having.length ? `HAVING ${having.join(' AND ')}` : '';

  const rows = await sequelize.query<InventoryRowData>(
    `SELECT pv.id AS variant_id, pv.source_variant_id, pv.sku,
            p.title AS product_title, pv.title AS variant_title,
            COALESCE(SUM(il.available), 0)::integer AS total_available
       FROM product_variants pv
       LEFT JOIN products p ON p.id = pv.product_id
       LEFT JOIN inventory_items ii ON ii.source_variant_id = pv.source_variant_id
       LEFT JOIN inventory_levels il ON il.source_inventory_item_id = ii.source_inventory_item_id
       WHERE ${whereClause}
       GROUP BY pv.id, pv.source_variant_id, pv.sku, p.title, pv.title
       ${havingClause}
       ORDER BY p.title NULLS LAST, pv.position ASC
       LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements },
  );

  // total count: count distinct variants matching filters (without HAVING for accuracy)
  const totalResult = await sequelize.query<{ count: string }>(
    `SELECT COUNT(DISTINCT pv.id)::text AS count
       FROM product_variants pv
       LEFT JOIN products p ON p.id = pv.product_id
       WHERE ${whereClause}`,
    { type: QueryTypes.SELECT, replacements },
  );

  return { rows, total: parseInt(totalResult[0]?.count ?? '0', 10) };
}

export async function listPerLocationInventory(
  variantIds: number[],
): Promise<{ variant_id: number; location_id: number; location_name: string | null; available: number }[]> {
  if (variantIds.length === 0) return [];
  return sequelize.query(
    `SELECT pv.id AS variant_id, l.id AS location_id, l.name AS location_name, il.available
       FROM product_variants pv
       JOIN inventory_items ii ON ii.source_variant_id = pv.source_variant_id
       JOIN inventory_levels il ON il.source_inventory_item_id = ii.source_inventory_item_id
       LEFT JOIN locations l ON l.id = il.location_id
       WHERE pv.id IN (:ids)`,
    {
      type: QueryTypes.SELECT,
      replacements: { ids: variantIds },
    },
  );
}

export async function countActiveSkus(): Promise<number> {
  const r = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.source = :source AND p.status = 'active'`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  return parseInt(r[0]?.count ?? '0', 10);
}

export async function countStockouts(threshold = 0): Promise<number> {
  const r = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM (
       SELECT pv.id
         FROM product_variants pv
         JOIN inventory_items ii ON ii.source_variant_id = pv.source_variant_id
         LEFT JOIN inventory_levels il ON il.source_inventory_item_id = ii.source_inventory_item_id
         WHERE ii.tracked = TRUE AND pv.source = :source
         GROUP BY pv.id
         HAVING COALESCE(SUM(il.available), 0) <= :threshold
     ) sub`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, threshold } },
  );
  return parseInt(r[0]?.count ?? '0', 10);
}

export async function avgMarginPct(): Promise<number | null> {
  const r = await sequelize.query<{ avg_margin: string | null }>(
    `SELECT AVG(((pv.price - ii.cost) / NULLIF(pv.price, 0)) * 100)::text AS avg_margin
       FROM product_variants pv
       JOIN inventory_items ii ON ii.source_variant_id = pv.source_variant_id
       WHERE pv.source = :source AND ii.cost IS NOT NULL AND pv.price > 0`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  const v = r[0]?.avg_margin;
  return v === null || v === undefined ? null : parseFloat(v);
}

export async function totalInventoryValue(): Promise<number> {
  const r = await sequelize.query<{ value: string }>(
    `SELECT COALESCE(SUM(il.available * COALESCE(ii.cost, 0)), 0)::text AS value
       FROM inventory_levels il
       JOIN inventory_items ii ON ii.id = il.inventory_item_id
       WHERE il.source = :source`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  return parseFloat(r[0]?.value ?? '0');
}
