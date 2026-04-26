'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS payouts (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_payout_id TEXT NOT NULL,
        payout_date DATE,
        status TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        bank_summary JSONB,
        charges_gross NUMERIC(12,2),
        refunds_gross NUMERIC(12,2),
        adjustments_gross NUMERIC(12,2),
        fees_total NUMERIC(12,2),
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT payouts_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT payouts_status_check
          CHECK (status IN ('scheduled','in_transit','paid','failed','cancelled')),
        CONSTRAINT payouts_source_unique UNIQUE (source, source_payout_id)
      );

      CREATE INDEX IF NOT EXISTS idx_payouts_payout_date ON payouts(payout_date);
      CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS payouts;`);
  },
};
