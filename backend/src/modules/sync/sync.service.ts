import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { syncShopifyOrders } from '@modules/shopify/shopify.sync';
import { syncMetaInsights } from '@modules/meta/meta.sync';
import {
  backfillShipments,
  syncIthinkShipments,
  syncDailyRemittance,
} from '@modules/ithink/ithink.sync';
import { syncJudgeMe } from '@modules/judgeme/judgeme.sync';
import { syncGA4Data, syncGA4Realtime } from '@modules/ga4/ga4.sync';
import { generateToken } from '@modules/ga4/ga4.token';
import { logger } from '@logger/logger';
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

export async function triggerIthinkBackfill(
  since: string,
  until: string,
): Promise<SyncResult & { since: string; until: string }> {
  await backfillShipments(since, until);
  return { message: 'iThink backfill triggered', since, until };
}

export async function triggerGA4Sync(): Promise<SyncResult> {
  await Promise.all([syncGA4Data(), syncGA4Realtime()]);
  return { message: 'GA4 sync triggered' };
}

interface GA4TokenRow {
  expires_at: string;
}

export async function triggerGA4TokenRefresh(): Promise<SyncResult & { expiresAt: string | null }> {
  await generateToken();
  const [latest] = await sequelize.query<GA4TokenRow>(
    `SELECT expires_at::text
     FROM ga4_tokens
     ORDER BY id DESC
     LIMIT 1`,
    { type: QueryTypes.SELECT },
  );

  return {
    message: 'GA4 token refreshed',
    expiresAt: latest?.expires_at ?? null,
  };
}

export async function triggerJudgeMeSync(): Promise<SyncResult> {
  await syncJudgeMe();
  return { message: 'Judge.me sync triggered' };
}

export async function triggerAllSync(): Promise<SyncResult & { results: Record<string, string> }> {
  await sequelize.query(`UPDATE connector_health SET last_sync_at = NULL`, {
    type: QueryTypes.UPDATE,
  });

  const results: Record<string, string> = {};
  await Promise.allSettled([
    syncShopifyOrders()
      .then(() => {
        results['shopify'] = 'ok';
      })
      .catch((e: Error) => {
        results['shopify'] = e.message;
        logger.error(`[SyncAll] Shopify: ${e.message}`);
      }),
    syncMetaInsights()
      .then(() => {
        results['meta'] = 'ok';
      })
      .catch((e: Error) => {
        results['meta'] = e.message;
        logger.error(`[SyncAll] Meta: ${e.message}`);
      }),
    Promise.all([syncIthinkShipments(), syncDailyRemittance()])
      .then(() => {
        results['ithink'] = 'ok';
      })
      .catch((e: Error) => {
        results['ithink'] = e.message;
        logger.error(`[SyncAll] iThink: ${e.message}`);
      }),
    syncJudgeMe()
      .then(() => {
        results['judgeme'] = 'ok';
      })
      .catch((e: Error) => {
        results['judgeme'] = e.message;
        logger.error(`[SyncAll] JudgeMe: ${e.message}`);
      }),
    Promise.all([syncGA4Data(), syncGA4Realtime()])
      .then(() => {
        results['ga4'] = 'ok';
      })
      .catch((e: Error) => {
        results['ga4'] = e.message;
        logger.error(`[SyncAll] GA4: ${e.message}`);
      }),
  ]);

  return { message: 'Full sync complete', results };
}
