import axios from 'axios';
import { logger } from '@logger/logger';
import { SOURCE } from '@constant';
import { Location } from '@db/models';
import {
  fetchInventoryLevels,
  fetchProductsDelta,
  startProductsBulkBackfill,
  waitForBulkOperationUrl,
  type ShopifyProductNode,
} from '@modules/shopify/shopify.connector';
import {
  mapInventoryItems,
  mapInventoryLevel,
  mapProduct,
  mapVariants,
  variantBulkLine,
} from './catalog.mapper';
import { upsertProducts } from './products.repository';
import { linkVariantsToProducts, upsertVariants } from './variants.repository';
import {
  linkInventoryFKs,
  upsertInventoryItems,
  upsertInventoryLevels,
} from './inventory.repository';
import type {
  ResourceHandler,
  SyncResult,
} from '@modules/sync-orchestrator/sync-orchestrator.types';

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; duration_ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, duration_ms: Date.now() - start };
}

async function downloadJsonl(url: string): Promise<Record<string, unknown>[]> {
  const response = await axios.get<string>(url, { responseType: 'text' });
  const lines = response.data.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((l) => JSON.parse(l) as Record<string, unknown>);
}

async function persistProductsBatch(products: ShopifyProductNode[]): Promise<number> {
  const productRows = products.map(mapProduct);
  await upsertProducts(productRows);

  const variantRows = products.flatMap(mapVariants);
  await upsertVariants(variantRows);
  await linkVariantsToProducts();

  const inventoryItemRows = products.flatMap(mapInventoryItems);
  await upsertInventoryItems(inventoryItemRows);
  await linkInventoryFKs();

  return productRows.length;
}

export const productsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'products',
  backfill: async (): Promise<SyncResult> => {
    const start = Date.now();
    const op = await startProductsBulkBackfill();
    logger.info(`[Products Backfill] Bulk op submitted: ${op.id}`);
    const url = await waitForBulkOperationUrl(op.id);
    const lines = await downloadJsonl(url);

    // Group bulk JSONL: top-level rows are products; nested variant rows have __parentId
    const productMap = new Map<string, ShopifyProductNode>();
    for (const node of lines) {
      const id = node.id as string | undefined;
      const parentId = node.__parentId as string | undefined;
      if (!parentId && id) {
        productMap.set(id, {
          id,
          title: (node.title as string) ?? '',
          vendor: (node.vendor as string | null) ?? null,
          productType: (node.productType as string | null) ?? null,
          status: (node.status as string) ?? 'ACTIVE',
          tags: (node.tags as string[]) ?? [],
          handle: (node.handle as string) ?? '',
          publishedAt: (node.publishedAt as string | null) ?? null,
          totalVariants: (node.totalVariants as number) ?? 0,
          featuredImage: (node.featuredImage as { url: string | null } | null) ?? null,
          variants: { edges: [] },
        });
      } else if (parentId) {
        const variant = variantBulkLine(node);
        if (variant) {
          const parent = productMap.get(parentId);
          if (parent) parent.variants.edges.push({ node: variant });
        }
      }
    }

    const products = Array.from(productMap.values());
    let total = 0;
    // Process in batches of 100 to keep memory bounded
    const BATCH = 100;
    for (let i = 0; i < products.length; i += BATCH) {
      total += await persistProductsBatch(products.slice(i, i + BATCH));
    }

    logger.info(`[Products Backfill] op=${op.id} products=${total}`);
    return {
      resource: 'products',
      source: SOURCE.SHOPIFY,
      records_synced: total,
      duration_ms: Date.now() - start,
      bulk_op_id: op.id,
    };
  },
  incremental: async ({ sinceDate }): Promise<SyncResult> => {
    const start = Date.now();
    const products = await fetchProductsDelta(sinceDate);
    const total = await persistProductsBatch(products);
    return {
      resource: 'products',
      source: SOURCE.SHOPIFY,
      records_synced: total,
      duration_ms: Date.now() - start,
    };
  },
};

export const inventoryLevelsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'inventory_levels',
  backfill: async (): Promise<SyncResult> => {
    const { result, duration_ms } = await timed(async () => {
      const locations = await Location.findAll({
        where: { source: SOURCE.SHOPIFY, active: true },
      });
      const locationGids = locations.map((l) => l.source_location_id);
      const levels = await fetchInventoryLevels(locationGids);
      const rows = levels.map(mapInventoryLevel);
      const count = await upsertInventoryLevels(rows);
      await linkInventoryFKs();
      return count;
    });
    return {
      resource: 'inventory_levels',
      source: SOURCE.SHOPIFY,
      records_synced: result,
      duration_ms,
    };
  },
  incremental: async (): Promise<SyncResult> => {
    // Snapshot every tick — same as backfill (small dataset)
    const { result, duration_ms } = await timed(async () => {
      const locations = await Location.findAll({
        where: { source: SOURCE.SHOPIFY, active: true },
      });
      const locationGids = locations.map((l) => l.source_location_id);
      const levels = await fetchInventoryLevels(locationGids);
      const rows = levels.map(mapInventoryLevel);
      const count = await upsertInventoryLevels(rows);
      await linkInventoryFKs();
      return count;
    });
    return {
      resource: 'inventory_levels',
      source: SOURCE.SHOPIFY,
      records_synced: result,
      duration_ms,
    };
  },
};
