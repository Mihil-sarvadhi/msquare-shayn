import cron from 'node-cron';
import { syncShopifyOrders, syncAbandonedCheckouts } from '@modules/shopify/shopify.sync';
import { syncMetaInsights } from '@modules/meta/meta.sync';
import { syncIthinkShipments, syncDailyRemittance } from '@modules/ithink/ithink.sync';
import { syncJudgeMe } from '@modules/judgeme/judgeme.sync';
import { logger } from '@logger/logger';

const TZ = { timezone: 'Asia/Kolkata' };

export function startScheduler(): void {
  // Every 15 min — Shopify orders + abandoned checkouts
  cron.schedule('*/15 * * * *', async () => {
    logger.info('[Cron] Running Shopify sync...');
    await syncShopifyOrders();
    await syncAbandonedCheckouts();
  }, TZ);

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

  logger.info('[Scheduler] All cron jobs started (timezone: Asia/Kolkata)');
}
