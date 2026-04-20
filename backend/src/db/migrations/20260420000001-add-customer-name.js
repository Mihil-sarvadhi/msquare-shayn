'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE shopify_orders
      ADD COLUMN IF NOT EXISTS customer_name TEXT;
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE shopify_orders
      DROP COLUMN IF EXISTS customer_name;
    `);
  },
};
