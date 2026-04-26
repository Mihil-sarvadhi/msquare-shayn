import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type BalanceTransactionType =
  | 'charge'
  | 'refund'
  | 'adjustment'
  | 'fee'
  | 'dispute'
  | 'reserve';

interface BalanceTransactionAttributes {
  id?: number;
  source: SourceType;
  source_balance_transaction_id: string;
  payout_id?: number | null;
  source_payout_id?: string | null;
  transaction_id?: string | null;
  type: BalanceTransactionType;
  amount: number;
  fee?: number | null;
  net?: number | null;
  processed_at?: Date | null;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type BalanceTransactionCreationAttributes = Optional<
  BalanceTransactionAttributes,
  | 'id'
  | 'payout_id'
  | 'source_payout_id'
  | 'transaction_id'
  | 'fee'
  | 'net'
  | 'processed_at'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class BalanceTransaction
  extends Model<BalanceTransactionAttributes, BalanceTransactionCreationAttributes>
  implements BalanceTransactionAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_balance_transaction_id: string;
  declare payout_id: number | null;
  declare source_payout_id: string | null;
  declare transaction_id: string | null;
  declare type: BalanceTransactionType;
  declare amount: number;
  declare fee: number | null;
  declare net: number | null;
  declare processed_at: Date | null;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

BalanceTransaction.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_balance_transaction_id: { type: DataTypes.TEXT, allowNull: false },
    payout_id: { type: DataTypes.BIGINT, allowNull: true },
    source_payout_id: { type: DataTypes.TEXT, allowNull: true },
    transaction_id: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.TEXT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    fee: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    net: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    processed_at: { type: DataTypes.DATE, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'BalanceTransaction',
    tableName: 'balance_transactions',
    timestamps: false,
  },
);
