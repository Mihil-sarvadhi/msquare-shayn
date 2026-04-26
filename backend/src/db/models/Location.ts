import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

interface LocationAttributes {
  id?: number;
  source: SourceType;
  source_location_id: string;
  name?: string | null;
  address?: Record<string, unknown> | null;
  active: boolean;
  fulfills_online_orders: boolean;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type LocationCreationAttributes = Optional<
  LocationAttributes,
  'id' | 'name' | 'address' | 'source_metadata' | 'created_at' | 'updated_at' | 'synced_at'
>;

export class Location
  extends Model<LocationAttributes, LocationCreationAttributes>
  implements LocationAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_location_id: string;
  declare name: string | null;
  declare address: Record<string, unknown> | null;
  declare active: boolean;
  declare fulfills_online_orders: boolean;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

Location.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_location_id: { type: DataTypes.TEXT, allowNull: false },
    name: { type: DataTypes.TEXT, allowNull: true },
    address: { type: DataTypes.JSONB, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    fulfills_online_orders: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'Location', tableName: 'locations', timestamps: false },
);
