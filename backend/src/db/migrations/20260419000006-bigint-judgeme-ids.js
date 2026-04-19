'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE judgeme_reviews
        ALTER COLUMN review_id TYPE BIGINT,
        ALTER COLUMN product_id TYPE BIGINT;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE judgeme_products
        ALTER COLUMN product_id TYPE BIGINT;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE judgeme_reviews
        ALTER COLUMN review_id TYPE INTEGER,
        ALTER COLUMN product_id TYPE INTEGER;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE judgeme_products
        ALTER COLUMN product_id TYPE INTEGER;
    `);
  },
};
