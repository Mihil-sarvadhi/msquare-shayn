import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export interface RefundLineItem {
  sku: string;
  quantity: number;
  amount: number;
  restock_type?: string;
}

interface OrderRefundAttributes {
  id?: number;
  source: SourceType;
  source_refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_currency: string;
  reason?: string | null;
  refunded_at?: Date | null;
  restocked: boolean;
  refund_line_items?: RefundLineItem[] | null;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type OrderRefundCreationAttributes = Optional<
  OrderRefundAttributes,
  | 'id'
  | 'reason'
  | 'refunded_at'
  | 'refund_line_items'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class OrderRefund
  extends Model<OrderRefundAttributes, OrderRefundCreationAttributes>
  implements OrderRefundAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_refund_id: string;
  declare order_id: string;
  declare refund_amount: number;
  declare refund_currency: string;
  declare reason: string | null;
  declare refunded_at: Date | null;
  declare restocked: boolean;
  declare refund_line_items: RefundLineItem[] | null;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

OrderRefund.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_refund_id: { type: DataTypes.TEXT, allowNull: false },
    order_id: { type: DataTypes.TEXT, allowNull: false },
    refund_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    refund_currency: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'INR' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    refunded_at: { type: DataTypes.DATE, allowNull: true },
    restocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    refund_line_items: { type: DataTypes.JSONB, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'OrderRefund', tableName: 'orders_refunds', timestamps: false },
);
