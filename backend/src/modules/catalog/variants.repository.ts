import { QueryTypes, type CreationAttributes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ProductVariant } from '@db/models';

export async function upsertVariants(
  rows: CreationAttributes<ProductVariant>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await ProductVariant.bulkCreate(rows, {
    updateOnDuplicate: [
      'source_product_id',
      'product_id',
      'sku',
      'title',
      'price',
      'compare_at_price',
      'weight_grams',
      'barcode',
      'source_inventory_item_id',
      'position',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
    conflictAttributes: ['source', 'source_variant_id'],
  });
  return rows.length;
}

/**
 * After products are upserted, link previously-orphan variants to their product
 * by matching (source, source_product_id). Returns rows affected.
 */
export async function linkVariantsToProducts(): Promise<number> {
  const [, meta] = (await sequelize.query(
    `UPDATE product_variants pv
        SET product_id = p.id, updated_at = NOW()
       FROM products p
       WHERE pv.product_id IS NULL
         AND pv.source = p.source
         AND pv.source_product_id = p.source_product_id`,
  )) as [unknown, unknown];
  const rowCount =
    typeof meta === 'object' && meta !== null && 'rowCount' in meta
      ? Number((meta as { rowCount: number }).rowCount)
      : 0;
  return rowCount;
}

export async function listVariantsByProduct(productId: number) {
  return sequelize.query(
    `SELECT id, source_variant_id, sku, title, price, compare_at_price, weight_grams,
            barcode, source_inventory_item_id, position
       FROM product_variants
       WHERE product_id = :productId
       ORDER BY position ASC`,
    { type: QueryTypes.SELECT, replacements: { productId } },
  );
}
