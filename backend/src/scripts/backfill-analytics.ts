import { backfillAnalyticsDaily } from '@modules/shopify/shopify.backfill';
import { logger } from '@logger/logger';
import { sequelize } from '@db/sequelize';

async function main(): Promise<void> {
  await sequelize.authenticate();
  const result = await backfillAnalyticsDaily();
  logger.info(`[Backfill analytics] DONE: ${JSON.stringify(result)}`);
  await sequelize.close();
}

main().catch((err) => {
  // Surface the underlying DB error if Sequelize has wrapped it
  const e = err as { message?: string; original?: { message?: string }; parent?: { message?: string } };
  logger.error(
    `[Backfill analytics] FAILED: msg=${e.message} original=${e.original?.message} parent=${e.parent?.message}`,
  );
  if (err instanceof Error) logger.error(err.stack ?? '');
  process.exit(1);
});
