'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE unicommerce_orders
        ADD COLUMN IF NOT EXISTS address_line_1   TEXT,
        ADD COLUMN IF NOT EXISTS address_line_2   TEXT,
        ADD COLUMN IF NOT EXISTS landmark         TEXT,
        ADD COLUMN IF NOT EXISTS country          TEXT,
        ADD COLUMN IF NOT EXISTS billing_address  JSONB,
        ADD COLUMN IF NOT EXISTS payment_details  JSONB,
        ADD COLUMN IF NOT EXISTS raw_response     JSONB;

      ALTER TABLE unicommerce_order_items
        ADD COLUMN IF NOT EXISTS raw_response     JSONB;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE unicommerce_order_items
        DROP COLUMN IF EXISTS raw_response;

      ALTER TABLE unicommerce_orders
        DROP COLUMN IF EXISTS raw_response,
        DROP COLUMN IF EXISTS payment_details,
        DROP COLUMN IF EXISTS billing_address,
        DROP COLUMN IF EXISTS country,
        DROP COLUMN IF EXISTS landmark,
        DROP COLUMN IF EXISTS address_line_2,
        DROP COLUMN IF EXISTS address_line_1;
    `);
  },
};
