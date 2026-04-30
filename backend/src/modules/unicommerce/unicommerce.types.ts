export interface UnicommerceFilters {
  since: string;
  until: string;
  channel?: string;
}

export interface ChannelSummaryRow {
  channel: string;
  orders: number;
  revenue: number;
  aov: number;
  cod_orders: number;
  prepaid_orders: number;
  cancelled: number;
  returned: number;
}

export interface RevenueTrendRow {
  date: string;
  channel: string;
  orders: number;
  revenue: number;
  units_sold: number;
  cancelled_orders: number;
  returned_orders: number;
  cod_orders: number;
  prepaid_orders: number;
}

export interface TopProductRow {
  sku: string;
  product_name: string | null;
  channel: string | null;
  units_sold: number;
  revenue: number;
  orders: number;
}

export interface OrderStatusRow {
  status: string;
  count: number;
  revenue: number;
}

export interface ChannelComparisonRow {
  channel: string;
  orders: number;
  revenue: number;
  aov: number;
  cod_orders: number;
  cancelled: number;
}

export interface ReturnsRow {
  channel: string | null;
  return_reason: string | null;
  count: number;
}

export interface CategoryRow {
  category: string;
  items: number;
  orders: number;
  revenue: number;
  pct_of_total: number;
}

export interface InventorySummary {
  total_skus: number;
  out_of_stock_skus: number;
  out_of_stock_pct: number;
}

export interface FastMovingSkuRow {
  sku: string;
  product_name: string | null;
  inventory: number;
  sales_last_30_days: number;
  days_of_inventory: number | null;
}

export interface ZeroOrderSkuRow {
  sku: string;
  product_name: string | null;
  inventory: number;
}

export interface TodaySnapshot {
  today_date: string;
  yesterday_date: string;
  today_revenue: number;
  yesterday_revenue: number;
  today_order_items: number;
  yesterday_order_items: number;
}

export interface ChannelReturnsRow {
  channel: string;
  units_sold: number;
  return_units: number;
  return_pct: number;
}

export interface ProductByChannelRow {
  sku: string;
  product_name: string | null;
  total_revenue: number;
  shopify_revenue: number;
  amazon_revenue: number;
  flipkart_revenue: number;
  myntra_revenue: number;
  eternz_revenue: number;
  other_revenue: number;
}

export interface TopProductWithPctRow {
  sku: string;
  product_name: string | null;
  channel: string | null;
  units_sold: number;
  revenue: number;
  orders: number;
  pct_of_total: number;
}

export interface RecentOrderRow {
  order_code: string;
  display_order_code: string | null;
  channel: string | null;
  status: string | null;
  order_date: string | null;
  total_price: number;
  cod: boolean;
  customer_name: string | null;
  city: string | null;
  state: string | null;
}
