'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_location_id TEXT NOT NULL,
        name TEXT,
        address JSONB,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        fulfills_online_orders BOOLEAN NOT NULL DEFAULT FALSE,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT locations_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT locations_source_unique UNIQUE (source, source_location_id)
      );

      CREATE INDEX IF NOT EXISTS idx_locations_source ON locations(source);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS locations;`);
  },
};
