import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  shipment_code: string;
  order_code?: string;
  awb?: string;
  courier?: string;
  status?: string;
  dispatch_date?: Date;
  expected_delivery?: Date;
  channel?: string;
  facility_code?: string;
  weight?: number;
  synced_at?: Date;
}
type CA = Optional<
  Attrs,
  | 'order_code'
  | 'awb'
  | 'courier'
  | 'status'
  | 'dispatch_date'
  | 'expected_delivery'
  | 'channel'
  | 'facility_code'
  | 'weight'
  | 'synced_at'
>;

export class UnicommerceShipment extends Model<Attrs, CA> implements Attrs {
  declare shipment_code: string;
  declare order_code?: string;
  declare awb?: string;
  declare courier?: string;
  declare status?: string;
  declare dispatch_date?: Date;
  declare expected_delivery?: Date;
  declare channel?: string;
  declare facility_code?: string;
  declare weight?: number;
  declare synced_at?: Date;
}

UnicommerceShipment.init(
  {
    shipment_code: { type: DataTypes.TEXT, primaryKey: true },
    order_code: DataTypes.TEXT,
    awb: DataTypes.TEXT,
    courier: DataTypes.TEXT,
    status: DataTypes.TEXT,
    dispatch_date: DataTypes.DATE,
    expected_delivery: DataTypes.DATE,
    channel: DataTypes.TEXT,
    facility_code: DataTypes.TEXT,
    weight: DataTypes.DECIMAL(8, 3),
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'UnicommerceShipment',
    tableName: 'unicommerce_shipments',
    timestamps: false,
  },
);
