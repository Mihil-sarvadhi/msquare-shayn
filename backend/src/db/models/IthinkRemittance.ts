import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  id?: number;
  remittance_date?: string;
  cod_generated?: number;
  bill_adjusted?: number;
  transaction_fee?: number;
  gst_charges?: number;
  wallet_amount?: number;
  advance_hold?: number;
  cod_remitted?: number;
  synced_at?: Date;
}
type CA = Optional<
  Attrs,
  | 'id'
  | 'remittance_date'
  | 'cod_generated'
  | 'bill_adjusted'
  | 'transaction_fee'
  | 'gst_charges'
  | 'wallet_amount'
  | 'advance_hold'
  | 'cod_remitted'
  | 'synced_at'
>;

export class IthinkRemittance extends Model<Attrs, CA> implements Attrs {
  declare id?: number;
  declare remittance_date?: string;
  declare cod_generated?: number;
  declare bill_adjusted?: number;
  declare transaction_fee?: number;
  declare gst_charges?: number;
  declare wallet_amount?: number;
  declare advance_hold?: number;
  declare cod_remitted?: number;
  declare synced_at?: Date;
}

IthinkRemittance.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    remittance_date: { type: DataTypes.DATEONLY, unique: true },
    cod_generated: DataTypes.DECIMAL(12, 2),
    bill_adjusted: DataTypes.DECIMAL(12, 2),
    transaction_fee: DataTypes.DECIMAL(10, 2),
    gst_charges: DataTypes.DECIMAL(10, 2),
    wallet_amount: DataTypes.DECIMAL(12, 2),
    advance_hold: DataTypes.DECIMAL(12, 2),
    cod_remitted: DataTypes.DECIMAL(12, 2),
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'IthinkRemittance', tableName: 'ithink_remittance', timestamps: false },
);
