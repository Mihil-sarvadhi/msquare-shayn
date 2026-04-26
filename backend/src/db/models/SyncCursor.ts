import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type SyncCursorStatus = 'idle' | 'running' | 'failed';

interface SyncCursorAttributes {
  source: SourceType;
  resource: string;
  last_synced_at?: Date | null;
  last_bulk_op_id?: string | null;
  status: SyncCursorStatus;
  error_message?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type SyncCursorCreationAttributes = Optional<
  SyncCursorAttributes,
  'last_synced_at' | 'last_bulk_op_id' | 'error_message' | 'created_at' | 'updated_at'
>;

export class SyncCursor
  extends Model<SyncCursorAttributes, SyncCursorCreationAttributes>
  implements SyncCursorAttributes
{
  declare source: SourceType;
  declare resource: string;
  declare last_synced_at: Date | null;
  declare last_bulk_op_id: string | null;
  declare status: SyncCursorStatus;
  declare error_message: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

SyncCursor.init(
  {
    source: { type: DataTypes.TEXT, primaryKey: true },
    resource: { type: DataTypes.TEXT, primaryKey: true },
    last_synced_at: { type: DataTypes.DATE, allowNull: true },
    last_bulk_op_id: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'idle' },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'SyncCursor', tableName: 'sync_cursors', timestamps: false },
);
