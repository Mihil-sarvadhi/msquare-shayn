'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS inventory_levels (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_inventory_item_id TEXT NOT NULL,
        source_location_id TEXT NOT NULL,
        inventory_item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
        location_id BIGINT REFERENCES locations(id) ON DELETE CASCADE,
        available INTEGER NOT NULL DEFAULT 0,
        on_hand INTEGER,
        committed INTEGER,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT inv_levels_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT inv_levels_source_unique
          UNIQUE (source, source_inventory_item_id, source_location_id)
      );

      CREATE INDEX IF NOT EXISTS idx_inv_levels_item ON inventory_levels(inventory_item_id);
      CREATE INDEX IF NOT EXISTS idx_inv_levels_location ON inventory_levels(location_id);
      CREATE INDEX IF NOT EXISTS idx_inv_levels_available ON inventory_levels(available);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS inventory_levels;`);
  },
};
