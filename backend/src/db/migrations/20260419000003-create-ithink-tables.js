'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS ithink_shipments (
        awb                  TEXT PRIMARY KEY,
        order_id             TEXT,
        order_date           DATE,
        courier              TEXT,
        zone                 TEXT,
        payment_mode         TEXT,
        current_status       TEXT,
        current_status_code  TEXT,
        customer_state       TEXT,
        customer_city        TEXT,
        customer_pincode     TEXT,
        billed_fwd_charges   NUMERIC(10,2),
        billed_rto_charges   NUMERIC(10,2),
        billed_cod_charges   NUMERIC(10,2),
        billed_gst_charges   NUMERIC(10,2),
        billed_total         NUMERIC(10,2),
        remittance_amount    NUMERIC(10,2),
        ofd_count            INTEGER DEFAULT 0,
        delivered_date       DATE,
        rto_date             DATE,
        expected_delivery    DATE,
        synced_at            TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ithink_remittance (
        id                SERIAL PRIMARY KEY,
        remittance_date   DATE UNIQUE,
        cod_generated     NUMERIC(12,2),
        bill_adjusted     NUMERIC(12,2),
        transaction_fee   NUMERIC(10,2),
        gst_charges       NUMERIC(10,2),
        wallet_amount     NUMERIC(12,2),
        advance_hold      NUMERIC(12,2),
        cod_remitted      NUMERIC(12,2),
        synced_at         TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ithink_status       ON ithink_shipments(current_status_code);
      CREATE INDEX IF NOT EXISTS idx_ithink_order_date   ON ithink_shipments(order_date);
      CREATE INDEX IF NOT EXISTS idx_ithink_order_id     ON ithink_shipments(order_id);
      CREATE INDEX IF NOT EXISTS idx_ithink_remit_date   ON ithink_remittance(remittance_date);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS ithink_remittance;
      DROP TABLE IF EXISTS ithink_shipments;
    `);
  }
};
