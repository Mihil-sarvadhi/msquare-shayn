'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS discount_codes (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_discount_code_id TEXT NOT NULL,
        source_price_rule_id TEXT,
        price_rule_id BIGINT REFERENCES price_rules(id) ON DELETE SET NULL,
        code TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 0,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT discount_codes_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT discount_codes_source_unique UNIQUE (source, source_discount_code_id)
      );

      CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
      CREATE INDEX IF NOT EXISTS idx_discount_codes_price_rule ON discount_codes(price_rule_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS discount_codes;`);
  },
};
