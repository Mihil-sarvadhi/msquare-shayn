import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface ShopifyOrderAttributes {
  order_id: string;
  order_name?: string;
  created_at?: Date;
  updated_at?: Date;
  processed_at?: Date;
  cancelled_at?: Date;
  cancel_reason?: string;
  closed?: boolean;
  closed_at?: Date;
  confirmed?: boolean;
  test?: boolean;
  note?: string;
  tags?: string[];
  channel?: string;
  location_id?: string;
  source_identifier?: string;
  revenue?: number;
  subtotal?: number;
  gross_sales?: number;
  total_discounts?: number;
  total_tax?: number;
  total_shipping?: number;
  total_refunded?: number;
  total_received?: number;
  total_outstanding?: number;
  current_total_price?: number;
  total_tips?: number;
  currency?: string;
  presentment_currency?: string;
  payment_mode?: string;
  financial_status?: string;
  fulfillment_status?: string;
  return_status?: string;
  risk_level?: string;
  shipping_method?: string;
  accepts_marketing?: boolean;
  order_email?: string;
  order_phone?: string;
  customer_id?: string;
  customer_email?: string;
  customer_name?: string;
  customer_city?: string;
  customer_state?: string;
  customer_country?: string;
  customer_pincode?: string;
  customer_address1?: string;
  customer_address2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  billing_zip?: string;
  discount_code?: string;
  synced_at?: Date;
}

type ShopifyOrderCreationAttributes = Optional<
  ShopifyOrderAttributes,
  Exclude<keyof ShopifyOrderAttributes, 'order_id'>
>;

export class ShopifyOrder
  extends Model<ShopifyOrderAttributes, ShopifyOrderCreationAttributes>
  implements ShopifyOrderAttributes
{
  declare order_id: string;
  declare order_name?: string;
  declare created_at?: Date;
  declare updated_at?: Date;
  declare processed_at?: Date;
  declare cancelled_at?: Date;
  declare cancel_reason?: string;
  declare closed?: boolean;
  declare closed_at?: Date;
  declare confirmed?: boolean;
  declare test?: boolean;
  declare note?: string;
  declare tags?: string[];
  declare channel?: string;
  declare location_id?: string;
  declare source_identifier?: string;
  declare revenue?: number;
  declare subtotal?: number;
  declare gross_sales?: number;
  declare total_discounts?: number;
  declare total_tax?: number;
  declare total_shipping?: number;
  declare total_refunded?: number;
  declare total_received?: number;
  declare total_outstanding?: number;
  declare current_total_price?: number;
  declare total_tips?: number;
  declare currency?: string;
  declare presentment_currency?: string;
  declare payment_mode?: string;
  declare financial_status?: string;
  declare fulfillment_status?: string;
  declare return_status?: string;
  declare risk_level?: string;
  declare shipping_method?: string;
  declare accepts_marketing?: boolean;
  declare order_email?: string;
  declare order_phone?: string;
  declare customer_id?: string;
  declare customer_email?: string;
  declare customer_name?: string;
  declare customer_city?: string;
  declare customer_state?: string;
  declare customer_country?: string;
  declare customer_pincode?: string;
  declare customer_address1?: string;
  declare customer_address2?: string;
  declare billing_city?: string;
  declare billing_state?: string;
  declare billing_country?: string;
  declare billing_zip?: string;
  declare discount_code?: string;
  declare synced_at?: Date;
}

ShopifyOrder.init(
  {
    order_id: { type: DataTypes.TEXT, primaryKey: true },
    order_name: DataTypes.TEXT,
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    processed_at: DataTypes.DATE,
    cancelled_at: DataTypes.DATE,
    cancel_reason: DataTypes.TEXT,
    closed: DataTypes.BOOLEAN,
    closed_at: DataTypes.DATE,
    confirmed: DataTypes.BOOLEAN,
    test: DataTypes.BOOLEAN,
    note: DataTypes.TEXT,
    tags: DataTypes.JSONB,
    channel: DataTypes.TEXT,
    location_id: DataTypes.TEXT,
    source_identifier: DataTypes.TEXT,
    revenue: DataTypes.DECIMAL(12, 2),
    subtotal: DataTypes.DECIMAL(12, 2),
    gross_sales: DataTypes.DECIMAL(12, 2),
    total_discounts: DataTypes.DECIMAL(12, 2),
    total_tax: DataTypes.DECIMAL(12, 2),
    total_shipping: DataTypes.DECIMAL(12, 2),
    total_refunded: DataTypes.DECIMAL(12, 2),
    total_received: DataTypes.DECIMAL(12, 2),
    total_outstanding: DataTypes.DECIMAL(12, 2),
    current_total_price: DataTypes.DECIMAL(12, 2),
    total_tips: DataTypes.DECIMAL(10, 2),
    currency: DataTypes.TEXT,
    presentment_currency: DataTypes.TEXT,
    payment_mode: DataTypes.TEXT,
    financial_status: DataTypes.TEXT,
    fulfillment_status: DataTypes.TEXT,
    return_status: DataTypes.TEXT,
    risk_level: DataTypes.TEXT,
    shipping_method: DataTypes.TEXT,
    accepts_marketing: DataTypes.BOOLEAN,
    order_email: DataTypes.TEXT,
    order_phone: DataTypes.TEXT,
    customer_id: DataTypes.TEXT,
    customer_email: DataTypes.TEXT,
    customer_name: DataTypes.TEXT,
    customer_city: DataTypes.TEXT,
    customer_state: DataTypes.TEXT,
    customer_country: DataTypes.TEXT,
    customer_pincode: DataTypes.TEXT,
    customer_address1: DataTypes.TEXT,
    customer_address2: DataTypes.TEXT,
    billing_city: DataTypes.TEXT,
    billing_state: DataTypes.TEXT,
    billing_country: DataTypes.TEXT,
    billing_zip: DataTypes.TEXT,
    discount_code: DataTypes.TEXT,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'ShopifyOrder', tableName: 'shopify_orders', timestamps: false },
);
