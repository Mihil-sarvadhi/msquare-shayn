'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS gift_cards (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_gift_card_id TEXT NOT NULL,
        code_last4 TEXT,
        initial_value NUMERIC(12,2) NOT NULL,
        balance NUMERIC(12,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        customer_id TEXT,
        expires_on DATE,
        disabled_at TIMESTAMP WITH TIME ZONE,
        status TEXT NOT NULL DEFAULT 'enabled',
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT gift_cards_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT gift_cards_status_check
          CHECK (status IN ('enabled','disabled','expired')),
        CONSTRAINT gift_cards_source_unique UNIQUE (source, source_gift_card_id)
      );

      CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
      CREATE INDEX IF NOT EXISTS idx_gift_cards_expires ON gift_cards(expires_on);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS gift_cards;`);
  },
};
