'use strict';

/**
 * Add `orders_fulfilled` to shopify_analytics_daily so the Finance tile
 * can pull it from Shopify's `fulfillments` ShopifyQL dataset (which buckets
 * by fulfillment date, matching Shopify Admin) instead of `shopify_orders`
 * (which buckets by created_at and undercounts).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('shopify_analytics_daily', 'orders_fulfilled', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('shopify_analytics_daily', 'orders_fulfilled');
  },
};
