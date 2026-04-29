'use strict';

/**
 * Daily-aggregated Shopify Analytics for the Finance storefront KPI strip.
 *
 * `sessions` is fetched via the GraphQL `shopifyqlQuery`:
 *   FROM sessions SHOW sessions SINCE :from UNTIL :to GROUP BY day
 * Only metric we currently expose; cart-add datasets are not accessible
 * on this store's plan tier (verified 2026-04-29).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('shopify_analytics_daily', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      source: { type: Sequelize.TEXT, allowNull: false, defaultValue: 'shopify' },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      sessions: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      synced_at: { type: Sequelize.DATE, allowNull: false },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
    await queryInterface.addConstraint('shopify_analytics_daily', {
      fields: ['source', 'date'],
      type: 'unique',
      name: 'shopify_analytics_daily_source_date_uq',
    });
    await queryInterface.addIndex('shopify_analytics_daily', ['date'], {
      name: 'shopify_analytics_daily_date_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('shopify_analytics_daily');
  },
};
