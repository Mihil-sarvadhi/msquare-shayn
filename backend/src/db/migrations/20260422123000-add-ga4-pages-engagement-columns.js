'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE ga4_pages_screens
      ADD COLUMN IF NOT EXISTS avg_engagement_time_per_active_user NUMERIC(10,2) DEFAULT 0;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE ga4_pages_screens
      DROP COLUMN IF EXISTS avg_engagement_time_per_active_user;
    `);
  },
};
