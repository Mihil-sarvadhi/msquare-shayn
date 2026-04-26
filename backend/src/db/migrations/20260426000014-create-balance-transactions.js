'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS balance_transactions (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_balance_transaction_id TEXT NOT NULL,
        payout_id BIGINT REFERENCES payouts(id) ON DELETE SET NULL,
        source_payout_id TEXT,
        transaction_id TEXT,
        type TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        fee NUMERIC(12,2),
        net NUMERIC(12,2),
        processed_at TIMESTAMP WITH TIME ZONE,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT balance_tx_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT balance_tx_type_check
          CHECK (type IN ('charge','refund','adjustment','fee','dispute','reserve')),
        CONSTRAINT balance_tx_source_unique UNIQUE (source, source_balance_transaction_id)
      );

      CREATE INDEX IF NOT EXISTS idx_balance_tx_payout_id ON balance_transactions(payout_id);
      CREATE INDEX IF NOT EXISTS idx_balance_tx_source_payout_id ON balance_transactions(source_payout_id);
      CREATE INDEX IF NOT EXISTS idx_balance_tx_processed_at ON balance_transactions(processed_at);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS balance_transactions;`);
  },
};
