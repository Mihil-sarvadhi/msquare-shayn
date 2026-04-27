import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type ProductStatus = 'active' | 'draft' | 'archived';

interface ProductAttributes {
  id?: number;
  source: SourceType;
  source_product_id: string;
  title?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  status?: ProductStatus | null;
  tags?: string[] | null;
  handle?: string | null;
  image_url?: string | null;
  published_at?: Date | null;
  total_variants: number;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type ProductCreationAttributes = Optional<
  ProductAttributes,
  | 'id'
  | 'title'
  | 'vendor'
  | 'product_type'
  | 'status'
  | 'tags'
  | 'handle'
  | 'image_url'
  | 'published_at'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_product_id: string;
  declare title: string | null;
  declare vendor: string | null;
  declare product_type: string | null;
  declare status: ProductStatus | null;
  declare tags: string[] | null;
  declare handle: string | null;
  declare image_url: string | null;
  declare published_at: Date | null;
  declare total_variants: number;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

Product.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_product_id: { type: DataTypes.TEXT, allowNull: false },
    title: { type: DataTypes.TEXT, allowNull: true },
    vendor: { type: DataTypes.TEXT, allowNull: true },
    product_type: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.TEXT, allowNull: true },
    tags: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true },
    handle: { type: DataTypes.TEXT, allowNull: true },
    image_url: { type: DataTypes.TEXT, allowNull: true },
    published_at: { type: DataTypes.DATE, allowNull: true },
    total_variants: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'Product', tableName: 'products', timestamps: false },
);
