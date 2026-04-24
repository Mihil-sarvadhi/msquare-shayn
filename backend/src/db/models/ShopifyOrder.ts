import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface ShopifyOrderAttributes {
  order_id: string;
  order_name?: string;
  created_at?: Date;
  channel?: string;
  revenue?: number;
  gross_sales?: number;
  total_discounts?: number;
  total_tax?: number;
  total_shipping?: number;
  total_refunded?: number;
  payment_mode?: string;
  financial_status?: string;
  fulfillment_status?: string;
  customer_id?: string;
  customer_email?: string;
  customer_name?: string;
  customer_city?: string;
  customer_state?: string;
  discount_code?: string;
  synced_at?: Date;
}

type ShopifyOrderCreationAttributes = Optional<
  ShopifyOrderAttributes,
  | 'order_name'
  | 'created_at'
  | 'channel'
  | 'revenue'
  | 'gross_sales'
  | 'total_discounts'
  | 'total_tax'
  | 'total_shipping'
  | 'total_refunded'
  | 'payment_mode'
  | 'financial_status'
  | 'fulfillment_status'
  | 'customer_id'
  | 'customer_email'
  | 'customer_name'
  | 'customer_city'
  | 'customer_state'
  | 'discount_code'
  | 'synced_at'
>;

export class ShopifyOrder
  extends Model<ShopifyOrderAttributes, ShopifyOrderCreationAttributes>
  implements ShopifyOrderAttributes
{
  declare order_id: string;
  declare order_name?: string;
  declare created_at?: Date;
  declare channel?: string;
  declare revenue?: number;
  declare gross_sales?: number;
  declare total_discounts?: number;
  declare total_tax?: number;
  declare total_shipping?: number;
  declare total_refunded?: number;
  declare payment_mode?: string;
  declare financial_status?: string;
  declare fulfillment_status?: string;
  declare customer_id?: string;
  declare customer_email?: string;
  declare customer_name?: string;
  declare customer_city?: string;
  declare customer_state?: string;
  declare discount_code?: string;
  declare synced_at?: Date;
}

ShopifyOrder.init(
  {
    order_id: { type: DataTypes.TEXT, primaryKey: true },
    order_name: DataTypes.TEXT,
    created_at: DataTypes.DATE,
    channel: DataTypes.TEXT,
    revenue: DataTypes.DECIMAL(12, 2),
    gross_sales: DataTypes.DECIMAL(12, 2),
    total_discounts: DataTypes.DECIMAL(12, 2),
    total_tax: DataTypes.DECIMAL(12, 2),
    total_shipping: DataTypes.DECIMAL(12, 2),
    total_refunded: DataTypes.DECIMAL(12, 2),
    payment_mode: DataTypes.TEXT,
    financial_status: DataTypes.TEXT,
    fulfillment_status: DataTypes.TEXT,
    customer_id: DataTypes.TEXT,
    customer_email: DataTypes.TEXT,
    customer_name: DataTypes.TEXT,
    customer_city: DataTypes.TEXT,
    customer_state: DataTypes.TEXT,
    discount_code: DataTypes.TEXT,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'ShopifyOrder', tableName: 'shopify_orders', timestamps: false },
);
