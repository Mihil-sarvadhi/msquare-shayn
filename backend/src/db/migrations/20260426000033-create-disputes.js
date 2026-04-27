'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_dispute_id TEXT NOT NULL,
        order_id TEXT,
        amount NUMERIC(12,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        reason TEXT,
        status TEXT NOT NULL,
        evidence_due_by TIMESTAMP WITH TIME ZONE,
        finalized_on DATE,
        network_reason_code TEXT,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT disputes_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT disputes_status_check
          CHECK (status IN ('needs_response','under_review','charge_refunded','accepted','won','lost')),
        CONSTRAINT disputes_source_unique UNIQUE (source, source_dispute_id)
      );

      CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
      CREATE INDEX IF NOT EXISTS idx_disputes_evidence_due ON disputes(evidence_due_by);
      CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS disputes;`);
  },
};
