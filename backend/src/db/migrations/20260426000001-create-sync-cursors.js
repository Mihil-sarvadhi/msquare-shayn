'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS sync_cursors (
        source TEXT NOT NULL,
        resource TEXT NOT NULL,
        last_synced_at TIMESTAMP WITH TIME ZONE,
        last_bulk_op_id TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (source, resource),
        CONSTRAINT sync_cursors_source_check
          CHECK (source IN ('shopify', 'myntra', 'amazon', 'flipkart', 'unicommerce')),
        CONSTRAINT sync_cursors_status_check
          CHECK (status IN ('idle', 'running', 'failed'))
      );

      CREATE INDEX IF NOT EXISTS idx_sync_cursors_status ON sync_cursors(status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sync_cursors_status;
      DROP TABLE IF EXISTS sync_cursors;
    `);
  },
};
