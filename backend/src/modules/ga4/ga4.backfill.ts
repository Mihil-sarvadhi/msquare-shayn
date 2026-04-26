import { connectDatabase, sequelize } from '@db/sequelize';
import { syncGA4Data } from './ga4.sync';
import { logger } from '@logger/logger';

async function main() {
  await connectDatabase();
  logger.info('[GA4 Backfill] Starting 365-day backfill...');

  await syncGA4Data('365daysAgo', 'yesterday');

  logger.info('[GA4 Backfill] Complete');
  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  logger.error(`[GA4 Backfill] Failed: ${(err as Error).message}`);
  process.exit(1);
});
