import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

interface PriceRuleAttributes {
  id?: number;
  source: SourceType;
  source_price_rule_id: string;
  title?: string | null;
  value_type?: string | null;
  value?: number | null;
  target_type?: string | null;
  starts_at?: Date | null;
  ends_at?: Date | null;
  usage_limit?: number | null;
  customer_selection?: string | null;
  prerequisite_subtotal?: number | null;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type PriceRuleCreationAttributes = Optional<
  PriceRuleAttributes,
  | 'id'
  | 'title'
  | 'value_type'
  | 'value'
  | 'target_type'
  | 'starts_at'
  | 'ends_at'
  | 'usage_limit'
  | 'customer_selection'
  | 'prerequisite_subtotal'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class PriceRule
  extends Model<PriceRuleAttributes, PriceRuleCreationAttributes>
  implements PriceRuleAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_price_rule_id: string;
  declare title: string | null;
  declare value_type: string | null;
  declare value: number | null;
  declare target_type: string | null;
  declare starts_at: Date | null;
  declare ends_at: Date | null;
  declare usage_limit: number | null;
  declare customer_selection: string | null;
  declare prerequisite_subtotal: number | null;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

PriceRule.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_price_rule_id: { type: DataTypes.TEXT, allowNull: false },
    title: { type: DataTypes.TEXT, allowNull: true },
    value_type: { type: DataTypes.TEXT, allowNull: true },
    value: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    target_type: { type: DataTypes.TEXT, allowNull: true },
    starts_at: { type: DataTypes.DATE, allowNull: true },
    ends_at: { type: DataTypes.DATE, allowNull: true },
    usage_limit: { type: DataTypes.INTEGER, allowNull: true },
    customer_selection: { type: DataTypes.TEXT, allowNull: true },
    prerequisite_subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'PriceRule', tableName: 'price_rules', timestamps: false },
);
