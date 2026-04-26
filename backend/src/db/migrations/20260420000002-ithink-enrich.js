'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Add enrichment columns to ithink_shipments
      ALTER TABLE ithink_shipments
        ADD COLUMN IF NOT EXISTS shopify_order_gql_id TEXT,
        ADD COLUMN IF NOT EXISTS weight NUMERIC(8,3),
        ADD COLUMN IF NOT EXISTS last_scan TEXT,
        ADD COLUMN IF NOT EXISTS raw_response JSONB;

      CREATE INDEX IF NOT EXISTS idx_ithink_shopify_gql
        ON ithink_shipments (shopify_order_gql_id);

      -- New table: per-AWB remittance line items
      CREATE TABLE IF NOT EXISTS ithink_remittance_details (
        id              SERIAL PRIMARY KEY,
        remittance_date DATE NOT NULL,
        awb             TEXT NOT NULL,
        order_no        TEXT,
        price           NUMERIC(10,2),
        delivered_date  DATE,
        synced_at       TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (remittance_date, awb)
      );

      CREATE INDEX IF NOT EXISTS idx_remit_detail_date
        ON ithink_remittance_details (remittance_date);
      CREATE INDEX IF NOT EXISTS idx_remit_detail_awb
        ON ithink_remittance_details (awb);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS ithink_remittance_details;
      ALTER TABLE ithink_shipments
        DROP COLUMN IF EXISTS shopify_order_gql_id,
        DROP COLUMN IF EXISTS weight,
        DROP COLUMN IF EXISTS last_scan,
        DROP COLUMN IF EXISTS raw_response;
    `);
  },
};
