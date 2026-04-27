export interface MarketingKpisApi {
  active_discount_codes: number;
  total_discount_usage: number;
  gift_card_liability: number;
  gift_cards_outstanding: number;
}

export interface RiskKpisApi {
  open_disputes: number;
  amount_at_risk: number;
  win_rate_90d: number | null;
  total_disputes: number;
}

export interface DiscountCodeRowApi {
  id: number;
  code: string;
  usage_count: number;
  source_price_rule_id: string | null;
  rule_title: string | null;
  value_type: string | null;
  value: number | null;
}

export interface PriceRuleRowApi {
  id: number;
  source_price_rule_id: string;
  title: string | null;
  value_type: string | null;
  value: number | null;
  target_type: string | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  customer_selection: string | null;
  prerequisite_subtotal: number | null;
}

export interface GiftCardRowApi {
  id: number;
  code_last4: string | null;
  initial_value: number;
  balance: number;
  currency: string;
  customer_id: string | null;
  expires_on: string | null;
  status: string;
}

export interface DisputeRowApi {
  id: number;
  source_dispute_id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  reason: string | null;
  status: string;
  evidence_due_by: string | null;
  finalized_on?: string | null;
  network_reason_code: string | null;
}

export interface CodePerformanceApi {
  code: string;
  rule_title: string | null;
  usage_count: number;
  attributed_revenue: number;
  attributed_orders: number;
}
