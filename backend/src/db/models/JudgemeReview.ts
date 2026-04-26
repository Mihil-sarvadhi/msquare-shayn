import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  review_id: bigint;
  product_id?: bigint;
  external_id?: string;
  rating?: number;
  title?: string;
  body?: string;
  reviewer_name?: string;
  reviewer_email?: string;
  created_at?: string;
  published?: boolean;
  verified?: boolean;
  has_photos?: boolean;
  picture_urls?: string;
  source?: string;
  synced_at?: Date;
}
type CA = Optional<
  Attrs,
  | 'product_id'
  | 'external_id'
  | 'rating'
  | 'title'
  | 'body'
  | 'reviewer_name'
  | 'reviewer_email'
  | 'created_at'
  | 'published'
  | 'verified'
  | 'has_photos'
  | 'picture_urls'
  | 'source'
  | 'synced_at'
>;

export class JudgemeReview extends Model<Attrs, CA> implements Attrs {
  declare review_id: bigint;
  declare product_id?: bigint;
  declare external_id?: string;
  declare rating?: number;
  declare title?: string;
  declare body?: string;
  declare reviewer_name?: string;
  declare reviewer_email?: string;
  declare created_at?: string;
  declare published?: boolean;
  declare verified?: boolean;
  declare has_photos?: boolean;
  declare picture_urls?: string;
  declare source?: string;
  declare synced_at?: Date;
}

JudgemeReview.init(
  {
    review_id: { type: DataTypes.BIGINT, primaryKey: true },
    product_id: DataTypes.BIGINT,
    external_id: DataTypes.TEXT,
    rating: DataTypes.INTEGER,
    title: DataTypes.TEXT,
    body: DataTypes.TEXT,
    reviewer_name: DataTypes.TEXT,
    reviewer_email: DataTypes.TEXT,
    created_at: DataTypes.DATEONLY,
    published: { type: DataTypes.BOOLEAN, defaultValue: true },
    verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    has_photos: { type: DataTypes.BOOLEAN, defaultValue: false },
    picture_urls: DataTypes.TEXT,
    source: DataTypes.TEXT,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'JudgemeReview', tableName: 'judgeme_reviews', timestamps: false },
);
