import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

interface ShopifyAnalyticsDailyAttributes {
  id?: number;
  source: SourceType;
  date: string;
  sessions: number;
  orders_fulfilled: number;
  synced_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

type ShopifyAnalyticsDailyCreationAttributes = Optional<
  ShopifyAnalyticsDailyAttributes,
  'id' | 'created_at' | 'updated_at'
>;

export class ShopifyAnalyticsDaily
  extends Model<ShopifyAnalyticsDailyAttributes, ShopifyAnalyticsDailyCreationAttributes>
  implements ShopifyAnalyticsDailyAttributes
{
  declare id: number;
  declare source: SourceType;
  declare date: string;
  declare sessions: number;
  declare orders_fulfilled: number;
  declare synced_at: Date;
  declare created_at: Date;
  declare updated_at: Date;
}

ShopifyAnalyticsDaily.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'shopify' },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    sessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    orders_fulfilled: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    synced_at: { type: DataTypes.DATE, allowNull: false },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'ShopifyAnalyticsDaily',
    tableName: 'shopify_analytics_daily',
    timestamps: false,
  },
);
