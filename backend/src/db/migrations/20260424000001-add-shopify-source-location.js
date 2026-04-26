'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE shopify_orders
      ADD COLUMN IF NOT EXISTS location_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_orders_location_id ON shopify_orders(location_id);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_orders_location_id;
      ALTER TABLE shopify_orders DROP COLUMN IF EXISTS location_id;
    `);
  },
};
