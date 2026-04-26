'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS shopify_orders (
        order_id           TEXT PRIMARY KEY,
        order_name         TEXT,
        created_at         TIMESTAMPTZ,
        channel            TEXT,
        revenue            NUMERIC(12,2),
        payment_mode       TEXT,
        financial_status   TEXT,
        fulfillment_status TEXT,
        customer_id        TEXT,
        customer_email     TEXT,
        customer_city      TEXT,
        customer_state     TEXT,
        discount_code      TEXT,
        synced_at          TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS shopify_order_lineitems (
        id         SERIAL PRIMARY KEY,
        order_id   TEXT REFERENCES shopify_orders(order_id) ON DELETE CASCADE,
        sku        TEXT,
        product_id TEXT,
        title      TEXT,
        variant    TEXT,
        quantity   INTEGER,
        unit_price NUMERIC(10,2)
      );
      CREATE TABLE IF NOT EXISTS shopify_customers (
        customer_id   TEXT PRIMARY KEY,
        email         TEXT,
        first_name    TEXT,
        last_name     TEXT,
        city          TEXT,
        state         TEXT,
        orders_count  INTEGER,
        total_spent   NUMERIC(12,2),
        created_at    TIMESTAMPTZ,
        synced_at     TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS shopify_abandoned_checkouts (
        checkout_id TEXT PRIMARY KEY,
        created_at  TIMESTAMPTZ,
        cart_value  NUMERIC(12,2),
        email       TEXT,
        recovered   BOOLEAN DEFAULT FALSE,
        stage       TEXT,
        synced_at   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON shopify_orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_payment_mode ON shopify_orders(payment_mode);
      CREATE INDEX IF NOT EXISTS idx_orders_channel      ON shopify_orders(channel);
      CREATE INDEX IF NOT EXISTS idx_lineitems_order_id  ON shopify_order_lineitems(order_id);
      CREATE INDEX IF NOT EXISTS idx_lineitems_product_id ON shopify_order_lineitems(product_id);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS shopify_order_lineitems;
      DROP TABLE IF EXISTS shopify_abandoned_checkouts;
      DROP TABLE IF EXISTS shopify_customers;
      DROP TABLE IF EXISTS shopify_orders;
    `);
  }
};
