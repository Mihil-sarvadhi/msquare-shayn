'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS orders_refunds (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_refund_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        refund_amount NUMERIC(12,2) NOT NULL,
        refund_currency TEXT NOT NULL DEFAULT 'INR',
        reason TEXT,
        refunded_at TIMESTAMP WITH TIME ZONE,
        restocked BOOLEAN NOT NULL DEFAULT FALSE,
        refund_line_items JSONB,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT orders_refunds_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT orders_refunds_source_unique UNIQUE (source, source_refund_id)
      );

      CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON orders_refunds(order_id);
      CREATE INDEX IF NOT EXISTS idx_refunds_refunded_at ON orders_refunds(refunded_at);
      CREATE INDEX IF NOT EXISTS idx_refunds_source ON orders_refunds(source);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS orders_refunds;`);
  },
};
