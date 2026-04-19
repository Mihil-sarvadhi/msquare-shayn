'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS meta_daily_insights (
        id              SERIAL PRIMARY KEY,
        date            DATE,
        campaign_id     TEXT,
        campaign_name   TEXT,
        objective       TEXT,
        status          TEXT,
        spend           NUMERIC(12,2),
        impressions     INTEGER,
        reach           INTEGER,
        clicks          INTEGER,
        ctr             NUMERIC(6,4),
        cpm             NUMERIC(10,4),
        cpc             NUMERIC(10,4),
        purchases       INTEGER,
        purchase_value  NUMERIC(12,2),
        roas            NUMERIC(8,4),
        synced_at       TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(date, campaign_id)
      );
      CREATE INDEX IF NOT EXISTS idx_meta_date     ON meta_daily_insights(date);
      CREATE INDEX IF NOT EXISTS idx_meta_campaign ON meta_daily_insights(campaign_id);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS meta_daily_insights;`);
  }
};
