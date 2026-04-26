import cron from 'node-cron';
import { syncShopifyOrders, syncAbandonedCheckouts } from '@modules/shopify/shopify.sync';
import { syncMetaInsights } from '@modules/meta/meta.sync';
import { syncIthinkShipments, syncDailyRemittance } from '@modules/ithink/ithink.sync';
import { syncJudgeMe } from '@modules/judgeme/judgeme.sync';
import { syncGA4Data, syncGA4Realtime } from '@modules/ga4/ga4.sync';
import { refreshTokenJob } from '@modules/ga4/ga4.token';
import { runIncrementalAll } from '@modules/sync-orchestrator/sync-orchestrator.service';
import { SOURCE } from '@constant';
import { logger } from '@logger/logger';

const TZ = { timezone: 'Asia/Kolkata' };

export function startScheduler(): void {
  // Every 15 min — Shopify orders + abandoned checkouts
  cron.schedule('*/15 * * * *', async () => {
    logger.info('[Cron] Running Shopify sync...');
    await syncShopifyOrders();
    await syncAbandonedCheckouts();
  }, TZ);

  // Every 15 min — Phase 2 orchestrator (finance + future slices)
  cron.schedule(
    '*/15 * * * *',
    async () => {
      logger.info('[Cron] Running orchestrator incremental for shopify...');
      try {
        const results = await runIncrementalAll(SOURCE.SHOPIFY);
        logger.info(`[Cron] Orchestrator synced ${results.length} resources`);
      } catch (err) {
        logger.error(`[Cron] Orchestrator failure: ${(err as Error).message}`);
      }
    },
    TZ,
  );

  // Every 6 hours — Meta Ads insights
  cron.schedule('0 */6 * * *', async () => {
    logger.info('[Cron] Running Meta Ads sync...');
    await syncMetaInsights();
  }, TZ);

  // Every 30 min — iThink shipment tracking
  cron.schedule('*/30 * * * *', async () => {
    logger.info('[Cron] Running iThink tracking sync...');
    await syncIthinkShipments();
  }, TZ);

  // Daily 11:00 PM IST — iThink remittance
  cron.schedule('0 23 * * *', async () => {
    logger.info('[Cron] Running iThink remittance sync...');
    await syncDailyRemittance();
  }, TZ);

  // Daily 2:00 AM IST — Judge.me reviews
  cron.schedule('0 2 * * *', async () => {
    logger.info('[Cron] Running Judge.me sync...');
    await syncJudgeMe();
  }, TZ);

  // Every 30 min — GA4 full sync
  cron.schedule('*/30 * * * *', async () => {
    logger.info('[Cron] Running GA4 sync...');
    await syncGA4Data();
  }, TZ);

  // Every 1 min — GA4 realtime
  cron.schedule('*/1 * * * *', async () => {
    await syncGA4Realtime();
  }, TZ);

  // Every 45 min — GA4 token refresh
  cron.schedule('*/45 * * * *', async () => {
    logger.info('[Cron] Refreshing GA4 token...');
    await refreshTokenJob();
  }, TZ);

  logger.info('[Scheduler] All cron jobs started (timezone: Asia/Kolkata)');

  // Warm up GA4 realtime + sync so the UI isn't empty on first load after restart
  void syncGA4Realtime();
  void syncGA4Data();
}
