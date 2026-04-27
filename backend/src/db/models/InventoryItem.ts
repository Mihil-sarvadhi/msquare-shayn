import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

interface InventoryItemAttributes {
  id?: number;
  source: SourceType;
  source_inventory_item_id: string;
  source_variant_id?: string | null;
  variant_id?: number | null;
  sku?: string | null;
  cost?: number | null;
  tracked: boolean;
  hsn_code?: string | null;
  country_of_origin?: string | null;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type InventoryItemCreationAttributes = Optional<
  InventoryItemAttributes,
  | 'id'
  | 'source_variant_id'
  | 'variant_id'
  | 'sku'
  | 'cost'
  | 'hsn_code'
  | 'country_of_origin'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class InventoryItem
  extends Model<InventoryItemAttributes, InventoryItemCreationAttributes>
  implements InventoryItemAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_inventory_item_id: string;
  declare source_variant_id: string | null;
  declare variant_id: number | null;
  declare sku: string | null;
  declare cost: number | null;
  declare tracked: boolean;
  declare hsn_code: string | null;
  declare country_of_origin: string | null;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

InventoryItem.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_inventory_item_id: { type: DataTypes.TEXT, allowNull: false },
    source_variant_id: { type: DataTypes.TEXT, allowNull: true },
    variant_id: { type: DataTypes.BIGINT, allowNull: true },
    sku: { type: DataTypes.TEXT, allowNull: true },
    cost: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    tracked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    hsn_code: { type: DataTypes.TEXT, allowNull: true },
    country_of_origin: { type: DataTypes.TEXT, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'InventoryItem', tableName: 'inventory_items', timestamps: false },
);
