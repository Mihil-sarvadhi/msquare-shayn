/** Per-tile current/previous pair for storefront KPIs (lets the UI compute deltas). */
export interface KpiPair {
  value: number;
  previous: number;
}

export interface FinanceKpis {
  gross_revenue: number;
  total_discounts: number;
  total_tax: number;
  total_shipping: number;
  total_refunds: number;
  net_revenue: number;
  refund_count: number;
  order_count: number;
  // Storefront strip — current vs equivalent prior period.
  /** Total online-store sessions for the window (Shopify Analytics). */
  sessions: KpiPair;
  /** % of orders placed by customers with at least one prior order, 0-100. */
  returning_customer_rate: KpiPair;
  /** Orders created in the window (excluding test orders). */
  orders: KpiPair;
  /** Per-day sessions across the window (Asia/Kolkata day buckets), oldest → newest.
   *  Drives the storefront-strip Sessions sparkline. */
  sessions_daily: number[];
}

export interface RevenueBreakdownPoint {
  date: string;
  gross: number;
  discounts: number;
  refunds: number;
  tax: number;
  /** Total sales for the day, distributed using the period's effective tax rate
   *  so the daily series sums to the Sales Breakdown's "Total sales" total exactly. */
  total: number;
  /** Number of orders created on this day — needed for per-day AOV. */
  orders: number;
}

export interface RevenueBreakdownComparison {
  current: { from: string; to: string; points: RevenueBreakdownPoint[] };
  previous: { from: string; to: string; points: RevenueBreakdownPoint[] };
}

export interface SalesByChannelEntry {
  name: string;
  amount: number;
}

export interface SalesByChannel {
  current: { from: string; to: string; total: number; channels: SalesByChannelEntry[] };
  previous: { from: string; to: string; total: number; channels: SalesByChannelEntry[] };
}

export interface SalesByProductEntry {
  product_id: string;
  title: string;
  vendor: string | null;
  product_type: string | null;
  amount: number;
  units: number;
}

export interface SalesByProduct {
  current: { from: string; to: string; total: number; products: SalesByProductEntry[] };
  previous: { from: string; to: string; total: number; products: SalesByProductEntry[] };
}

export interface PaymentMethodSplit {
  cod: { count: number; amount: number };
  prepaid: { count: number; amount: number };
  breakdown_by_gateway: { gateway: string; count: number; amount: number }[];
}

export interface RefundsSummary {
  refund_rate_over_time: { date: string; rate: number }[];
  top_reasons: { reason: string; count: number; amount: number }[];
  refunds_by_sku: { sku: string; count: number; amount: number }[];
}

export type GroupBy = 'day' | 'week' | 'month';

/**
 * Sales-Breakdown — mirrors Shopify's "Total sales breakdown" report (Net sales =
 * gross − discounts − returns; Total sales = net + shipping + taxes − return_fees).
 */
export interface SalesBreakdownTotals {
  gross_sales: number;
  discounts: number;
  returns: number;
  net_sales: number;
  shipping_charges: number;
  return_fees: number;
  taxes: number;
  total_sales: number;
  order_count: number;
}

export interface SalesBreakdownDailyPoint {
  date: string; // YYYY-MM-DD
  gross_sales: number;
  discounts: number;
  returns: number;
  net_sales: number;
  shipping_charges: number;
  return_fees: number;
  taxes: number;
  total_sales: number;
  order_count: number;
}

export interface SalesBreakdown {
  current: {
    from: string;
    to: string;
    totals: SalesBreakdownTotals;
    daily: SalesBreakdownDailyPoint[];
  };
  previous: {
    from: string;
    to: string;
    totals: SalesBreakdownTotals;
  };
}
