import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  id?: number;
  average_rating?: number;
  total_reviews?: number;
  synced_at?: Date;
}
type CA = Optional<Attrs, 'id' | 'average_rating' | 'total_reviews' | 'synced_at'>;

export class JudgemeStoreSummary extends Model<Attrs, CA> implements Attrs {
  declare id?: number;
  declare average_rating?: number;
  declare total_reviews?: number;
  declare synced_at?: Date;
}

JudgemeStoreSummary.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    average_rating: DataTypes.DECIMAL(3, 2),
    total_reviews: DataTypes.INTEGER,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'JudgemeStoreSummary',
    tableName: 'judgeme_store_summary',
    timestamps: false,
  },
);
