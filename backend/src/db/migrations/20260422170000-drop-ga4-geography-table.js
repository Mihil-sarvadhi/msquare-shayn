'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS ga4_geography;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('ga4_geography', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      country: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Unknown' },
      region: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Unknown' },
      city: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Unknown' },
      active_users: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sessions: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      purchase_revenue: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      transactions: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      synced_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addConstraint('ga4_geography', {
      fields: ['date', 'country', 'region', 'city'],
      type: 'unique',
      name: 'ga4_geography_date_country_region_city_key',
    });

    await queryInterface.addIndex('ga4_geography', ['date'], {
      name: 'idx_ga4_geography_date',
    });
    await queryInterface.addIndex('ga4_geography', ['country'], {
      name: 'idx_ga4_geography_country',
    });
  },
};
