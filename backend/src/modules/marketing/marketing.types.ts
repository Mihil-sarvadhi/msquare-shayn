export interface MarketingKpis {
  active_discount_codes: number;
  total_discount_usage: number;
  gift_card_liability: number;
  gift_cards_outstanding: number;
}

export interface RiskKpis {
  open_disputes: number;
  amount_at_risk: number;
  win_rate_90d: number | null;
  total_disputes: number;
}

export interface DiscountCodePerformance {
  code: string;
  rule_title: string | null;
  usage_count: number;
  attributed_revenue: number;
  attributed_orders: number;
}

export interface ActiveDispute {
  id: number;
  source_dispute_id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  reason: string | null;
  status: string;
  evidence_due_by: string | null;
  network_reason_code: string | null;
}
