'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE shopify_orders
        ADD COLUMN IF NOT EXISTS tags              JSONB,
        ADD COLUMN IF NOT EXISTS test              BOOLEAN,
        ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS processed_at      TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS cancelled_at      TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS cancel_reason     TEXT,
        ADD COLUMN IF NOT EXISTS closed            BOOLEAN,
        ADD COLUMN IF NOT EXISTS closed_at         TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS confirmed         BOOLEAN,
        ADD COLUMN IF NOT EXISTS note              TEXT,
        ADD COLUMN IF NOT EXISTS subtotal          NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS total_tips        NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS currency          TEXT,
        ADD COLUMN IF NOT EXISTS presentment_currency TEXT,
        ADD COLUMN IF NOT EXISTS accepts_marketing BOOLEAN,
        ADD COLUMN IF NOT EXISTS risk_level        TEXT,
        ADD COLUMN IF NOT EXISTS return_status     TEXT,
        ADD COLUMN IF NOT EXISTS shipping_method   TEXT,
        ADD COLUMN IF NOT EXISTS source_identifier TEXT,
        ADD COLUMN IF NOT EXISTS order_email       TEXT,
        ADD COLUMN IF NOT EXISTS order_phone       TEXT,
        ADD COLUMN IF NOT EXISTS customer_pincode  TEXT,
        ADD COLUMN IF NOT EXISTS customer_country  TEXT,
        ADD COLUMN IF NOT EXISTS customer_address1 TEXT,
        ADD COLUMN IF NOT EXISTS customer_address2 TEXT,
        ADD COLUMN IF NOT EXISTS billing_city      TEXT,
        ADD COLUMN IF NOT EXISTS billing_state     TEXT,
        ADD COLUMN IF NOT EXISTS billing_country   TEXT,
        ADD COLUMN IF NOT EXISTS billing_zip       TEXT;

      CREATE INDEX IF NOT EXISTS idx_orders_updated_at       ON shopify_orders(updated_at);
      CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at     ON shopify_orders(cancelled_at);
      CREATE INDEX IF NOT EXISTS idx_orders_customer_pincode ON shopify_orders(customer_pincode);
      CREATE INDEX IF NOT EXISTS idx_orders_customer_country ON shopify_orders(customer_country);
      CREATE INDEX IF NOT EXISTS idx_orders_test             ON shopify_orders(test);
      CREATE INDEX IF NOT EXISTS idx_orders_return_status    ON shopify_orders(return_status);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_orders_return_status;
      DROP INDEX IF EXISTS idx_orders_test;
      DROP INDEX IF EXISTS idx_orders_customer_country;
      DROP INDEX IF EXISTS idx_orders_customer_pincode;
      DROP INDEX IF EXISTS idx_orders_cancelled_at;
      DROP INDEX IF EXISTS idx_orders_updated_at;

      ALTER TABLE shopify_orders
        DROP COLUMN IF EXISTS billing_zip,
        DROP COLUMN IF EXISTS billing_country,
        DROP COLUMN IF EXISTS billing_state,
        DROP COLUMN IF EXISTS billing_city,
        DROP COLUMN IF EXISTS customer_address2,
        DROP COLUMN IF EXISTS customer_address1,
        DROP COLUMN IF EXISTS customer_country,
        DROP COLUMN IF EXISTS customer_pincode,
        DROP COLUMN IF EXISTS order_phone,
        DROP COLUMN IF EXISTS order_email,
        DROP COLUMN IF EXISTS source_identifier,
        DROP COLUMN IF EXISTS shipping_method,
        DROP COLUMN IF EXISTS return_status,
        DROP COLUMN IF EXISTS risk_level,
        DROP COLUMN IF EXISTS accepts_marketing,
        DROP COLUMN IF EXISTS presentment_currency,
        DROP COLUMN IF EXISTS currency,
        DROP COLUMN IF EXISTS total_tips,
        DROP COLUMN IF EXISTS subtotal,
        DROP COLUMN IF EXISTS note,
        DROP COLUMN IF EXISTS confirmed,
        DROP COLUMN IF EXISTS closed_at,
        DROP COLUMN IF EXISTS closed,
        DROP COLUMN IF EXISTS cancel_reason,
        DROP COLUMN IF EXISTS cancelled_at,
        DROP COLUMN IF EXISTS processed_at,
        DROP COLUMN IF EXISTS updated_at,
        DROP COLUMN IF EXISTS test,
        DROP COLUMN IF EXISTS tags;
    `);
  },
};
