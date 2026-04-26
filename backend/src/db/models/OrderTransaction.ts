import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type TransactionKind = 'sale' | 'authorization' | 'capture' | 'refund' | 'void';
export type TransactionStatus = 'success' | 'pending' | 'failure' | 'error';

interface OrderTransactionAttributes {
  id?: number;
  source: SourceType;
  source_transaction_id: string;
  order_id: string;
  kind: TransactionKind;
  status: TransactionStatus;
  gateway?: string | null;
  amount: number;
  currency: string;
  payment_method?: string | null;
  processed_at?: Date | null;
  parent_transaction_id?: string | null;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type OrderTransactionCreationAttributes = Optional<
  OrderTransactionAttributes,
  | 'id'
  | 'gateway'
  | 'payment_method'
  | 'processed_at'
  | 'parent_transaction_id'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class OrderTransaction
  extends Model<OrderTransactionAttributes, OrderTransactionCreationAttributes>
  implements OrderTransactionAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_transaction_id: string;
  declare order_id: string;
  declare kind: TransactionKind;
  declare status: TransactionStatus;
  declare gateway: string | null;
  declare amount: number;
  declare currency: string;
  declare payment_method: string | null;
  declare processed_at: Date | null;
  declare parent_transaction_id: string | null;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

OrderTransaction.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_transaction_id: { type: DataTypes.TEXT, allowNull: false },
    order_id: { type: DataTypes.TEXT, allowNull: false },
    kind: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.TEXT, allowNull: false },
    gateway: { type: DataTypes.TEXT, allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'INR' },
    payment_method: { type: DataTypes.TEXT, allowNull: true },
    processed_at: { type: DataTypes.DATE, allowNull: true },
    parent_transaction_id: { type: DataTypes.TEXT, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'OrderTransaction',
    tableName: 'orders_transactions',
    timestamps: false,
  },
);
