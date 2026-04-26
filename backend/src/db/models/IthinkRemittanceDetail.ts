import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  id?: number;
  remittance_date: string;
  awb: string;
  order_no?: string;
  price?: number;
  delivered_date?: string;
  synced_at?: Date;
}

type CA = Optional<Attrs, 'id' | 'order_no' | 'price' | 'delivered_date' | 'synced_at'>;

export class IthinkRemittanceDetail extends Model<Attrs, CA> implements Attrs {
  declare id?: number;
  declare remittance_date: string;
  declare awb: string;
  declare order_no?: string;
  declare price?: number;
  declare delivered_date?: string;
  declare synced_at?: Date;
}

IthinkRemittanceDetail.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    remittance_date: { type: DataTypes.DATEONLY, allowNull: false },
    awb: { type: DataTypes.TEXT, allowNull: false },
    order_no: DataTypes.TEXT,
    price: DataTypes.DECIMAL(10, 2),
    delivered_date: DataTypes.DATEONLY,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'IthinkRemittanceDetail',
    tableName: 'ithink_remittance_details',
    timestamps: false,
  },
);
