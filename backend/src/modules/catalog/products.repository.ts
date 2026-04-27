import { QueryTypes, type CreationAttributes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { Product } from '@db/models';
import { SOURCE } from '@constant';

export async function upsertProducts(rows: CreationAttributes<Product>[]): Promise<number> {
  if (rows.length === 0) return 0;
  await Product.bulkCreate(rows, {
    updateOnDuplicate: [
      'title',
      'vendor',
      'product_type',
      'status',
      'tags',
      'handle',
      'image_url',
      'published_at',
      'total_variants',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
    conflictAttributes: ['source', 'source_product_id'],
  });
  return rows.length;
}

export interface ProductsListParams {
  page: number;
  limit: number;
  status?: string;
  productType?: string;
  vendor?: string;
  search?: string;
}

export interface ProductRow {
  id: number;
  source_product_id: string;
  title: string | null;
  vendor: string | null;
  product_type: string | null;
  status: string | null;
  tags: string[] | null;
  image_url: string | null;
  total_variants: number;
  total_inventory: number;
}

export async function listProducts(
  params: ProductsListParams,
): Promise<{ rows: ProductRow[]; total: number }> {
  const offset = (params.page - 1) * params.limit;
  const where: string[] = ['p.source = :source'];
  const replacements: Record<string, unknown> = {
    source: SOURCE.SHOPIFY,
    limit: params.limit,
    offset,
  };
  if (params.status) {
    where.push('p.status = :status');
    replacements.status = params.status;
  }
  if (params.productType) {
    where.push('p.product_type = :productType');
    replacements.productType = params.productType;
  }
  if (params.vendor) {
    where.push('p.vendor = :vendor');
    replacements.vendor = params.vendor;
  }
  if (params.search) {
    where.push('p.title ILIKE :search');
    replacements.search = `%${params.search}%`;
  }
  const whereClause = where.join(' AND ');

  const rows = await sequelize.query<ProductRow>(
    `SELECT p.id, p.source_product_id, p.title, p.vendor, p.product_type, p.status,
            p.tags, p.image_url, p.total_variants,
            COALESCE((
              SELECT SUM(il.available)
                FROM product_variants pv
                JOIN inventory_items ii ON ii.source_variant_id = pv.source_variant_id
                JOIN inventory_levels il ON il.source_inventory_item_id = ii.source_inventory_item_id
                WHERE pv.source_product_id = p.source_product_id
            ), 0)::integer AS total_inventory
       FROM products p
       WHERE ${whereClause}
       ORDER BY p.title ASC
       LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements },
  );

  const totalResult = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM products p WHERE ${whereClause}`,
    { type: QueryTypes.SELECT, replacements },
  );
  return { rows, total: parseInt(totalResult[0]?.count ?? '0', 10) };
}

export async function findProductById(id: number) {
  return sequelize.query(
    `SELECT id, source_product_id, title, vendor, product_type, status, tags, handle,
            image_url, published_at, total_variants
       FROM products WHERE id = :id LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { id } },
  );
}
