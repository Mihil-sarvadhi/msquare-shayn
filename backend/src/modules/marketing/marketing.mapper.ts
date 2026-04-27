import { SOURCE } from '@constant';
import type {
  ShopifyDiscountNode,
  ShopifyDispute,
  ShopifyGiftCard,
} from '@modules/shopify/shopify.connector';
import type { DisputeStatus, GiftCardStatus } from '@db/models';

const DISPUTE_STATUS_MAP: Record<string, DisputeStatus> = {
  NEEDS_RESPONSE: 'needs_response',
  UNDER_REVIEW: 'under_review',
  CHARGE_REFUNDED: 'charge_refunded',
  ACCEPTED: 'accepted',
  WON: 'won',
  LOST: 'lost',
};

function gid(id: string): string {
  return id;
}

function num(s: string | null | undefined): number {
  if (s === null || s === undefined || s === '') return 0;
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

export interface MappedPriceRule {
  source: typeof SOURCE.SHOPIFY;
  source_price_rule_id: string;
  title: string | null;
  value_type: string | null;
  value: number | null;
  target_type: string | null;
  starts_at: Date | null;
  ends_at: Date | null;
  usage_limit: number | null;
  customer_selection: string | null;
  prerequisite_subtotal: number | null;
  source_metadata: null;
  synced_at: Date;
  updated_at: Date;
}

export interface MappedDiscountCode {
  source: typeof SOURCE.SHOPIFY;
  source_discount_code_id: string;
  source_price_rule_id: string;
  price_rule_id: null;
  code: string;
  usage_count: number;
  source_metadata: null;
  synced_at: Date;
  updated_at: Date;
}

/**
 * A Shopify "discount node" can wrap either a code-based discount or an automatic one.
 * For our DB, each discount node becomes ONE price_rule row, and any contained codes
 * become discount_code rows pointing to it.
 */
export function mapDiscountNode(d: ShopifyDiscountNode): {
  rule: MappedPriceRule;
  codes: MappedDiscountCode[];
} {
  const inner = d.discount ?? {};
  const valueType =
    inner.customerGets?.value?.__typename === 'DiscountPercentage'
      ? 'percentage'
      : inner.customerGets?.value?.__typename === 'DiscountAmount'
        ? 'fixed_amount'
        : null;
  const value =
    inner.customerGets?.value?.__typename === 'DiscountPercentage'
      ? (inner.customerGets.value.percentage ?? 0) * 100
      : inner.customerGets?.value?.__typename === 'DiscountAmount'
        ? num(inner.customerGets.value.amount?.amount)
        : null;

  const rule: MappedPriceRule = {
    source: SOURCE.SHOPIFY,
    source_price_rule_id: gid(d.id),
    title: inner.title ?? null,
    value_type: valueType,
    value,
    target_type: 'line_item',
    starts_at: inner.startsAt ? new Date(inner.startsAt) : null,
    ends_at: inner.endsAt ? new Date(inner.endsAt) : null,
    usage_limit: inner.usageLimit ?? null,
    customer_selection: inner.customerSelection?.__typename ?? null,
    prerequisite_subtotal:
      inner.minimumRequirement?.__typename === 'DiscountMinimumSubtotal'
        ? num(inner.minimumRequirement.greaterThanOrEqualToSubtotal?.amount)
        : null,
    source_metadata: null,
    synced_at: new Date(),
    updated_at: new Date(),
  };

  const codes: MappedDiscountCode[] = (inner.codes?.edges ?? []).map((e) => ({
    source: SOURCE.SHOPIFY,
    source_discount_code_id: gid(e.node.id),
    source_price_rule_id: gid(d.id),
    price_rule_id: null,
    code: e.node.code,
    usage_count: e.node.asyncUsageCount,
    source_metadata: null,
    synced_at: new Date(),
    updated_at: new Date(),
  }));

  return { rule, codes };
}

export function mapGiftCard(g: ShopifyGiftCard) {
  let status: GiftCardStatus = 'enabled';
  if (!g.enabled) status = 'disabled';
  else if (g.expiresOn && new Date(g.expiresOn) < new Date()) status = 'expired';

  // Shopify maskedCode looks like "•••• ABCD" — extract last 4 alphanumeric chars.
  const last4Match = g.maskedCode.match(/[A-Za-z0-9]{4}$/);
  const code_last4 = last4Match ? last4Match[0] : null;

  return {
    source: SOURCE.SHOPIFY,
    source_gift_card_id: gid(g.id),
    code_last4,
    initial_value: num(g.initialValue.amount),
    balance: num(g.balance.amount),
    currency: g.initialValue.currencyCode,
    customer_id: g.customer ? gid(g.customer.id) : null,
    expires_on: g.expiresOn ? new Date(g.expiresOn) : null,
    disabled_at: null,
    status,
    source_metadata: null,
    synced_at: new Date(),
    updated_at: new Date(),
  };
}

export function mapDispute(d: ShopifyDispute) {
  return {
    source: SOURCE.SHOPIFY,
    source_dispute_id: gid(d.id),
    order_id: d.order ? gid(d.order.id) : null,
    amount: num(d.amount.amount),
    currency: d.amount.currencyCode,
    reason: d.reasonDetails?.reason ?? null,
    status: DISPUTE_STATUS_MAP[d.status.toUpperCase()] ?? 'under_review',
    evidence_due_by: d.evidenceDueBy ? new Date(d.evidenceDueBy) : null,
    finalized_on: d.finalizedOn ? new Date(d.finalizedOn) : null,
    network_reason_code: d.reasonDetails?.networkReasonCode ?? null,
    source_metadata: null,
    synced_at: new Date(),
    updated_at: new Date(),
  };
}
