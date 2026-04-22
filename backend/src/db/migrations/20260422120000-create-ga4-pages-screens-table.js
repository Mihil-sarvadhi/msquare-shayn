'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS ga4_pages_screens (
        id                SERIAL PRIMARY KEY,
        date              DATE NOT NULL,
        page_title        TEXT NOT NULL,
        screen_page_views INTEGER DEFAULT 0,
        active_users      INTEGER DEFAULT 0,
        event_count       INTEGER DEFAULT 0,
        bounce_rate       NUMERIC(6,4) DEFAULT 0,
        synced_at         TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(date, page_title)
      );

      CREATE INDEX IF NOT EXISTS idx_ga4_pages_screens_date ON ga4_pages_screens(date);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS ga4_pages_screens;
    `);
  },
};
