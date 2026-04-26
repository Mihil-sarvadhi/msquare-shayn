'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_inventory_item_id TEXT NOT NULL,
        source_variant_id TEXT,
        variant_id BIGINT REFERENCES product_variants(id) ON DELETE SET NULL,
        sku TEXT,
        cost NUMERIC(12,2),
        tracked BOOLEAN NOT NULL DEFAULT TRUE,
        hsn_code TEXT,
        country_of_origin TEXT,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT inventory_items_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT inventory_items_source_unique UNIQUE (source, source_inventory_item_id)
      );

      CREATE INDEX IF NOT EXISTS idx_inv_items_variant_id ON inventory_items(variant_id);
      CREATE INDEX IF NOT EXISTS idx_inv_items_sku ON inventory_items(sku);
      CREATE INDEX IF NOT EXISTS idx_inv_items_source_variant_id ON inventory_items(source_variant_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS inventory_items;`);
  },
};
