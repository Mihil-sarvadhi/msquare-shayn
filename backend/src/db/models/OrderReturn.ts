import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export interface ReturnLineItem {
  sku: string;
  quantity: number;
  total: number;
  return_reason?: string;
}

interface OrderReturnAttributes {
  id?: number;
  source: SourceType;
  source_return_id: string;
  order_id: string;
  name?: string | null;
  status: string;
  total_quantity: number;
  total_value: number;
  return_shipping_fee_total: number;
  return_created_at?: Date | null;
  request_approved_at?: Date | null;
  closed_at?: Date | null;
  return_line_items?: ReturnLineItem[] | null;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type OrderReturnCreationAttributes = Optional<
  OrderReturnAttributes,
  | 'id'
  | 'name'
  | 'return_created_at'
  | 'request_approved_at'
  | 'closed_at'
  | 'return_line_items'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class OrderReturn
  extends Model<OrderReturnAttributes, OrderReturnCreationAttributes>
  implements OrderReturnAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_return_id: string;
  declare order_id: string;
  declare name: string | null;
  declare status: string;
  declare total_quantity: number;
  declare total_value: number;
  declare return_shipping_fee_total: number;
  declare return_created_at: Date | null;
  declare request_approved_at: Date | null;
  declare closed_at: Date | null;
  declare return_line_items: ReturnLineItem[] | null;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

OrderReturn.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_return_id: { type: DataTypes.TEXT, allowNull: false },
    order_id: { type: DataTypes.TEXT, allowNull: false },
    name: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.TEXT, allowNull: false },
    total_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    total_value: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    return_shipping_fee_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    return_created_at: { type: DataTypes.DATE, allowNull: true },
    request_approved_at: { type: DataTypes.DATE, allowNull: true },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    return_line_items: { type: DataTypes.JSONB, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'OrderReturn', tableName: 'orders_returns', timestamps: false },
);
