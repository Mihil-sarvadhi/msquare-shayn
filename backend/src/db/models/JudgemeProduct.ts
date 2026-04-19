import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  product_id: bigint; external_id?: string; handle?: string; title?: string;
  average_rating?: number; reviews_count?: number; updated_at?: Date; synced_at?: Date;
}
type CA = Optional<Attrs, 'external_id' | 'handle' | 'title' | 'average_rating' | 'reviews_count' | 'updated_at' | 'synced_at'>;

export class JudgemeProduct extends Model<Attrs, CA> implements Attrs {
  declare product_id: bigint; declare external_id?: string; declare handle?: string;
  declare title?: string; declare average_rating?: number; declare reviews_count?: number;
  declare updated_at?: Date; declare synced_at?: Date;
}

JudgemeProduct.init({
  product_id: { type: DataTypes.BIGINT, primaryKey: true },
  external_id: DataTypes.TEXT, handle: DataTypes.TEXT, title: DataTypes.TEXT,
  average_rating: DataTypes.DECIMAL(3, 2), reviews_count: DataTypes.INTEGER,
  updated_at: DataTypes.DATE, synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { sequelize, modelName: 'JudgemeProduct', tableName: 'judgeme_products', timestamps: false });
