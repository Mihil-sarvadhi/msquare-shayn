import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  sku: string;
  available_qty?: number;
  on_hold_qty?: number;
  damaged_qty?: number;
  total_qty?: number;
  bad_inventory?: number;
  inventory_not_synced?: number;
  virtual_inventory?: number;
  batch_recall_qty?: number;
  sales_last_30_days?: number;
  days_of_inventory?: number;
  facility_code?: string;
  synced_at?: Date;
}
type CA = Optional<
  Attrs,
  | 'available_qty'
  | 'on_hold_qty'
  | 'damaged_qty'
  | 'total_qty'
  | 'bad_inventory'
  | 'inventory_not_synced'
  | 'virtual_inventory'
  | 'batch_recall_qty'
  | 'sales_last_30_days'
  | 'days_of_inventory'
  | 'facility_code'
  | 'synced_at'
>;

export class UnicommerceInventory extends Model<Attrs, CA> implements Attrs {
  declare sku: string;
  declare available_qty?: number;
  declare on_hold_qty?: number;
  declare damaged_qty?: number;
  declare total_qty?: number;
  declare bad_inventory?: number;
  declare inventory_not_synced?: number;
  declare virtual_inventory?: number;
  declare batch_recall_qty?: number;
  declare sales_last_30_days?: number;
  declare days_of_inventory?: number;
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
    bad_inventory: { type: DataTypes.INTEGER, defaultValue: 0 },
    inventory_not_synced: { type: DataTypes.INTEGER, defaultValue: 0 },
    virtual_inventory: { type: DataTypes.INTEGER, defaultValue: 0 },
    batch_recall_qty: { type: DataTypes.INTEGER, defaultValue: 0 },
    sales_last_30_days: { type: DataTypes.INTEGER, defaultValue: 0 },
    days_of_inventory: { type: DataTypes.DECIMAL(10, 2) },
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
