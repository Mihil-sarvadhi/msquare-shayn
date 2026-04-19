import cron from 'node-cron';
import { syncShopifyOrders, syncAbandonedCheckouts } from '@modules/shopify/shopify.sync';
import { syncMetaInsights } from '@modules/meta/meta.sync';
import { syncIthinkShipments, syncDailyRemittance } from '@modules/ithink/ithink.sync';
import { syncJudgeMe } from '@modules/judgeme/judgeme.sync';
import { logger } from '@logger/logger';

export function startScheduler(): void {
  cron.schedule('*/15 * * * *', async () => {
    logger.info('[Cron] Running Shopify sync...');
    await syncShopifyOrders();
    await syncAbandonedCheckouts();
  });

  cron.schedule('0 */6 * * *', async () => {
    logger.info('[Cron] Running Meta Ads sync...');
    await syncMetaInsights();
  });

  cron.schedule('*/30 * * * *', async () => {
    logger.info('[Cron] Running iThink tracking sync...');
    await syncIthinkShipments();
  });

  cron.schedule('0 23 * * *', async () => {
    logger.info('[Cron] Running iThink remittance sync...');
    await syncDailyRemittance();
  });

  cron.schedule('0 2 * * *', async () => {
    logger.info('[Cron] Running Judge.me sync...');
    await syncJudgeMe();
  });

  logger.info('[Scheduler] All cron jobs started');
}
