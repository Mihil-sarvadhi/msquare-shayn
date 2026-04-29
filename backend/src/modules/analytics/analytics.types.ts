export interface RtoByStateRow {
  state: string;
  total: string;
  rto_count: string;
  rto_rate: string;
}

export interface CodVsPrepaidRow {
  payment_mode: string;
  total: string;
  rto_count: string;
  rto_rate: string;
}

export interface GeoRevenueRow {
  state: string;
  revenue: string;
  orders: string;
}

export interface LogisticsCostsRow {
  fwd: string;
  rto: string;
  cod: string;
  gst: string;
  total: string;
}

export interface CodCashFlowRow {
  cod_generated: string;
  cod_remitted: string;
  pending: string;
}

export interface CustomerOverviewRow {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  repeat_rate: number;
}

/** customerOverview response shape with prev-period values for delta rendering. */
export interface CustomerOverviewWithPrev extends CustomerOverviewRow {
  prev_total_customers: number;
  prev_new_customers: number;
  prev_returning_customers: number;
  prev_repeat_rate: number;
}

export interface CustomerSegmentRow {
  bucket: string;
  count: string;
}

export interface TopCustomerRow {
  customer_id: string;
  email: string;
  name: string | null;
  city: string;
  state: string;
  orders_count: string;
  total_spent: string;
  last_order_date: string;
}

export interface DiscountRow {
  discount_code: string;
  orders: string;
  revenue: string;
  aov: string;
  pct_of_total: string;
}

export interface MarketingTrendRow {
  date: string;
  spend: string | null;
  purchases: string | null;
  purchase_value: string | null;
  roas: string | null;
  ctr: string | null;
  cpp: string | null;
}

export interface AttributionGapRow {
  meta_purchases: string;
  shopify_orders: string;
}

export interface TopSkuRow {
  sku: string;
  title: string;
  variant: string;
  units_sold: string;
  orders_count: string;
  revenue: string;
}

export interface MoneyStuckRow {
  rto_count: string;
  rto_order_value: string;
  cod_pending: string;
  total_stuck: string;
}

export interface ChannelRevenueRow {
  shopify_revenue: string;
  meta_revenue: string;
  organic_revenue: string;
}

export interface CourierScorecardRow {
  courier: string;
  volume: string;
  split_pct: string;
  rto_rate: string;
  avg_sla_days: string;
  cost_per_shipment: string;
}

export interface SlaByZoneRow {
  zone: string;
  median_days: string;
  p95_days: string;
  total_shipments: string;
}

export interface CreativeFatigueRow {
  date: string;
  frequency: string | null;
  ctr: string | null;
}

export interface CohortRetentionRow {
  cohort_month: string;
  cohort_size: string;
  m0: string;
  m1: string | null;
  m2: string | null;
  m3: string | null;
  m4: string | null;
  m5: string | null;
}

export interface ReturnReasonRow {
  reason: string;
  count: string;
  pct: string;
}
