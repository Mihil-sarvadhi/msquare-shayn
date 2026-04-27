'use strict';

/**
 * Adds the Shopify-side captured-revenue signals to shopify_orders so the
 * computed sales-breakdown can match Shopify's "Net sales" exactly:
 *   - total_received      : amount actually paid by the customer (PAID portion)
 *   - total_outstanding   : balance still owed (PARTIALLY_PAID, PENDING)
 *   - current_total_price : totalPrice net of refunds (post-refund balance)
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE shopify_orders
        ADD COLUMN IF NOT EXISTS total_received      NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS total_outstanding   NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS current_total_price NUMERIC(12,2);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE shopify_orders
        DROP COLUMN IF EXISTS current_total_price,
        DROP COLUMN IF EXISTS total_outstanding,
        DROP COLUMN IF EXISTS total_received;
    `);
  },
};
