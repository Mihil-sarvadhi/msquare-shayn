'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS judgeme_reviews (
        review_id       INTEGER PRIMARY KEY,
        product_id      INTEGER,
        external_id     TEXT,
        rating          INTEGER,
        title           TEXT,
        body            TEXT,
        reviewer_name   TEXT,
        reviewer_email  TEXT,
        created_at      DATE,
        published       BOOLEAN DEFAULT TRUE,
        verified        BOOLEAN DEFAULT FALSE,
        has_photos      BOOLEAN DEFAULT FALSE,
        picture_urls    TEXT,
        source          TEXT,
        synced_at       TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS judgeme_products (
        product_id      INTEGER PRIMARY KEY,
        external_id     TEXT,
        handle          TEXT,
        title           TEXT,
        average_rating  NUMERIC(3,2),
        reviews_count   INTEGER,
        updated_at      TIMESTAMPTZ,
        synced_at       TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS judgeme_store_summary (
        id              SERIAL PRIMARY KEY,
        average_rating  NUMERIC(3,2),
        total_reviews   INTEGER,
        synced_at       TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_reviews_product  ON judgeme_reviews(product_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_rating   ON judgeme_reviews(rating);
      CREATE INDEX IF NOT EXISTS idx_reviews_created  ON judgeme_reviews(created_at);
      CREATE INDEX IF NOT EXISTS idx_products_external ON judgeme_products(external_id);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS judgeme_store_summary;
      DROP TABLE IF EXISTS judgeme_products;
      DROP TABLE IF EXISTS judgeme_reviews;
    `);
  }
};
