import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';

export interface HealthRow {
  connector_name: string; status: string; error_message: string | null;
  records_synced: number; last_sync_at: string | null;
}

export async function getConnectorHealth(): Promise<HealthRow[]> {
  return sequelize.query<HealthRow>(
    `SELECT ch.connector_name, ch.status, ch.error_message, ch.records_synced,
            COALESCE(ch.last_sync_at,
              CASE ch.connector_name
                WHEN 'shopify' THEN (SELECT MAX(synced_at) FROM shopify_orders)
                ELSE NULL
              END
            ) AS last_sync_at
     FROM connector_health ch ORDER BY connector_name`,
    { type: QueryTypes.SELECT }
  );
}
