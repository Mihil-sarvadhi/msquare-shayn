'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS unicommerce_tokens (
        id              SERIAL PRIMARY KEY,
        access_token    TEXT NOT NULL,
        refresh_token   TEXT NOT NULL,
        expires_at      TIMESTAMPTZ NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS unicommerce_orders (
        order_code            TEXT PRIMARY KEY,
        display_order_code    TEXT,
        channel               TEXT,
        status                TEXT,
        order_date            TIMESTAMPTZ,
        updated_date          TIMESTAMPTZ,
        fulfillment_tat       TIMESTAMPTZ,
        cod                   BOOLEAN DEFAULT FALSE,
        currency              TEXT DEFAULT 'INR',
        total_price           NUMERIC(12,2) DEFAULT 0,
        shipping_charges      NUMERIC(10,2) DEFAULT 0,
        discount              NUMERIC(10,2) DEFAULT 0,
        cod_charges           NUMERIC(10,2) DEFAULT 0,
        prepaid_amount        NUMERIC(10,2) DEFAULT 0,
        customer_name         TEXT,
        customer_email        TEXT,
        customer_mobile       TEXT,
        city                  TEXT,
        state                 TEXT,
        pincode               TEXT,
        facility_code         TEXT,
        third_party_shipping  BOOLEAN DEFAULT FALSE,
        on_hold               BOOLEAN DEFAULT FALSE,
        synced_at             TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS unicommerce_order_items (
        id                SERIAL PRIMARY KEY,
        order_code        TEXT REFERENCES unicommerce_orders(order_code) ON DELETE CASCADE,
        item_code         TEXT,
        sku               TEXT,
        product_name      TEXT,
        quantity          INTEGER DEFAULT 1,
        selling_price     NUMERIC(10,2) DEFAULT 0,
        discount          NUMERIC(10,2) DEFAULT 0,
        shipping_charges  NUMERIC(10,2) DEFAULT 0,
        cod_charges       NUMERIC(10,2) DEFAULT 0,
        total_price       NUMERIC(10,2) DEFAULT 0,
        transfer_price    NUMERIC(10,2) DEFAULT 0,
        status            TEXT,
        channel           TEXT,
        return_reason     TEXT,
        return_date       TEXT,
        return_awb        TEXT,
        facility_code     TEXT,
        synced_at         TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(order_code, item_code)
      );

      CREATE TABLE IF NOT EXISTS unicommerce_shipments (
        shipment_code      TEXT PRIMARY KEY,
        order_code         TEXT,
        awb                TEXT,
        courier            TEXT,
        status             TEXT,
        dispatch_date      TIMESTAMPTZ,
        expected_delivery  TIMESTAMPTZ,
        channel            TEXT,
        facility_code      TEXT,
        weight             NUMERIC(8,3),
        synced_at          TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS unicommerce_returns (
        id              SERIAL PRIMARY KEY,
        shipment_code   TEXT,
        order_code      TEXT,
        return_awb      TEXT,
        return_reason   TEXT,
        status          TEXT,
        channel         TEXT,
        facility_code   TEXT,
        created_date    TIMESTAMPTZ,
        completed_date  TIMESTAMPTZ,
        synced_at       TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS unicommerce_inventory (
        sku             TEXT PRIMARY KEY,
        available_qty   INTEGER DEFAULT 0,
        on_hold_qty     INTEGER DEFAULT 0,
        damaged_qty     INTEGER DEFAULT 0,
        total_qty       INTEGER DEFAULT 0,
        facility_code   TEXT,
        synced_at       TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS unicommerce_channel_daily (
        id                SERIAL PRIMARY KEY,
        date              DATE,
        channel           TEXT,
        orders            INTEGER DEFAULT 0,
        revenue           NUMERIC(12,2) DEFAULT 0,
        units_sold        INTEGER DEFAULT 0,
        cancelled_orders  INTEGER DEFAULT 0,
        returned_orders   INTEGER DEFAULT 0,
        cod_orders        INTEGER DEFAULT 0,
        prepaid_orders    INTEGER DEFAULT 0,
        synced_at         TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(date, channel)
      );

      CREATE INDEX IF NOT EXISTS idx_uc_orders_channel       ON unicommerce_orders(channel);
      CREATE INDEX IF NOT EXISTS idx_uc_orders_date          ON unicommerce_orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_uc_orders_status        ON unicommerce_orders(status);
      CREATE INDEX IF NOT EXISTS idx_uc_orders_updated       ON unicommerce_orders(updated_date);
      CREATE INDEX IF NOT EXISTS idx_uc_items_sku            ON unicommerce_order_items(sku);
      CREATE INDEX IF NOT EXISTS idx_uc_items_channel        ON unicommerce_order_items(channel);
      CREATE INDEX IF NOT EXISTS idx_uc_shipments_order      ON unicommerce_shipments(order_code);
      CREATE INDEX IF NOT EXISTS idx_uc_returns_order        ON unicommerce_returns(order_code);
      CREATE INDEX IF NOT EXISTS idx_uc_returns_created      ON unicommerce_returns(created_date);
      CREATE INDEX IF NOT EXISTS idx_uc_channel_daily_date   ON unicommerce_channel_daily(date);

      INSERT INTO connector_health (connector_name, status)
      VALUES ('unicommerce', 'unknown')
      ON CONFLICT (connector_name) DO NOTHING;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM connector_health WHERE connector_name = 'unicommerce';
      DROP TABLE IF EXISTS unicommerce_channel_daily;
      DROP TABLE IF EXISTS unicommerce_inventory;
      DROP TABLE IF EXISTS unicommerce_returns;
      DROP TABLE IF EXISTS unicommerce_shipments;
      DROP TABLE IF EXISTS unicommerce_order_items;
      DROP TABLE IF EXISTS unicommerce_orders;
      DROP TABLE IF EXISTS unicommerce_tokens;
    `);
  },
};
