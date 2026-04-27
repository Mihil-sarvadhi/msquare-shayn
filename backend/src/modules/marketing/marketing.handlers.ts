import { SOURCE } from '@constant';
import {
  fetchDiscountNodes,
  fetchDisputes,
  fetchGiftCards,
} from '@modules/shopify/shopify.connector';
import { mapDiscountNode, mapDispute, mapGiftCard } from './marketing.mapper';
import {
  linkDiscountCodesToRules,
  upsertDiscountCodes,
  upsertDisputes,
  upsertGiftCards,
  upsertPriceRules,
} from './marketing.repository';
import type {
  ResourceHandler,
  SyncResult,
} from '@modules/sync-orchestrator/sync-orchestrator.types';

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; duration_ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, duration_ms: Date.now() - start };
}

export const discountsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'discounts',
  backfill: async (): Promise<SyncResult> => {
    const { result: count, duration_ms } = await timed(async () => {
      const nodes = await fetchDiscountNodes();
      const ruleRows = nodes.map((n) => mapDiscountNode(n).rule);
      const codeRows = nodes.flatMap((n) => mapDiscountNode(n).codes);
      await upsertPriceRules(ruleRows);
      const c = await upsertDiscountCodes(codeRows);
      await linkDiscountCodesToRules();
      return c;
    });
    return { resource: 'discounts', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
  incremental: async (): Promise<SyncResult> => {
    const { result: count, duration_ms } = await timed(async () => {
      const nodes = await fetchDiscountNodes();
      const ruleRows = nodes.map((n) => mapDiscountNode(n).rule);
      const codeRows = nodes.flatMap((n) => mapDiscountNode(n).codes);
      await upsertPriceRules(ruleRows);
      const c = await upsertDiscountCodes(codeRows);
      await linkDiscountCodesToRules();
      return c;
    });
    return { resource: 'discounts', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
};

export const giftCardsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'gift_cards',
  backfill: async (): Promise<SyncResult> => {
    const { result: count, duration_ms } = await timed(async () => {
      const cards = await fetchGiftCards();
      const rows = cards.map(mapGiftCard);
      return upsertGiftCards(rows);
    });
    return { resource: 'gift_cards', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
  incremental: async (): Promise<SyncResult> => {
    const { result: count, duration_ms } = await timed(async () => {
      const cards = await fetchGiftCards();
      const rows = cards.map(mapGiftCard);
      return upsertGiftCards(rows);
    });
    return { resource: 'gift_cards', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
};

export const disputesHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'disputes',
  backfill: async (): Promise<SyncResult> => {
    const { result: count, duration_ms } = await timed(async () => {
      const disputes = await fetchDisputes();
      const rows = disputes.map(mapDispute);
      return upsertDisputes(rows);
    });
    return { resource: 'disputes', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
  incremental: async (): Promise<SyncResult> => {
    const { result: count, duration_ms } = await timed(async () => {
      const disputes = await fetchDisputes();
      const rows = disputes.map(mapDispute);
      return upsertDisputes(rows);
    });
    return { resource: 'disputes', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
};
