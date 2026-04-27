import { Sequelize } from 'sequelize';
import { environment } from '@config/config';
import { logger } from '@logger/logger';

/**
 * Shayn is an India-only D2C business — every dashboard, KPI and date-bucket
 * report should use IST. Force the postgres session timezone to Asia/Kolkata so
 * `created_at::date`, `date_trunc('day', created_at)`, and `BETWEEN :since AND
 * :until` all bucket by IST midnight (matching what the user sees in the UI).
 * Without this, an order placed at 12:17 AM IST on Apr 27 (= 18:47 UTC Apr 26)
 * would be counted in Apr 26's bucket while the UI shows it under Apr 27.
 */
export const sequelize = new Sequelize(environment.databaseUrl, {
  dialect: 'postgres',
  timezone: '+05:30',
  logging: (msg) => logger.debug(msg),
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  hooks: {
    afterConnect: async (connection: unknown) => {
      const conn = connection as { query: (sql: string) => Promise<unknown> };
      await conn.query(`SET TIME ZONE 'Asia/Kolkata'`);
    },
  },
});

export const connectDatabase = async (): Promise<void> => {
  await sequelize.authenticate();
};
