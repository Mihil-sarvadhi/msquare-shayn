export interface NetRevenue {
  gross_revenue: number;
  logistics_cost: number;
  net_revenue: number;
  rto_waste: number;
}

export interface RtoByStateItem {
  state: string;
  total: number;
  rto_count: number;
  rto_rate: number;
}

export interface CodVsPrepaidItem {
  payment_mode: string;
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
  fwd: number;
  rto: number;
  cod: number;
  gst: number;
  total: number;
}

export interface CodCashFlow {
  cod_generated: number;
  cod_remitted: number;
  pending: number;
}

export interface CustomerOverview {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  repeat_rate: number;
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

export interface DiscountItem {
  discount_code: string;
  orders: number;
  revenue: number;
  aov: number;
  pct_of_total: number;
}

export interface MarketingTrendItem {
  date: string;
  spend: number;
  purchases: number;
  purchase_value: number;
  roas: number;
  ctr: number;
  cpp: number;
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

export interface MoneyStuck {
  rto_count: number;
  rto_order_value: number;
  cod_pending: number;
  total_stuck: number;
}

export interface ChannelRevenue {
  shopify_revenue: number;
  meta_revenue: number;
  organic_revenue: number;
}

export interface AnalyticsState {
  netRevenue: NetRevenue | null;
  rtoByState: RtoByStateItem[];
  codVsPrepaidRto: CodVsPrepaidItem[];
  geoRevenue: GeoRevenueItem[];
  logisticsCosts: LogisticsCosts | null;
  codCashFlow: CodCashFlow | null;
  customerOverview: CustomerOverview | null;
  customerSegments: CustomerSegmentItem[];
  topCustomers: TopCustomerItem[];
  discountAnalysis: DiscountItem[];
  marketingTrend: MarketingTrendItem[];
  attributionGap: AttributionGap | null;
  topSkus: TopSkuItem[];
  moneyStuck: MoneyStuck | null;
  channelRevenue: ChannelRevenue | null;
  loadingOperations: boolean;
  loadingCustomers: boolean;
  loadingMarketing: boolean;
  error: string | null;
}
