'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS orders_returns (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_return_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        name TEXT,
        status TEXT NOT NULL,
        total_quantity INTEGER NOT NULL DEFAULT 0,
        total_value NUMERIC(12,2) NOT NULL DEFAULT 0,
        return_shipping_fee_total NUMERIC(12,2) NOT NULL DEFAULT 0,
        return_created_at TIMESTAMP WITH TIME ZONE,
        request_approved_at TIMESTAMP WITH TIME ZONE,
        closed_at TIMESTAMP WITH TIME ZONE,
        return_line_items JSONB,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT orders_returns_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT orders_returns_source_unique UNIQUE (source, source_return_id)
      );

      CREATE INDEX IF NOT EXISTS idx_returns_order_id ON orders_returns(order_id);
      CREATE INDEX IF NOT EXISTS idx_returns_return_created_at ON orders_returns(return_created_at);
      CREATE INDEX IF NOT EXISTS idx_returns_source ON orders_returns(source);
      CREATE INDEX IF NOT EXISTS idx_returns_status ON orders_returns(status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS orders_returns;`);
  },
};
