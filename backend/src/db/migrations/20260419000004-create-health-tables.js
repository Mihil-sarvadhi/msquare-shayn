'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS connector_health (
        id              SERIAL PRIMARY KEY,
        connector_name  TEXT UNIQUE,
        last_sync_at    TIMESTAMPTZ,
        status          TEXT DEFAULT 'unknown',
        error_message   TEXT,
        records_synced  INTEGER DEFAULT 0,
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS connector_health;`);
  }
};
