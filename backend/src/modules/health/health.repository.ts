import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';

export interface HealthRow {
  connector_name: string;
  status: string;
  error_message: string | null;
  records_synced: number;
  last_sync_at: string | null;
  realtime_last_updated_at: string | null;
  realtime_lag_seconds: number | null;
}

export async function getConnectorHealth(): Promise<HealthRow[]> {
  return sequelize.query<HealthRow>(
    `SELECT ch.connector_name, ch.status, ch.error_message, ch.records_synced,
            COALESCE(ch.last_sync_at,
              CASE ch.connector_name
                WHEN 'shopify' THEN (SELECT MAX(synced_at) FROM shopify_orders)
                ELSE NULL
              END
            ) AS last_sync_at,
            CASE ch.connector_name
              WHEN 'ga4' THEN (SELECT MAX(updated_at)::text FROM ga4_realtime)
              ELSE NULL
            END AS realtime_last_updated_at,
            CASE ch.connector_name
              WHEN 'ga4' THEN (
                SELECT EXTRACT(EPOCH FROM (NOW() - MAX(updated_at)))::int
                FROM ga4_realtime
              )
              ELSE NULL
            END AS realtime_lag_seconds
     FROM connector_health ch ORDER BY connector_name`,
    { type: QueryTypes.SELECT },
  );
}
