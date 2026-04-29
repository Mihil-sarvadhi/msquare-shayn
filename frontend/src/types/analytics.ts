export interface RtoByStateItem {
  state: string;
  total: number;
  rto_count: number;
  rto_rate: number;
}

export interface GeoRevenueItem {
  state: string;
  revenue: number;
  orders: number;
}

export interface LogisticsCosts {
  status: string;
  count: number;
}

export interface CustomerOverview {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  repeat_rate: number;
  /** Equivalent prior-length window — drives delta % on each Customers tile. */
  prev_total_customers: number;
  prev_new_customers: number;
  prev_returning_customers: number;
  prev_repeat_rate: number;
}

export interface CustomerSegmentItem {
  bucket: string;
  count: number;
}

export interface TopCustomerItem {
  customer_id: string;
  email: string;
  name: string | null;
  city: string;
  state: string;
  orders_count: number;
  total_spent: number;
  last_order_date: string;
}

export interface MarketingTrendItem {
  date: string;
  spend: number | null;
  purchases: number | null;
  purchase_value: number | null;
  roas: number | null;
  ctr: number | null;
  cpp: number | null;
  /** New customers (first-ever order this day). Used to compute per-day CAC. */
  new_customers: number | null;
}

export interface AttributionGap {
  meta_purchases: number;
  shopify_orders: number;
  attribution_rate: number;
  gap: number;
}

export interface TopSkuItem {
  sku: string;
  title: string;
  variant: string;
  units_sold: number;
  orders_count: number;
  revenue: number;
}

export interface ChannelRevenue {
  shopify_revenue: number;
  meta_revenue: number;
  organic_revenue: number;
}

export interface CreativeFatigueItem {
  date: string;
  frequency: number | null;
  ctr: number | null;
}

export interface AnalyticsState {
  rtoByState: RtoByStateItem[];
  geoRevenue: GeoRevenueItem[];
  logisticsCosts: LogisticsCosts[];
  customerOverview: CustomerOverview | null;
  customerSegments: CustomerSegmentItem[];
  topCustomers: TopCustomerItem[];
  marketingTrend: MarketingTrendItem[];
  attributionGap: AttributionGap | null;
  topSkus: TopSkuItem[];
  channelRevenue: ChannelRevenue | null;
  creativeFatigue: CreativeFatigueItem[];
returnReasons: ReturnReasonItem[];
  loadingOperations: boolean;
  loadingCustomers: boolean;
  loadingMarketing: boolean;
  error: string | null;
}


export interface ReturnReasonItem {
  reason: string;
  count: number;
  pct: number;
}

export interface DiscountItem {
  discount_code: string;
  orders: number;
  pct_of_total: number;
  revenue: number;
  aov: number;
}

export interface CodCashFlow {
  cod_generated: number;
  cod_remitted: number;
  pending: number;
}

export interface CodVsPrepaidItem {
  payment_mode: string;
  total: number;
  rto_count: number;
  rto_rate: number;
}

export interface MoneyStuck {
  rto_count: number;
  rto_order_value: number;
  cod_pending: number;
  total_stuck: number;
}

export interface NetRevenue {
  gross_revenue: number;
  logistics_cost: number;
  net_revenue: number;
  rto_waste: number;
}
