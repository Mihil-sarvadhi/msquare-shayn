'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS price_rules (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_price_rule_id TEXT NOT NULL,
        title TEXT,
        value_type TEXT,
        value NUMERIC(12,2),
        target_type TEXT,
        starts_at TIMESTAMP WITH TIME ZONE,
        ends_at TIMESTAMP WITH TIME ZONE,
        usage_limit INTEGER,
        customer_selection TEXT,
        prerequisite_subtotal NUMERIC(12,2),
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT price_rules_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT price_rules_source_unique UNIQUE (source, source_price_rule_id)
      );

      CREATE INDEX IF NOT EXISTS idx_price_rules_starts_at ON price_rules(starts_at);
      CREATE INDEX IF NOT EXISTS idx_price_rules_ends_at ON price_rules(ends_at);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS price_rules;`);
  },
};
