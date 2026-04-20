'use strict';
require('dotenv').config(); // auto-load .env so sequelize-cli works without manual env prefixing

process.env.NODE_ENV = process.env.NODE_ENV || 'local';

/** @type {Record<string, import('sequelize').Options>} */
module.exports = {
  local: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: { ssl: false },
  },
  dev: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
  },
  staging: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  },
};
