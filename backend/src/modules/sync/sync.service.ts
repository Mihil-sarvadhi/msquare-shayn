import { syncShopifyOrders } from '@modules/shopify/shopify.sync';
import { syncMetaInsights } from '@modules/meta/meta.sync';
import { syncIthinkShipments, syncDailyRemittance } from '@modules/ithink/ithink.sync';
import { syncJudgeMe } from '@modules/judgeme/judgeme.sync';
import type { SyncResult } from './sync.types';

export async function triggerShopifySync(): Promise<SyncResult> {
  await syncShopifyOrders();
  return { message: 'Shopify sync triggered' };
}

export async function triggerMetaSync(): Promise<SyncResult> {
  await syncMetaInsights();
  return { message: 'Meta sync triggered' };
}

export async function triggerIthinkSync(): Promise<SyncResult> {
  await syncIthinkShipments();
  await syncDailyRemittance();
  return { message: 'iThink sync triggered' };
}

export async function triggerJudgeMeSync(): Promise<SyncResult> {
  await syncJudgeMe();
  return { message: 'Judge.me sync triggered' };
}
