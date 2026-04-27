import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type GiftCardStatus = 'enabled' | 'disabled' | 'expired';

interface GiftCardAttributes {
  id?: number;
  source: SourceType;
  source_gift_card_id: string;
  code_last4?: string | null;
  initial_value: number;
  balance: number;
  currency: string;
  customer_id?: string | null;
  expires_on?: Date | null;
  disabled_at?: Date | null;
  status: GiftCardStatus;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type GiftCardCreationAttributes = Optional<
  GiftCardAttributes,
  | 'id'
  | 'code_last4'
  | 'customer_id'
  | 'expires_on'
  | 'disabled_at'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class GiftCard
  extends Model<GiftCardAttributes, GiftCardCreationAttributes>
  implements GiftCardAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_gift_card_id: string;
  declare code_last4: string | null;
  declare initial_value: number;
  declare balance: number;
  declare currency: string;
  declare customer_id: string | null;
  declare expires_on: Date | null;
  declare disabled_at: Date | null;
  declare status: GiftCardStatus;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

GiftCard.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_gift_card_id: { type: DataTypes.TEXT, allowNull: false },
    code_last4: { type: DataTypes.TEXT, allowNull: true },
    initial_value: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'INR' },
    customer_id: { type: DataTypes.TEXT, allowNull: true },
    expires_on: { type: DataTypes.DATEONLY, allowNull: true },
    disabled_at: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'enabled' },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'GiftCard', tableName: 'gift_cards', timestamps: false },
);
