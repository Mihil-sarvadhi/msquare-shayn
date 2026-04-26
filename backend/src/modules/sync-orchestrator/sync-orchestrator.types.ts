import type { SourceType } from '@constant';

export type SyncMode = 'backfill' | 'incremental';

export interface SyncResult {
  resource: string;
  source: SourceType;
  records_synced: number;
  duration_ms: number;
  bulk_op_id?: string;
}

export interface ResourceHandler {
  source: SourceType;
  resource: string;
  backfill: (opts: { fromDate: Date }) => Promise<SyncResult>;
  incremental: (opts: { sinceDate: Date | null }) => Promise<SyncResult>;
}
