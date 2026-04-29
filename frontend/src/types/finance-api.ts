/** Per-tile current/previous pair for storefront KPIs (lets the UI compute deltas). */
export interface KpiPairApi {
  value: number;
  previous: number;
}

export interface FinanceKpisApi {
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
  sessions: KpiPairApi;
  /** % of orders placed by customers with at least one prior order, 0-100. */
  returning_customer_rate: KpiPairApi;
  /** Orders created in the window (excluding test orders). */
  orders: KpiPairApi;
}

export interface RevenueBreakdownPointApi {
  date: string;
  gross: number;
  discounts: number;
  refunds: number;
  tax: number;
  /** Per-day Total sales — sums to the Sales Breakdown's Total sales row. */
  total: number;
  /** Order count for the day (excluding voided/cancelled/test). */
  orders: number;
}

export interface RevenueBreakdownComparisonApi {
  current: { from: string; to: string; points: RevenueBreakdownPointApi[] };
  previous: { from: string; to: string; points: RevenueBreakdownPointApi[] };
}

export interface PaymentMethodSplitApi {
  cod: { count: number; amount: number };
  prepaid: { count: number; amount: number };
  breakdown_by_gateway: { gateway: string; count: number; amount: number }[];
}

export interface SalesByChannelEntryApi {
  name: string;
  amount: number;
}

export interface SalesByChannelApi {
  current: { from: string; to: string; total: number; channels: SalesByChannelEntryApi[] };
  previous: { from: string; to: string; total: number; channels: SalesByChannelEntryApi[] };
}

export interface SalesByProductEntryApi {
  product_id: string;
  title: string;
  vendor: string | null;
  product_type: string | null;
  amount: number;
  units: number;
}

export interface SalesByProductApi {
  current: { from: string; to: string; total: number; products: SalesByProductEntryApi[] };
  previous: { from: string; to: string; total: number; products: SalesByProductEntryApi[] };
}

export interface RefundsSummaryApi {
  refund_rate_over_time: { date: string; rate: number }[];
  top_reasons: { reason: string; count: number; amount: number }[];
  refunds_by_sku: { sku: string; count: number; amount: number }[];
}

export interface RefundRowApi {
  id: number;
  source_refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_currency: string;
  reason: string | null;
  refunded_at: string;
  restocked: boolean;
}

export interface TxRowApi {
  id: number;
  source_transaction_id: string;
  order_id: string;
  kind: string;
  status: string;
  gateway: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  processed_at: string | null;
}

export interface PaginationApi {
  page: number;
  limit: number;
  total: number;
}

export interface SalesBreakdownTotalsApi {
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

export interface SalesBreakdownDailyPointApi {
  date: string;
  gross_sales: number;
  discounts: number;
  returns: number;
  net_sales: number;
  shipping_charges: number;
  return_fees: number;
  taxes: number;
  total_sales: number;
}

export interface SalesBreakdownApi {
  current: {
    from: string;
    to: string;
    totals: SalesBreakdownTotalsApi;
    daily: SalesBreakdownDailyPointApi[];
  };
  previous: {
    from: string;
    to: string;
    totals: SalesBreakdownTotalsApi;
  };
}
