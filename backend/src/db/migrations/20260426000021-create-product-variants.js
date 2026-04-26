'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_variant_id TEXT NOT NULL,
        source_product_id TEXT NOT NULL,
        product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
        sku TEXT,
        title TEXT,
        price NUMERIC(12,2),
        compare_at_price NUMERIC(12,2),
        weight_grams NUMERIC(10,3),
        barcode TEXT,
        source_inventory_item_id TEXT,
        position INTEGER,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT variants_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT variants_source_unique UNIQUE (source, source_variant_id)
      );

      CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
      CREATE INDEX IF NOT EXISTS idx_variants_source_product_id ON product_variants(source_product_id);
      CREATE INDEX IF NOT EXISTS idx_variants_source_inv_item ON product_variants(source_inventory_item_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS product_variants;`);
  },
};
