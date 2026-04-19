import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  id?: number; date?: string; campaign_id?: string; campaign_name?: string;
  objective?: string; status?: string; spend?: number; impressions?: number;
  reach?: number; clicks?: number; ctr?: number; cpm?: number; cpc?: number;
  purchases?: number; purchase_value?: number; roas?: number; synced_at?: Date;
}
type CA = Optional<Attrs, 'id' | 'date' | 'campaign_id' | 'campaign_name' | 'objective' | 'status' | 'spend' | 'impressions' | 'reach' | 'clicks' | 'ctr' | 'cpm' | 'cpc' | 'purchases' | 'purchase_value' | 'roas' | 'synced_at'>;

export class MetaDailyInsight extends Model<Attrs, CA> implements Attrs {
  declare id?: number; declare date?: string; declare campaign_id?: string;
  declare campaign_name?: string; declare objective?: string; declare status?: string;
  declare spend?: number; declare impressions?: number; declare reach?: number;
  declare clicks?: number; declare ctr?: number; declare cpm?: number; declare cpc?: number;
  declare purchases?: number; declare purchase_value?: number; declare roas?: number;
  declare synced_at?: Date;
}

MetaDailyInsight.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  date: DataTypes.DATEONLY, campaign_id: DataTypes.TEXT, campaign_name: DataTypes.TEXT,
  objective: DataTypes.TEXT, status: DataTypes.TEXT,
  spend: DataTypes.DECIMAL(12, 2), impressions: DataTypes.INTEGER, reach: DataTypes.INTEGER,
  clicks: DataTypes.INTEGER, ctr: DataTypes.DECIMAL(6, 4), cpm: DataTypes.DECIMAL(10, 4),
  cpc: DataTypes.DECIMAL(10, 4), purchases: DataTypes.INTEGER,
  purchase_value: DataTypes.DECIMAL(12, 2), roas: DataTypes.DECIMAL(8, 4),
  synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { sequelize, modelName: 'MetaDailyInsight', tableName: 'meta_daily_insights', timestamps: false });
