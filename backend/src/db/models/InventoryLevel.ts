import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

interface InventoryLevelAttributes {
  id?: number;
  source: SourceType;
  source_inventory_item_id: string;
  source_location_id: string;
  inventory_item_id?: number | null;
  location_id?: number | null;
  available: number;
  on_hand?: number | null;
  committed?: number | null;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type InventoryLevelCreationAttributes = Optional<
  InventoryLevelAttributes,
  | 'id'
  | 'inventory_item_id'
  | 'location_id'
  | 'on_hand'
  | 'committed'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class InventoryLevel
  extends Model<InventoryLevelAttributes, InventoryLevelCreationAttributes>
  implements InventoryLevelAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_inventory_item_id: string;
  declare source_location_id: string;
  declare inventory_item_id: number | null;
  declare location_id: number | null;
  declare available: number;
  declare on_hand: number | null;
  declare committed: number | null;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

InventoryLevel.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_inventory_item_id: { type: DataTypes.TEXT, allowNull: false },
    source_location_id: { type: DataTypes.TEXT, allowNull: false },
    inventory_item_id: { type: DataTypes.BIGINT, allowNull: true },
    location_id: { type: DataTypes.BIGINT, allowNull: true },
    available: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    on_hand: { type: DataTypes.INTEGER, allowNull: true },
    committed: { type: DataTypes.INTEGER, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'InventoryLevel', tableName: 'inventory_levels', timestamps: false },
);
