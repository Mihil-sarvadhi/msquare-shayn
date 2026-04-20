import cron from 'node-cron';
import { syncShopifyOrders, syncAbandonedCheckouts } from './shopifySync';
import { syncMetaInsights } from './metaSync';
import { syncIthinkShipments, syncDailyRemittance } from '../modules/ithink/ithink.sync';
import { syncJudgeMe } from './judgeMeSync';

export function startScheduler(): void {
  // Shopify orders: every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.error('[Cron] Running Shopify sync...');
    await syncShopifyOrders();
    await syncAbandonedCheckouts();
  });

  // Meta Ads: every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.error('[Cron] Running Meta Ads sync...');
    await syncMetaInsights();
  });

  // iThink tracking: every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.error('[Cron] Running iThink tracking sync...');
    await syncIthinkShipments();
  });

  // iThink remittance: daily at 11pm
  cron.schedule('0 23 * * *', async () => {
    console.error('[Cron] Running iThink remittance sync...');
    await syncDailyRemittance();
  });

  // Judge.me: daily at 2am
  cron.schedule('0 2 * * *', async () => {
    console.error('[Cron] Running Judge.me sync...');
    await syncJudgeMe();
  });

  console.error('[Scheduler] All cron jobs started');
}
