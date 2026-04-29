import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  order_code: string;
  display_order_code?: string;
  channel?: string;
  status?: string;
  order_date?: Date;
  updated_date?: Date;
  fulfillment_tat?: Date;
  cod?: boolean;
  currency?: string;
  total_price?: number;
  shipping_charges?: number;
  discount?: number;
  cod_charges?: number;
  prepaid_amount?: number;
  customer_name?: string;
  customer_email?: string;
  customer_mobile?: string;
  city?: string;
  state?: string;
  pincode?: string;
  facility_code?: string;
  third_party_shipping?: boolean;
  on_hold?: boolean;
  synced_at?: Date;
}
type CA = Optional<
  Attrs,
  | 'display_order_code'
  | 'channel'
  | 'status'
  | 'order_date'
  | 'updated_date'
  | 'fulfillment_tat'
  | 'cod'
  | 'currency'
  | 'total_price'
  | 'shipping_charges'
  | 'discount'
  | 'cod_charges'
  | 'prepaid_amount'
  | 'customer_name'
  | 'customer_email'
  | 'customer_mobile'
  | 'city'
  | 'state'
  | 'pincode'
  | 'facility_code'
  | 'third_party_shipping'
  | 'on_hold'
  | 'synced_at'
>;

export class UnicommerceOrder extends Model<Attrs, CA> implements Attrs {
  declare order_code: string;
  declare display_order_code?: string;
  declare channel?: string;
  declare status?: string;
  declare order_date?: Date;
  declare updated_date?: Date;
  declare fulfillment_tat?: Date;
  declare cod?: boolean;
  declare currency?: string;
  declare total_price?: number;
  declare shipping_charges?: number;
  declare discount?: number;
  declare cod_charges?: number;
  declare prepaid_amount?: number;
  declare customer_name?: string;
  declare customer_email?: string;
  declare customer_mobile?: string;
  declare city?: string;
  declare state?: string;
  declare pincode?: string;
  declare facility_code?: string;
  declare third_party_shipping?: boolean;
  declare on_hold?: boolean;
  declare synced_at?: Date;
}

UnicommerceOrder.init(
  {
    order_code: { type: DataTypes.TEXT, primaryKey: true },
    display_order_code: DataTypes.TEXT,
    channel: DataTypes.TEXT,
    status: DataTypes.TEXT,
    order_date: DataTypes.DATE,
    updated_date: DataTypes.DATE,
    fulfillment_tat: DataTypes.DATE,
    cod: { type: DataTypes.BOOLEAN, defaultValue: false },
    currency: { type: DataTypes.TEXT, defaultValue: 'INR' },
    total_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    shipping_charges: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    cod_charges: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    prepaid_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    customer_name: DataTypes.TEXT,
    customer_email: DataTypes.TEXT,
    customer_mobile: DataTypes.TEXT,
    city: DataTypes.TEXT,
    state: DataTypes.TEXT,
    pincode: DataTypes.TEXT,
    facility_code: DataTypes.TEXT,
    third_party_shipping: { type: DataTypes.BOOLEAN, defaultValue: false },
    on_hold: { type: DataTypes.BOOLEAN, defaultValue: false },
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'UnicommerceOrder', tableName: 'unicommerce_orders', timestamps: false },
);
