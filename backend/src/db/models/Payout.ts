import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type PayoutStatus = 'scheduled' | 'in_transit' | 'paid' | 'failed' | 'cancelled';

interface PayoutAttributes {
  id?: number;
  source: SourceType;
  source_payout_id: string;
  payout_date?: Date | null;
  status: PayoutStatus;
  amount: number;
  currency: string;
  bank_summary?: Record<string, unknown> | null;
  charges_gross?: number | null;
  refunds_gross?: number | null;
  adjustments_gross?: number | null;
  fees_total?: number | null;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type PayoutCreationAttributes = Optional<
  PayoutAttributes,
  | 'id'
  | 'payout_date'
  | 'bank_summary'
  | 'charges_gross'
  | 'refunds_gross'
  | 'adjustments_gross'
  | 'fees_total'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class Payout
  extends Model<PayoutAttributes, PayoutCreationAttributes>
  implements PayoutAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_payout_id: string;
  declare payout_date: Date | null;
  declare status: PayoutStatus;
  declare amount: number;
  declare currency: string;
  declare bank_summary: Record<string, unknown> | null;
  declare charges_gross: number | null;
  declare refunds_gross: number | null;
  declare adjustments_gross: number | null;
  declare fees_total: number | null;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

Payout.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_payout_id: { type: DataTypes.TEXT, allowNull: false },
    payout_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.TEXT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'INR' },
    bank_summary: { type: DataTypes.JSONB, allowNull: true },
    charges_gross: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    refunds_gross: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    adjustments_gross: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    fees_total: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'Payout', tableName: 'payouts', timestamps: false },
);
