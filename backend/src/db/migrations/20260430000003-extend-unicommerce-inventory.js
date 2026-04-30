'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE unicommerce_inventory
        ADD COLUMN IF NOT EXISTS bad_inventory          INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS inventory_not_synced   INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS virtual_inventory      INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS batch_recall_qty       INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sales_last_30_days     INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS days_of_inventory      NUMERIC(10,2);

      CREATE INDEX IF NOT EXISTS idx_uc_inv_sales30  ON unicommerce_inventory(sales_last_30_days);
      CREATE INDEX IF NOT EXISTS idx_uc_inv_avail    ON unicommerce_inventory(available_qty);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_uc_inv_avail;
      DROP INDEX IF EXISTS idx_uc_inv_sales30;
      ALTER TABLE unicommerce_inventory
        DROP COLUMN IF EXISTS days_of_inventory,
        DROP COLUMN IF EXISTS sales_last_30_days,
        DROP COLUMN IF EXISTS batch_recall_qty,
        DROP COLUMN IF EXISTS virtual_inventory,
        DROP COLUMN IF EXISTS inventory_not_synced,
        DROP COLUMN IF EXISTS bad_inventory;
    `);
  },
};
