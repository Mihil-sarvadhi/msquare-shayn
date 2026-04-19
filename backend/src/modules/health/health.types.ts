export interface ConnectorHealthRow {
  connector_name: string;
  status: string;
  error_message: string | null;
  records_synced: number;
  last_sync_at: string | null;
}
