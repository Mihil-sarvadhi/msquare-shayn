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
  spend: string;
  purchases: string;
  purchase_value: string;
  roas: string;
  ctr: string;
  cpp: string;
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
