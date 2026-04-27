import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

interface ProductVariantAttributes {
  id?: number;
  source: SourceType;
  source_variant_id: string;
  source_product_id: string;
  product_id?: number | null;
  sku?: string | null;
  title?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  weight_grams?: number | null;
  barcode?: string | null;
  source_inventory_item_id?: string | null;
  position?: number | null;
  source_metadata?: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type ProductVariantCreationAttributes = Optional<
  ProductVariantAttributes,
  | 'id'
  | 'product_id'
  | 'sku'
  | 'title'
  | 'price'
  | 'compare_at_price'
  | 'weight_grams'
  | 'barcode'
  | 'source_inventory_item_id'
  | 'position'
  | 'source_metadata'
  | 'created_at'
  | 'updated_at'
  | 'synced_at'
>;

export class ProductVariant
  extends Model<ProductVariantAttributes, ProductVariantCreationAttributes>
  implements ProductVariantAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_variant_id: string;
  declare source_product_id: string;
  declare product_id: number | null;
  declare sku: string | null;
  declare title: string | null;
  declare price: number | null;
  declare compare_at_price: number | null;
  declare weight_grams: number | null;
  declare barcode: string | null;
  declare source_inventory_item_id: string | null;
  declare position: number | null;
  declare source_metadata: Record<string, unknown> | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare synced_at: Date;
}

ProductVariant.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_variant_id: { type: DataTypes.TEXT, allowNull: false },
    source_product_id: { type: DataTypes.TEXT, allowNull: false },
    product_id: { type: DataTypes.BIGINT, allowNull: true },
    sku: { type: DataTypes.TEXT, allowNull: true },
    title: { type: DataTypes.TEXT, allowNull: true },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    compare_at_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    weight_grams: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
    barcode: { type: DataTypes.TEXT, allowNull: true },
    source_inventory_item_id: { type: DataTypes.TEXT, allowNull: true },
    position: { type: DataTypes.INTEGER, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  { sequelize, modelName: 'ProductVariant', tableName: 'product_variants', timestamps: false },
);
