export interface FinanceKpisApi {
  gross_revenue: number;
  total_discounts: number;
  total_tax: number;
  total_shipping: number;
  total_refunds: number;
  net_revenue: number;
  payouts_received: number;
  shopify_fees: number;
  fees_pct: number;
  refund_rate: number;
  refund_count: number;
  order_count: number;
}

export interface RevenueBreakdownPointApi {
  date: string;
  gross: number;
  discounts: number;
  refunds: number;
  tax: number;
  net: number;
}

export interface PaymentMethodSplitApi {
  cod: { count: number; amount: number };
  prepaid: { count: number; amount: number };
  breakdown_by_gateway: { gateway: string; count: number; amount: number }[];
}

export interface RefundsSummaryApi {
  refund_rate_over_time: { date: string; rate: number }[];
  top_reasons: { reason: string; count: number; amount: number }[];
  refunds_by_sku: { sku: string; count: number; amount: number }[];
}

export interface PayoutSummaryApi {
  id: number;
  source_payout_id: string;
  payout_date: string | null;
  status: string;
  amount: number;
  currency: string;
  bank_summary: Record<string, unknown> | null;
  charges_gross: number | null;
  refunds_gross: number | null;
  adjustments_gross: number | null;
  fees_total: number | null;
}

export interface BalanceTransactionApi {
  id: number;
  type: string;
  amount: number;
  fee: number | null;
  net: number | null;
  processed_at: string | null;
  transaction_id: string | null;
}

export interface PayoutDetailApi {
  payout: PayoutSummaryApi;
  balance_transactions: BalanceTransactionApi[];
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
