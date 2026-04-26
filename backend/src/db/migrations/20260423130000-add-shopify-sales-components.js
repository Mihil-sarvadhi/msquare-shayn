'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE shopify_orders
      ADD COLUMN IF NOT EXISTS gross_sales NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS total_discounts NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS total_tax NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS total_shipping NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS total_refunded NUMERIC(12,2);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE shopify_orders
      DROP COLUMN IF EXISTS total_refunded,
      DROP COLUMN IF EXISTS total_shipping,
      DROP COLUMN IF EXISTS total_tax,
      DROP COLUMN IF EXISTS total_discounts,
      DROP COLUMN IF EXISTS gross_sales;
    `);
  },
};
