import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  id?: number; connector_name: string; last_sync_at?: Date; status?: string;
  error_message?: string; records_synced?: number; updated_at?: Date;
}
type CA = Optional<Attrs, 'id' | 'last_sync_at' | 'status' | 'error_message' | 'records_synced' | 'updated_at'>;

export class ConnectorHealth extends Model<Attrs, CA> implements Attrs {
  declare id?: number; declare connector_name: string; declare last_sync_at?: Date;
  declare status?: string; declare error_message?: string; declare records_synced?: number;
  declare updated_at?: Date;
}

ConnectorHealth.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  connector_name: { type: DataTypes.TEXT, unique: true },
  last_sync_at: DataTypes.DATE, status: { type: DataTypes.TEXT, defaultValue: 'unknown' },
  error_message: DataTypes.TEXT, records_synced: { type: DataTypes.INTEGER, defaultValue: 0 },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { sequelize, modelName: 'ConnectorHealth', tableName: 'connector_health', timestamps: false });
