export interface DateRange {
  since: string;
  until: string;
}

export interface KpiResult {
  revenue: number;
  orders: number;
  aov: number;
  customers: number;
  codOrders: number;
  prepaidOrders: number;
  adSpend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  totalShipments: number;
  delivered: number;
  rto: number;
  ofd: number;
  ndr: number;
  rtoRate: number;
  cancelledOrders: number;
  /** Lifetime customer count from `shopify_customers` (range-independent). */
  lifetimeCustomers: number;
}

export interface RevenueTrendRow {
  date: string;
  revenue: number;
  orders: number;
}

/** Per-day shipment counts by status, used by the Operations page sparklines.
 *  cod_orders / prepaid_orders come from shopify_orders.payment_mode (joined
 *  by IST day) so the COD Mix sparkline can compute COD% per day. */
export interface ShipmentsTrendRow {
  date: string;
  total_shipments: number;
  delivered: number;
  rto: number;
  ofd: number;
  ndr: number;
  cod_orders: number;
  prepaid_orders: number;
}
export interface MetaFunnelRow {
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchase_value: number;
  roas: number;
}
export interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  objective: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  purchases: number;
  purchase_value: number;
  roas: number;
}
export interface TopProductRow {
  product_id: string;
  title: string;
  revenue: number;
  units_sold: number;
  orders: number;
}
export interface LogisticsRow {
  current_status: string;
  current_status_code: string;
  count: number;
}
export interface AbandonedCartsRow {
  count: number;
  total_value: number;
  avg_value: number;
}
export interface ReviewsSummaryRow {
  store_rating: number;
  total_reviews: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
  with_photos: number;
  verified_count: number;
}
export interface ReviewsTrendRow {
  date: string;
  review_count: number;
  avg_rating: number;
}
export interface TopRatedProductRow {
  product_id: number;
  handle: string;
  title: string;
  average_rating: number;
  reviews_count: number;
}
export interface RecentReviewRow {
  review_id: number;
  rating: number;
  title: string;
  body: string;
  reviewer_name: string;
  created_at: string;
  has_photos: boolean;
  verified: boolean;
  picture_urls: string;
  product_title: string;
}
export interface AllReviewsResult {
  reviews: RecentReviewRow[];
  total: number;
  page: number;
  limit: number;
}
export interface AllReviewsQuery {
  page?: string;
  limit?: string;
  rating?: string;
  search?: string;
  range?: string;
}

export interface RecentOrderRow {
  order_id: string;
  order_name: string;
  revenue: number;
  financial_status: string;
  fulfillment_status: string;
  customer_city: string;
  created_at: string;
  products: string[];
}

export interface RevenueVsSpendRow {
  date: string;
  revenue: string;
  ad_spend: string;
}

/* ── Marquee (grouped top-of-page ticker) ────────────────────────────────
 * Aggregates current-period + previous-period values for every metric the
 * top-of-dashboard ticker needs in a single round-trip. The frontend Ticker
 * renders these in named groups (Finance, Sales, Marketing, Operations,
 * Customers, Reviews) — one tinted card per group. */
export interface MarqueeFinance {
  revenue: number;
  prevRevenue: number;
  netRevenue: number;
  prevNetRevenue: number;
  aov: number;
  prevAov: number;
  logisticsCost: number;
  prevLogisticsCost: number;
  rtoWaste: number;
  prevRtoWaste: number;
  /** Net margin % = netRevenue / grossRevenue * 100 */
  netMargin: number;
  prevNetMargin: number;
}

export interface MarqueeSales {
  orders: number;
  prevOrders: number;
  cancelledOrders: number;
  prevCancelledOrders: number;
  codOrders: number;
  prevCodOrders: number;
  prepaidOrders: number;
  prevPrepaidOrders: number;
  /** COD share % of paid orders */
  codShare: number;
  prevCodShare: number;
}

export interface MarqueeMarketing {
  adSpend: number;
  prevAdSpend: number;
  roas: number;
  prevRoas: number;
  impressions: number;
  prevImpressions: number;
  clicks: number;
  prevClicks: number;
  purchases: number;
  prevPurchases: number;
  /** Click-through rate % = clicks / impressions * 100 */
  ctr: number;
  prevCtr: number;
}

export interface MarqueeOperations {
  totalShipments: number;
  prevTotalShipments: number;
  delivered: number;
  prevDelivered: number;
  /** Delivered / total * 100 */
  fulfilledPct: number;
  prevFulfilledPct: number;
  rtoRate: number;
  prevRtoRate: number;
  ndr: number;
  prevNdr: number;
  ofd: number;
}

export interface MarqueeCustomers {
  /** Lifetime customer count from shopify_customers (range-independent). */
  lifetimeCustomers: number;
  newCustomers: number;
  prevNewCustomers: number;
  returningCustomers: number;
  prevReturningCustomers: number;
  repeatRate: number;
  prevRepeatRate: number;
  abandonedCarts: number;
  prevAbandonedCarts: number;
}

export interface MarqueeReviews {
  /** Lifetime store rating across all published reviews. */
  storeRating: number;
  /** Reviews collected in the selected range. */
  totalReviews: number;
  prevTotalReviews: number;
  fiveStarCount: number;
  verifiedCount: number;
}

export interface MarqueeResult {
  range: { since: string; until: string };
  prevRange: { since: string; until: string };
  finance: MarqueeFinance;
  sales: MarqueeSales;
  marketing: MarqueeMarketing;
  operations: MarqueeOperations;
  customers: MarqueeCustomers;
  reviews: MarqueeReviews;
}
