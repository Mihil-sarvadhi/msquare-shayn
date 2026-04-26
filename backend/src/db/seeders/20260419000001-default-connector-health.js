'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO connector_health (connector_name, status)
      VALUES ('shopify', 'unknown'), ('meta_ads', 'unknown'), ('ithink', 'unknown'), ('judgeme', 'unknown')
      ON CONFLICT (connector_name) DO NOTHING;
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM connector_health WHERE connector_name IN ('shopify', 'meta_ads', 'ithink', 'judgeme');
    `);
  }
};
