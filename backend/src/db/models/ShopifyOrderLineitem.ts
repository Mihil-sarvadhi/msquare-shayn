import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  id?: number; order_id: string; sku?: string; product_id?: string;
  title?: string; variant?: string; quantity?: number; unit_price?: number;
}
type CreationAttrs = Optional<Attrs, 'id' | 'sku' | 'product_id' | 'title' | 'variant' | 'quantity' | 'unit_price'>;

export class ShopifyOrderLineitem extends Model<Attrs, CreationAttrs> implements Attrs {
  declare id?: number; declare order_id: string; declare sku?: string;
  declare product_id?: string; declare title?: string; declare variant?: string;
  declare quantity?: number; declare unit_price?: number;
}

ShopifyOrderLineitem.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  order_id: DataTypes.TEXT,
  sku: DataTypes.TEXT, product_id: DataTypes.TEXT, title: DataTypes.TEXT,
  variant: DataTypes.TEXT, quantity: DataTypes.INTEGER, unit_price: DataTypes.DECIMAL(10, 2),
}, { sequelize, modelName: 'ShopifyOrderLineitem', tableName: 'shopify_order_lineitems', timestamps: false });
