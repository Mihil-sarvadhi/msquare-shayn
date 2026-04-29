export interface CatalogKpisApi {
  active_skus: number;
  stockouts: number;
  avg_margin_pct: number | null;
  total_inventory_value: number;
  /** Cumulative active-products count per day for the window. Drives Active SKUs sparkline. */
  active_skus_daily: number[];
}

export interface ProductRowApi {
  id: number;
  source_product_id: string;
  title: string | null;
  vendor: string | null;
  product_type: string | null;
  status: string | null;
  tags: string[] | null;
  image_url: string | null;
  total_variants: number;
  total_inventory: number;
}

export interface ProductDetailApi {
  product: ProductRowApi & { handle: string | null; published_at: string | null };
  variants: VariantApi[];
}

export interface VariantApi {
  id: number;
  source_variant_id: string;
  sku: string | null;
  title: string | null;
  price: number | null;
  compare_at_price: number | null;
  weight_grams: number | null;
  barcode: string | null;
  source_inventory_item_id: string | null;
  position: number | null;
}

export interface BestSellerRowApi {
  source_variant_id: string;
  sku: string | null;
  product_title: string | null;
  variant_title: string | null;
  units_sold: number;
  revenue: number;
}

export interface SlowMoverRowApi {
  source_variant_id: string;
  sku: string | null;
  product_title: string | null;
  units_sold: number;
  available: number;
  last_sold_at: string | null;
}

export interface InventoryRowApi {
  variant_id: number;
  source_variant_id: string;
  sku: string | null;
  product_title: string | null;
  variant_title: string | null;
  total_available: number;
  per_location: { location_id: number; location_name: string | null; available: number }[];
}

export interface MarginRowApi {
  source_variant_id: string;
  sku: string | null;
  product_title: string | null;
  variant_title: string | null;
  price: number | null;
  cost: number | null;
  margin_amount: number | null;
  margin_pct: number | null;
}
