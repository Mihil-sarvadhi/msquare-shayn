import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  awb: string; order_id?: string; order_date?: string; courier?: string; zone?: string;
  payment_mode?: string; current_status?: string; current_status_code?: string;
  customer_state?: string; customer_city?: string; customer_pincode?: string;
  billed_fwd_charges?: number; billed_rto_charges?: number; billed_cod_charges?: number;
  billed_gst_charges?: number; billed_total?: number; remittance_amount?: number;
  ofd_count?: number; delivered_date?: string; rto_date?: string;
  expected_delivery?: string; synced_at?: Date;
  shopify_order_gql_id?: string;
  weight?: number;
  last_scan?: string;
  raw_response?: Record<string, unknown>;
}
type CA = Optional<Attrs, 'order_id' | 'order_date' | 'courier' | 'zone' | 'payment_mode' | 'current_status' | 'current_status_code' | 'customer_state' | 'customer_city' | 'customer_pincode' | 'billed_fwd_charges' | 'billed_rto_charges' | 'billed_cod_charges' | 'billed_gst_charges' | 'billed_total' | 'remittance_amount' | 'ofd_count' | 'delivered_date' | 'rto_date' | 'expected_delivery' | 'synced_at' | 'shopify_order_gql_id' | 'weight' | 'last_scan' | 'raw_response'>;

export class IthinkShipment extends Model<Attrs, CA> implements Attrs {
  declare awb: string; declare order_id?: string; declare order_date?: string;
  declare courier?: string; declare zone?: string; declare payment_mode?: string;
  declare current_status?: string; declare current_status_code?: string;
  declare customer_state?: string; declare customer_city?: string; declare customer_pincode?: string;
  declare billed_fwd_charges?: number; declare billed_rto_charges?: number;
  declare billed_cod_charges?: number; declare billed_gst_charges?: number;
  declare billed_total?: number; declare remittance_amount?: number; declare ofd_count?: number;
  declare delivered_date?: string; declare rto_date?: string;
  declare expected_delivery?: string; declare synced_at?: Date;
  declare shopify_order_gql_id?: string;
  declare weight?: number;
  declare last_scan?: string;
  declare raw_response?: Record<string, unknown>;
}

IthinkShipment.init({
  awb: { type: DataTypes.TEXT, primaryKey: true },
  order_id: DataTypes.TEXT, order_date: DataTypes.DATEONLY, courier: DataTypes.TEXT,
  zone: DataTypes.TEXT, payment_mode: DataTypes.TEXT, current_status: DataTypes.TEXT,
  current_status_code: DataTypes.TEXT, customer_state: DataTypes.TEXT,
  customer_city: DataTypes.TEXT, customer_pincode: DataTypes.TEXT,
  billed_fwd_charges: DataTypes.DECIMAL(10, 2), billed_rto_charges: DataTypes.DECIMAL(10, 2),
  billed_cod_charges: DataTypes.DECIMAL(10, 2), billed_gst_charges: DataTypes.DECIMAL(10, 2),
  billed_total: DataTypes.DECIMAL(10, 2), remittance_amount: DataTypes.DECIMAL(10, 2),
  ofd_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  delivered_date: DataTypes.DATEONLY, rto_date: DataTypes.DATEONLY,
  expected_delivery: DataTypes.DATEONLY,
  synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  shopify_order_gql_id: DataTypes.TEXT,
  weight: DataTypes.DECIMAL(8, 3),
  last_scan: DataTypes.TEXT,
  raw_response: DataTypes.JSONB,
}, { sequelize, modelName: 'IthinkShipment', tableName: 'ithink_shipments', timestamps: false });
