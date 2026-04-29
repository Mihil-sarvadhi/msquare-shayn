import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  id?: number;
  shipment_code?: string;
  order_code?: string;
  return_awb?: string;
  return_reason?: string;
  status?: string;
  channel?: string;
  facility_code?: string;
  created_date?: Date;
  completed_date?: Date;
  synced_at?: Date;
}
type CA = Optional<Attrs, keyof Attrs>;

export class UnicommerceReturn extends Model<Attrs, CA> implements Attrs {
  declare id?: number;
  declare shipment_code?: string;
  declare order_code?: string;
  declare return_awb?: string;
  declare return_reason?: string;
  declare status?: string;
  declare channel?: string;
  declare facility_code?: string;
  declare created_date?: Date;
  declare completed_date?: Date;
  declare synced_at?: Date;
}

UnicommerceReturn.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    shipment_code: DataTypes.TEXT,
    order_code: DataTypes.TEXT,
    return_awb: DataTypes.TEXT,
    return_reason: DataTypes.TEXT,
    status: DataTypes.TEXT,
    channel: DataTypes.TEXT,
    facility_code: DataTypes.TEXT,
    created_date: DataTypes.DATE,
    completed_date: DataTypes.DATE,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'UnicommerceReturn',
    tableName: 'unicommerce_returns',
    timestamps: false,
  },
);
