export interface BestSellerRow {
  source_variant_id: string;
  sku: string | null;
  product_title: string | null;
  variant_title: string | null;
  units_sold: number;
  revenue: number;
}

export interface SlowMoverRow {
  source_variant_id: string;
  sku: string | null;
  product_title: string | null;
  units_sold: number;
  available: number;
  last_sold_at: string | null;
}

export interface InventoryRow {
  variant_id: number;
  source_variant_id: string;
  sku: string | null;
  product_title: string | null;
  variant_title: string | null;
  total_available: number;
  per_location: { location_id: number; location_name: string | null; available: number }[];
}

export interface MarginRow {
  source_variant_id: string;
  sku: string | null;
  product_title: string | null;
  variant_title: string | null;
  price: number | null;
  cost: number | null;
  margin_amount: number | null;
  margin_pct: number | null;
}

export interface CatalogKpis {
  active_skus: number;
  stockouts: number;
  avg_margin_pct: number | null;
  total_inventory_value: number;
  /** Cumulative count of active products created on/before each day in the window
   *  (oldest → newest). Drives the Active SKUs sparkline. */
  active_skus_daily: number[];
}
