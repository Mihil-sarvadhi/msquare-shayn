'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS orders_transactions (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_transaction_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL,
        gateway TEXT,
        amount NUMERIC(12,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        payment_method TEXT,
        processed_at TIMESTAMP WITH TIME ZONE,
        parent_transaction_id TEXT,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT orders_transactions_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT orders_transactions_kind_check
          CHECK (kind IN ('sale','authorization','capture','refund','void')),
        CONSTRAINT orders_transactions_status_check
          CHECK (status IN ('success','pending','failure','error')),
        CONSTRAINT orders_transactions_source_unique UNIQUE (source, source_transaction_id)
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON orders_transactions(order_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_processed_at ON orders_transactions(processed_at);
      CREATE INDEX IF NOT EXISTS idx_transactions_gateway ON orders_transactions(gateway);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS orders_transactions;`);
  },
};
