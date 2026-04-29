export interface KPIs {
  revenue: number; orders: number; aov: number; customers: number;
  codOrders: number; prepaidOrders: number;
  adSpend: number; impressions: number; clicks: number;
  purchases: number; purchaseValue: number; roas: number;
  totalShipments: number; delivered: number; rto: number;
  ofd: number; ndr: number; rtoRate: number; cancelledOrders: number;
}

export interface RevenueTrendItem { date: string; revenue: number; orders: number; }
export interface ShipmentsTrendItem {
  date: string;
  total_shipments: number;
  delivered: number;
  rto: number;
  ofd: number;
  ndr: number;
  /** Shopify orders with payment_mode='COD' on this day (joined for COD Mix sparkline). */
  cod_orders: number;
  /** Shopify orders with payment_mode='Prepaid' on this day. */
  prepaid_orders: number;
}
export interface MetaFunnel {
  spend: number; impressions: number; clicks: number;
  purchases: number; purchase_value: number; roas: number;
}
export interface Campaign {
  campaign_id: string; campaign_name: string; objective: string;
  spend: number; impressions: number; reach: number; clicks: number;
  purchases: number; purchase_value: number; roas: number;
}
export interface Product {
  product_id: string; title: string; revenue: number; units_sold: number; orders: number;
}
export interface LogisticsItem {
  current_status: string; current_status_code: string; count: number;
}
export interface AbandonedCarts { count: number; total_value: number; avg_value: number; }
export interface ReviewsSummary {
  store_rating: number; total_reviews: number;
  five_star: number; four_star: number; three_star: number;
  two_star: number; one_star: number;
  with_photos: number; verified_count: number;
}
export interface TopRatedProduct {
  product_id: number; handle: string; title: string;
  average_rating: number; reviews_count: number;
}
export interface RecentReview {
  review_id: number; rating: number; title: string | null; body: string | null;
  reviewer_name: string | null; created_at: string;
  has_photos: boolean; verified: boolean; picture_urls: string | null; product_title: string | null;
}
export interface ConnectorHealth {
  connector_name: string; last_sync_at: string | null;
  status: string; error_message: string | null; records_synced: number;
  realtime_last_updated_at?: string | null;
  realtime_lag_seconds?: number | null;
}

export interface RecentOrder {
  order_id: string;
  order_name: string;
  revenue: number;
  customer_city: string;
  financial_status: string;
  fulfillment_status: string;
  products: string[];
  created_at: string;
}

export interface ReviewsTrendItem {
  date: string;
  review_count: number;
  avg_rating: number;
}

export interface RevenueVsSpendItem {
  date: string;
  revenue: number;
  ad_spend: number;
}

export interface NetRevenueSnapshot {
  gross_revenue: number;
  logistics_cost: number;
  net_revenue: number;
  rto_waste: number;
}

export interface DashboardState {
  kpis: KPIs | null;
  prevKpis: KPIs | null;
  revenueTrend: RevenueTrendItem[];
  metaFunnel: MetaFunnel | null;
  campaigns: Campaign[];
  topProducts: Product[];
  logistics: LogisticsItem[];
  abandonedCarts: AbandonedCarts | null;
  health: ConnectorHealth[];
  reviewsSummary: ReviewsSummary | null;
  topRatedProducts: TopRatedProduct[];
  recentReviews: RecentReview[];
  recentOrders: RecentOrder[];
  reviewsTrend: ReviewsTrendItem[];
  shipmentsTrend: ShipmentsTrendItem[];
  revenueVsSpend: RevenueVsSpendItem[];
  netRevenue: NetRevenueSnapshot | null;
  loading: boolean;
  error: string | null;
}
