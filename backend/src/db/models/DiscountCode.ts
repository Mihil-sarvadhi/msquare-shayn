import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

interface DiscountCodeAttributes {
  id?: number;
  source: SourceType;
  source_discount_code_id: string;
  source_price_rule_id?: string | null;
  price_rule_id?: number | null;
  code: string;
  usage_count: number;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type DiscountCodeCreationAttributes = Optional<
  DiscountCodeAttributes,
  | 'id'
  | 'source_price_rule_id'
  | 'price_rule_id'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class DiscountCode
  extends Model<DiscountCodeAttributes, DiscountCodeCreationAttributes>
  implements DiscountCodeAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_discount_code_id: string;
  declare source_price_rule_id: string | null;
  declare price_rule_id: number | null;
  declare code: string;
  declare usage_count: number;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

DiscountCode.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_discount_code_id: { type: DataTypes.TEXT, allowNull: false },
    source_price_rule_id: { type: DataTypes.TEXT, allowNull: true },
    price_rule_id: { type: DataTypes.BIGINT, allowNull: true },
    code: { type: DataTypes.TEXT, allowNull: false },
    usage_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'DiscountCode', tableName: 'discount_codes', timestamps: false },
);
