import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type DisputeStatus =
  | 'needs_response'
  | 'under_review'
  | 'charge_refunded'
  | 'accepted'
  | 'won'
  | 'lost';

interface DisputeAttributes {
  id?: number;
  source: SourceType;
  source_dispute_id: string;
  order_id?: string | null;
  amount: number;
  currency: string;
  reason?: string | null;
  status: DisputeStatus;
  evidence_due_by?: Date | null;
  finalized_on?: Date | null;
  network_reason_code?: string | null;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type DisputeCreationAttributes = Optional<
  DisputeAttributes,
  | 'id'
  | 'order_id'
  | 'reason'
  | 'evidence_due_by'
  | 'finalized_on'
  | 'network_reason_code'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class Dispute
  extends Model<DisputeAttributes, DisputeCreationAttributes>
  implements DisputeAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_dispute_id: string;
  declare order_id: string | null;
  declare amount: number;
  declare currency: string;
  declare reason: string | null;
  declare status: DisputeStatus;
  declare evidence_due_by: Date | null;
  declare finalized_on: Date | null;
  declare network_reason_code: string | null;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

Dispute.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_dispute_id: { type: DataTypes.TEXT, allowNull: false },
    order_id: { type: DataTypes.TEXT, allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'INR' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.TEXT, allowNull: false },
    evidence_due_by: { type: DataTypes.DATE, allowNull: true },
    finalized_on: { type: DataTypes.DATEONLY, allowNull: true },
    network_reason_code: { type: DataTypes.TEXT, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'Dispute', tableName: 'disputes', timestamps: false },
);
