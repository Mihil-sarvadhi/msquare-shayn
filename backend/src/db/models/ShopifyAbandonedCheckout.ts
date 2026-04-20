import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  checkout_id: string;
  created_at?: Date;
  cart_value?: number;
  email?: string;
  recovered?: boolean;
  stage?: string;
  synced_at?: Date;
}
type CA = Optional<
  Attrs,
  'created_at' | 'cart_value' | 'email' | 'recovered' | 'stage' | 'synced_at'
>;

export class ShopifyAbandonedCheckout extends Model<Attrs, CA> implements Attrs {
  declare checkout_id: string;
  declare created_at?: Date;
  declare cart_value?: number;
  declare email?: string;
  declare recovered?: boolean;
  declare stage?: string;
  declare synced_at?: Date;
}

ShopifyAbandonedCheckout.init(
  {
    checkout_id: { type: DataTypes.TEXT, primaryKey: true },
    created_at: DataTypes.DATE,
    cart_value: DataTypes.DECIMAL(12, 2),
    email: DataTypes.TEXT,
    recovered: { type: DataTypes.BOOLEAN, defaultValue: false },
    stage: DataTypes.TEXT,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'ShopifyAbandonedCheckout',
    tableName: 'shopify_abandoned_checkouts',
    timestamps: false,
  },
);
