import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  customer_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  orders_count?: number;
  total_spent?: number;
  created_at?: Date;
  synced_at?: Date;
}
type CA = Optional<
  Attrs,
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'city'
  | 'state'
  | 'orders_count'
  | 'total_spent'
  | 'created_at'
  | 'synced_at'
>;

export class ShopifyCustomer extends Model<Attrs, CA> implements Attrs {
  declare customer_id: string;
  declare email?: string;
  declare first_name?: string;
  declare last_name?: string;
  declare city?: string;
  declare state?: string;
  declare orders_count?: number;
  declare total_spent?: number;
  declare created_at?: Date;
  declare synced_at?: Date;
}

ShopifyCustomer.init(
  {
    customer_id: { type: DataTypes.TEXT, primaryKey: true },
    email: DataTypes.TEXT,
    first_name: DataTypes.TEXT,
    last_name: DataTypes.TEXT,
    city: DataTypes.TEXT,
    state: DataTypes.TEXT,
    orders_count: DataTypes.INTEGER,
    total_spent: DataTypes.DECIMAL(12, 2),
    created_at: DataTypes.DATE,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'ShopifyCustomer', tableName: 'shopify_customers', timestamps: false },
);
