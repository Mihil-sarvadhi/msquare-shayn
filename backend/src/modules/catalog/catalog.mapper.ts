import { SOURCE } from '@constant';
import type {
  ShopifyInventoryLevelNode,
  ShopifyProductNode,
  ShopifyProductVariantNode,
} from '@modules/shopify/shopify.connector';
import type { ProductStatus } from '@db/models';

const PRODUCT_STATUS_MAP: Record<string, ProductStatus> = {
  ACTIVE: 'active',
  DRAFT: 'draft',
  ARCHIVED: 'archived',
};

function gid(id: string): string {
  return id;
}

function num(s: string | null | undefined): number | null {
  if (s === null || s === undefined || s === '') return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function weightToGrams(w: number | null, unit: string | null): number | null {
  if (w === null) return null;
  switch ((unit ?? '').toLowerCase()) {
    case 'grams':
    case 'g':
      return w;
    case 'kilograms':
    case 'kg':
      return w * 1000;
    case 'ounces':
    case 'oz':
      return w * 28.3495;
    case 'pounds':
    case 'lb':
      return w * 453.592;
    default:
      return w;
  }
}

export function mapProduct(p: ShopifyProductNode) {
  return {
    source: SOURCE.SHOPIFY,
    source_product_id: gid(p.id),
    title: p.title,
    vendor: p.vendor,
    product_type: p.productType,
    status: PRODUCT_STATUS_MAP[p.status.toUpperCase()] ?? null,
    tags: p.tags,
    handle: p.handle,
    image_url: p.featuredImage?.url ?? null,
    published_at: p.publishedAt ? new Date(p.publishedAt) : null,
    total_variants: p.totalVariants,
    source_metadata: null,
    synced_at: new Date(),
    updated_at: new Date(),
  };
}

export function mapVariants(p: ShopifyProductNode) {
  return p.variants.edges.map((e) => {
    const v = e.node;
    return {
      source: SOURCE.SHOPIFY,
      source_variant_id: gid(v.id),
      source_product_id: gid(p.id),
      product_id: null,
      sku: v.sku,
      title: v.title,
      price: num(v.price) ?? 0,
      compare_at_price: num(v.compareAtPrice),
      weight_grams: weightToGrams(
        v.inventoryItem?.measurement?.weight?.value ?? null,
        v.inventoryItem?.measurement?.weight?.unit ?? null,
      ),
      barcode: v.barcode,
      source_inventory_item_id: v.inventoryItem ? gid(v.inventoryItem.id) : null,
      position: v.position,
      source_metadata: null,
      synced_at: new Date(),
      updated_at: new Date(),
    };
  });
}

export function mapInventoryItems(p: ShopifyProductNode) {
  return p.variants.edges
    .filter((e) => e.node.inventoryItem)
    .map((e) => {
      const v = e.node;
      const inv = v.inventoryItem!;
      return {
        source: SOURCE.SHOPIFY,
        source_inventory_item_id: gid(inv.id),
        source_variant_id: gid(v.id),
        variant_id: null,
        sku: v.sku,
        cost: inv.unitCost ? num(inv.unitCost.amount) : null,
        tracked: inv.tracked,
        hsn_code: inv.harmonizedSystemCode,
        country_of_origin: inv.countryCodeOfOrigin,
        source_metadata: null,
        synced_at: new Date(),
        updated_at: new Date(),
      };
    });
}

export function mapInventoryLevel(level: ShopifyInventoryLevelNode) {
  return {
    source: SOURCE.SHOPIFY,
    source_inventory_item_id: level.source_inventory_item_id,
    source_location_id: level.source_location_id,
    inventory_item_id: null,
    location_id: null,
    available: level.available,
    on_hand: level.on_hand,
    committed: level.committed,
    source_metadata: null,
    synced_at: new Date(),
    updated_at: new Date(),
  };
}

export function variantBulkLine(node: Record<string, unknown>): ShopifyProductVariantNode | null {
  // Bulk JSONL flattens variants as separate rows with __parentId pointing to the product GID.
  if (typeof node.id !== 'string') return null;
  if (typeof node.__parentId !== 'string') return null;
  const inv = node.inventoryItem as ShopifyProductVariantNode['inventoryItem'] | undefined;
  return {
    id: node.id as string,
    sku: (node.sku as string | null) ?? null,
    title: (node.title as string | null) ?? '',
    price: (node.price as string | null) ?? '0',
    compareAtPrice: (node.compareAtPrice as string | null) ?? null,
    barcode: (node.barcode as string | null) ?? null,
    position: (node.position as number) ?? 0,
    inventoryItem: inv ?? null,
  };
}
