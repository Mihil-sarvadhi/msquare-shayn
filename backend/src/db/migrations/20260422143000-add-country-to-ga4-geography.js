'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE ga4_geography
      ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Unknown';

      UPDATE ga4_geography
      SET country = 'Unknown'
      WHERE country IS NULL OR TRIM(country) = '';

      ALTER TABLE ga4_geography
      ALTER COLUMN country SET NOT NULL;

      ALTER TABLE ga4_geography
      DROP CONSTRAINT IF EXISTS ga4_geography_date_region_city_key;

      ALTER TABLE ga4_geography
      ADD CONSTRAINT ga4_geography_date_country_region_city_key
      UNIQUE (date, country, region, city);

      CREATE INDEX IF NOT EXISTS idx_ga4_geography_country ON ga4_geography(country);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE ga4_geography
      DROP CONSTRAINT IF EXISTS ga4_geography_date_country_region_city_key;

      ALTER TABLE ga4_geography
      ADD CONSTRAINT ga4_geography_date_region_city_key
      UNIQUE (date, region, city);

      ALTER TABLE ga4_geography
      DROP COLUMN IF EXISTS country;
    `);
  },
};
