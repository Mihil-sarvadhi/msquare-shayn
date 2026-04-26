import { Sequelize } from 'sequelize';
import { environment } from '@config/config';
import { logger } from '@logger/logger';

export const sequelize = new Sequelize(environment.databaseUrl, {
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg),
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

export const connectDatabase = async (): Promise<void> => {
  await sequelize.authenticate();
};
