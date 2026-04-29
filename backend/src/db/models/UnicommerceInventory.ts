import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  sku: string;
  available_qty?: number;
  on_hold_qty?: number;
  damaged_qty?: number;
  total_qty?: number;
  facility_code?: string;
  synced_at?: Date;
}
type CA = Optional<
  Attrs,
  'available_qty' | 'on_hold_qty' | 'damaged_qty' | 'total_qty' | 'facility_code' | 'synced_at'
>;

export class UnicommerceInventory extends Model<Attrs, CA> implements Attrs {
  declare sku: string;
  declare available_qty?: number;
  declare on_hold_qty?: number;
  declare damaged_qty?: number;
  declare total_qty?: number;
  declare facility_code?: string;
  declare synced_at?: Date;
}

UnicommerceInventory.init(
  {
    sku: { type: DataTypes.TEXT, primaryKey: true },
    available_qty: { type: DataTypes.INTEGER, defaultValue: 0 },
    on_hold_qty: { type: DataTypes.INTEGER, defaultValue: 0 },
    damaged_qty: { type: DataTypes.INTEGER, defaultValue: 0 },
    total_qty: { type: DataTypes.INTEGER, defaultValue: 0 },
    facility_code: DataTypes.TEXT,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'UnicommerceInventory',
    tableName: 'unicommerce_inventory',
    timestamps: false,
  },
);
