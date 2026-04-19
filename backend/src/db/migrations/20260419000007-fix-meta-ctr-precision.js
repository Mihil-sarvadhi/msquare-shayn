'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE meta_daily_insights ALTER COLUMN ctr TYPE DECIMAL(10, 4);`
    );
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE meta_daily_insights ALTER COLUMN ctr TYPE DECIMAL(6, 4);`
    );
  },
};
