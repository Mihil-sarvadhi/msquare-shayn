'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_product_id TEXT NOT NULL,
        title TEXT,
        vendor TEXT,
        product_type TEXT,
        status TEXT,
        tags TEXT[],
        handle TEXT,
        image_url TEXT,
        published_at TIMESTAMP WITH TIME ZONE,
        total_variants INTEGER NOT NULL DEFAULT 0,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT products_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT products_status_check
          CHECK (status IS NULL OR status IN ('active','draft','archived')),
        CONSTRAINT products_source_unique UNIQUE (source, source_product_id)
      );

      CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
      CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
      CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS products;`);
  },
};
