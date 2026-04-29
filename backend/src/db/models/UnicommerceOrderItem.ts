import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  id?: number;
  order_code: string;
  item_code?: string;
  sku?: string;
  product_name?: string;
  quantity?: number;
  selling_price?: number;
  discount?: number;
  shipping_charges?: number;
  cod_charges?: number;
  total_price?: number;
  transfer_price?: number;
  status?: string;
  channel?: string;
  return_reason?: string;
  return_date?: string;
  return_awb?: string;
  facility_code?: string;
  synced_at?: Date;
}
type CA = Optional<
  Attrs,
  | 'id'
  | 'item_code'
  | 'sku'
  | 'product_name'
  | 'quantity'
  | 'selling_price'
  | 'discount'
  | 'shipping_charges'
  | 'cod_charges'
  | 'total_price'
  | 'transfer_price'
  | 'status'
  | 'channel'
  | 'return_reason'
  | 'return_date'
  | 'return_awb'
  | 'facility_code'
  | 'synced_at'
>;

export class UnicommerceOrderItem extends Model<Attrs, CA> implements Attrs {
  declare id?: number;
  declare order_code: string;
  declare item_code?: string;
  declare sku?: string;
  declare product_name?: string;
  declare quantity?: number;
  declare selling_price?: number;
  declare discount?: number;
  declare shipping_charges?: number;
  declare cod_charges?: number;
  declare total_price?: number;
  declare transfer_price?: number;
  declare status?: string;
  declare channel?: string;
  declare return_reason?: string;
  declare return_date?: string;
  declare return_awb?: string;
  declare facility_code?: string;
  declare synced_at?: Date;
}

UnicommerceOrderItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    order_code: { type: DataTypes.TEXT, allowNull: false },
    item_code: DataTypes.TEXT,
    sku: DataTypes.TEXT,
    product_name: DataTypes.TEXT,
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    selling_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    shipping_charges: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    cod_charges: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    transfer_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    status: DataTypes.TEXT,
    channel: DataTypes.TEXT,
    return_reason: DataTypes.TEXT,
    return_date: DataTypes.TEXT,
    return_awb: DataTypes.TEXT,
    facility_code: DataTypes.TEXT,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'UnicommerceOrderItem',
    tableName: 'unicommerce_order_items',
    timestamps: false,
    indexes: [{ unique: true, fields: ['order_code', 'item_code'] }],
  },
);
