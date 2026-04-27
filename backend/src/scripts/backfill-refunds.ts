import { runBackfill } from '@modules/sync-orchestrator/sync-orchestrator.service';
import { registerFinanceResources } from '@modules/finance';
import { SOURCE } from '@constant';
import { logger } from '@logger/logger';
import { sequelize } from '@db/sequelize';

const RESOURCE = process.argv[2] ?? 'refunds';

async function main(): Promise<void> {
  await sequelize.authenticate();
  registerFinanceResources();
  const result = await runBackfill(SOURCE.SHOPIFY, RESOURCE);
  logger.info(`[Backfill ${RESOURCE}] DONE: ${JSON.stringify(result)}`);
  await sequelize.close();
}

main().catch((err) => {
  logger.error(`[Backfill ${RESOURCE}] FAILED: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
