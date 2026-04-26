import http from 'http';
import { createApp } from '@app/app';
import { environment } from '@config/config';
import { GlobalErrorHandler } from '@middleware';
import { connectDatabase } from '@db/sequelize';
import { logger } from '@logger/logger';
import { startScheduler } from '@modules/jobs/scheduler';
import { registerFinanceResources } from '@modules/finance';

// BigInt serialization for JSON responses
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function toJSON() {
  return this.toString();
};

const app = createApp();
const server = http.createServer(app);

const startServer = async () => {
  GlobalErrorHandler();

  try {
    await connectDatabase();
    logger.info('Database connection established successfully.');
  } catch (error) {
    logger.error(
      `Failed to connect to database: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  }

  registerFinanceResources();
  logger.info('Finance resource handlers registered.');

  startScheduler();

  server.listen(environment.port, () => {
    logger.info(
      `SHAYN MIS Backend running on port ${environment.port} (env: ${environment.appEnv})`,
    );
  });
};

void startServer();
