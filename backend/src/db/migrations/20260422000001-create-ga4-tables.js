'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS ga4_tokens (
        id              SERIAL PRIMARY KEY,
        access_token    TEXT NOT NULL,
        expires_at      TIMESTAMPTZ NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ga4_traffic_daily (
        id                   SERIAL PRIMARY KEY,
        date                 DATE UNIQUE,
        sessions             INTEGER DEFAULT 0,
        active_users         INTEGER DEFAULT 0,
        new_users            INTEGER DEFAULT 0,
        page_views           INTEGER DEFAULT 0,
        bounce_rate          NUMERIC(6,4) DEFAULT 0,
        avg_session_duration NUMERIC(10,2) DEFAULT 0,
        synced_at            TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ga4_traffic_channels (
        id               SERIAL PRIMARY KEY,
        date             DATE,
        channel          TEXT,
        sessions         INTEGER DEFAULT 0,
        active_users     INTEGER DEFAULT 0,
        purchase_revenue NUMERIC(12,2) DEFAULT 0,
        conversions      INTEGER DEFAULT 0,
        conversion_rate  NUMERIC(6,4) DEFAULT 0,
        synced_at        TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(date, channel)
      );

      CREATE TABLE IF NOT EXISTS ga4_ecommerce_daily (
        id                   SERIAL PRIMARY KEY,
        date                 DATE UNIQUE,
        purchase_revenue     NUMERIC(12,2) DEFAULT 0,
        transactions         INTEGER DEFAULT 0,
        avg_purchase_revenue NUMERIC(10,2) DEFAULT 0,
        ecommerce_purchases  INTEGER DEFAULT 0,
        checkouts            INTEGER DEFAULT 0,
        conversion_rate      NUMERIC(6,4) DEFAULT 0,
        synced_at            TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ga4_top_products (
        id                  SERIAL PRIMARY KEY,
        date                DATE,
        item_name           TEXT,
        items_viewed        INTEGER DEFAULT 0,
        items_added_to_cart INTEGER DEFAULT 0,
        items_purchased     INTEGER DEFAULT 0,
        purchase_revenue    NUMERIC(12,2) DEFAULT 0,
        synced_at           TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(date, item_name)
      );

      CREATE TABLE IF NOT EXISTS ga4_devices (
        id               SERIAL PRIMARY KEY,
        date             DATE,
        device_category  TEXT,
        sessions         INTEGER DEFAULT 0,
        active_users     INTEGER DEFAULT 0,
        purchase_revenue NUMERIC(12,2) DEFAULT 0,
        conversion_rate  NUMERIC(6,4) DEFAULT 0,
        synced_at        TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(date, device_category)
      );

      CREATE TABLE IF NOT EXISTS ga4_geography (
        id               SERIAL PRIMARY KEY,
        date             DATE,
        region           TEXT,
        city             TEXT,
        active_users     INTEGER DEFAULT 0,
        sessions         INTEGER DEFAULT 0,
        purchase_revenue NUMERIC(12,2) DEFAULT 0,
        transactions     INTEGER DEFAULT 0,
        synced_at        TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(date, region, city)
      );

      CREATE TABLE IF NOT EXISTS ga4_realtime (
        id              SERIAL PRIMARY KEY,
        country         TEXT,
        device_category TEXT,
        active_users    INTEGER DEFAULT 0,
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ga4_traffic_date    ON ga4_traffic_daily(date);
      CREATE INDEX IF NOT EXISTS idx_ga4_ecommerce_date  ON ga4_ecommerce_daily(date);
      CREATE INDEX IF NOT EXISTS idx_ga4_channels_date   ON ga4_traffic_channels(date);
      CREATE INDEX IF NOT EXISTS idx_ga4_products_date   ON ga4_top_products(date);
      CREATE INDEX IF NOT EXISTS idx_ga4_devices_date    ON ga4_devices(date);
      CREATE INDEX IF NOT EXISTS idx_ga4_geography_date  ON ga4_geography(date);

      INSERT INTO connector_health (connector_name, status)
      VALUES ('ga4', 'unknown')
      ON CONFLICT (connector_name) DO NOTHING;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS ga4_realtime;
      DROP TABLE IF EXISTS ga4_geography;
      DROP TABLE IF EXISTS ga4_devices;
      DROP TABLE IF EXISTS ga4_top_products;
      DROP TABLE IF EXISTS ga4_ecommerce_daily;
      DROP TABLE IF EXISTS ga4_traffic_channels;
      DROP TABLE IF EXISTS ga4_traffic_daily;
      DROP TABLE IF EXISTS ga4_tokens;
      DELETE FROM connector_health WHERE connector_name = 'ga4';
    `);
  },
};
