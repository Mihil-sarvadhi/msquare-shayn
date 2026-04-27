import { QueryTypes, type CreationAttributes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { DiscountCode, Dispute, GiftCard, PriceRule } from '@db/models';
import { SOURCE } from '@constant';
import type {
  ActiveDispute,
  DiscountCodePerformance,
  MarketingKpis,
  RiskKpis,
} from './marketing.types';

export async function upsertPriceRules(
  rows: CreationAttributes<PriceRule>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await PriceRule.bulkCreate(rows, {
    updateOnDuplicate: [
      'title',
      'value_type',
      'value',
      'target_type',
      'starts_at',
      'ends_at',
      'usage_limit',
      'customer_selection',
      'prerequisite_subtotal',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
    conflictAttributes: ['source', 'source_price_rule_id'],
  });
  return rows.length;
}

export async function upsertDiscountCodes(
  rows: CreationAttributes<DiscountCode>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await DiscountCode.bulkCreate(rows, {
    updateOnDuplicate: [
      'source_price_rule_id',
      'price_rule_id',
      'code',
      'usage_count',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
    conflictAttributes: ['source', 'source_discount_code_id'],
  });
  return rows.length;
}

export async function linkDiscountCodesToRules(): Promise<number> {
  const [, meta] = (await sequelize.query(
    `UPDATE discount_codes dc
        SET price_rule_id = pr.id, updated_at = NOW()
       FROM price_rules pr
       WHERE dc.price_rule_id IS NULL
         AND dc.source = pr.source
         AND dc.source_price_rule_id = pr.source_price_rule_id`,
  )) as [unknown, unknown];
  const rowCount =
    typeof meta === 'object' && meta !== null && 'rowCount' in meta
      ? Number((meta as { rowCount: number }).rowCount)
      : 0;
  return rowCount;
}

export async function upsertGiftCards(
  rows: CreationAttributes<GiftCard>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await GiftCard.bulkCreate(rows, {
    updateOnDuplicate: [
      'code_last4',
      'initial_value',
      'balance',
      'currency',
      'customer_id',
      'expires_on',
      'disabled_at',
      'status',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
    conflictAttributes: ['source', 'source_gift_card_id'],
  });
  return rows.length;
}

export async function upsertDisputes(rows: CreationAttributes<Dispute>[]): Promise<number> {
  if (rows.length === 0) return 0;
  await Dispute.bulkCreate(rows, {
    updateOnDuplicate: [
      'order_id',
      'amount',
      'currency',
      'reason',
      'status',
      'evidence_due_by',
      'finalized_on',
      'network_reason_code',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
    conflictAttributes: ['source', 'source_dispute_id'],
  });
  return rows.length;
}

export async function getMarketingKpis(): Promise<MarketingKpis> {
  const codeRow = await sequelize.query<{ codes: string; usage: string }>(
    `SELECT COUNT(*)::text AS codes, COALESCE(SUM(usage_count),0)::text AS usage
       FROM discount_codes
       WHERE source = :source`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  const giftRow = await sequelize.query<{ liability: string; cnt: string }>(
    `SELECT COALESCE(SUM(balance),0)::text AS liability, COUNT(*)::text AS cnt
       FROM gift_cards
       WHERE source = :source AND status = 'enabled' AND balance > 0`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  return {
    active_discount_codes: parseInt(codeRow[0]?.codes ?? '0', 10),
    total_discount_usage: parseInt(codeRow[0]?.usage ?? '0', 10),
    gift_card_liability: parseFloat(giftRow[0]?.liability ?? '0'),
    gift_cards_outstanding: parseInt(giftRow[0]?.cnt ?? '0', 10),
  };
}

export async function getRiskKpis(): Promise<RiskKpis> {
  const openRow = await sequelize.query<{ cnt: string; amount: string }>(
    `SELECT COUNT(*)::text AS cnt, COALESCE(SUM(amount),0)::text AS amount
       FROM disputes
       WHERE source = :source AND status IN ('needs_response','under_review')`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  const winRow = await sequelize.query<{ won: string; total: string }>(
    `SELECT
        COUNT(*) FILTER (WHERE status = 'won')::text AS won,
        COUNT(*)::text AS total
      FROM disputes
      WHERE source = :source
        AND finalized_on >= NOW() - INTERVAL '90 days'
        AND status IN ('won','lost')`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  const totalRow = await sequelize.query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM disputes WHERE source = :source`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  const won = parseInt(winRow[0]?.won ?? '0', 10);
  const total = parseInt(winRow[0]?.total ?? '0', 10);
  return {
    open_disputes: parseInt(openRow[0]?.cnt ?? '0', 10),
    amount_at_risk: parseFloat(openRow[0]?.amount ?? '0'),
    win_rate_90d: total > 0 ? (won / total) * 100 : null,
    total_disputes: parseInt(totalRow[0]?.cnt ?? '0', 10),
  };
}

export async function listDiscountCodes(params: { page: number; limit: number }) {
  const offset = (params.page - 1) * params.limit;
  const rows = await sequelize.query(
    `SELECT dc.id, dc.code, dc.usage_count, dc.source_price_rule_id,
            pr.title AS rule_title, pr.value_type, pr.value
       FROM discount_codes dc
       LEFT JOIN price_rules pr ON pr.id = dc.price_rule_id
       WHERE dc.source = :source
       ORDER BY dc.usage_count DESC
       LIMIT :limit OFFSET :offset`,
    {
      type: QueryTypes.SELECT,
      replacements: { source: SOURCE.SHOPIFY, limit: params.limit, offset },
    },
  );
  const total = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM discount_codes WHERE source = :source`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  return { rows, total: parseInt(total[0]?.count ?? '0', 10) };
}

export async function listPriceRules(params: { page: number; limit: number }) {
  const offset = (params.page - 1) * params.limit;
  const rows = await sequelize.query(
    `SELECT id, source_price_rule_id, title, value_type, value, target_type,
            starts_at, ends_at, usage_limit, customer_selection, prerequisite_subtotal
       FROM price_rules
       WHERE source = :source
       ORDER BY starts_at DESC NULLS LAST
       LIMIT :limit OFFSET :offset`,
    {
      type: QueryTypes.SELECT,
      replacements: { source: SOURCE.SHOPIFY, limit: params.limit, offset },
    },
  );
  const total = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM price_rules WHERE source = :source`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  return { rows, total: parseInt(total[0]?.count ?? '0', 10) };
}

export async function getCodePerformance(code: string): Promise<DiscountCodePerformance | null> {
  // Cross-reference with shopify_orders.discount_codes (text array or JSON).
  // Existing schema check: shopify_orders has a discount_codes column; we filter by ANY membership.
  const row = await sequelize.query<{
    code: string;
    rule_title: string | null;
    usage_count: string;
    attributed_revenue: string;
    attributed_orders: string;
  }>(
    `SELECT dc.code,
            pr.title AS rule_title,
            dc.usage_count::text AS usage_count,
            COALESCE(SUM(o.revenue), 0)::text AS attributed_revenue,
            COUNT(o.order_id)::text AS attributed_orders
       FROM discount_codes dc
       LEFT JOIN price_rules pr ON pr.id = dc.price_rule_id
       LEFT JOIN shopify_orders o ON :code = ANY(o.discount_codes)
       WHERE dc.source = :source AND dc.code = :code
       GROUP BY dc.code, pr.title, dc.usage_count
       LIMIT 1`,
    {
      type: QueryTypes.SELECT,
      replacements: { source: SOURCE.SHOPIFY, code },
    },
  );
  if (row.length === 0) return null;
  const r = row[0];
  return {
    code: r.code,
    rule_title: r.rule_title,
    usage_count: parseInt(r.usage_count, 10),
    attributed_revenue: parseFloat(r.attributed_revenue),
    attributed_orders: parseInt(r.attributed_orders, 10),
  };
}

export async function listGiftCards(params: { page: number; limit: number }) {
  const offset = (params.page - 1) * params.limit;
  const rows = await sequelize.query(
    `SELECT id, code_last4, initial_value, balance, currency, customer_id,
            expires_on::text AS expires_on, status
       FROM gift_cards
       WHERE source = :source
       ORDER BY balance DESC
       LIMIT :limit OFFSET :offset`,
    {
      type: QueryTypes.SELECT,
      replacements: { source: SOURCE.SHOPIFY, limit: params.limit, offset },
    },
  );
  const total = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM gift_cards WHERE source = :source`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
  return { rows, total: parseInt(total[0]?.count ?? '0', 10) };
}

export async function listActiveDisputes(): Promise<ActiveDispute[]> {
  return sequelize.query<ActiveDispute>(
    `SELECT id, source_dispute_id, order_id, amount, currency, reason, status,
            evidence_due_by::text AS evidence_due_by, network_reason_code
       FROM disputes
       WHERE source = :source AND status IN ('needs_response','under_review')
       ORDER BY evidence_due_by ASC NULLS LAST`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY } },
  );
}

export async function listAllDisputes(params: { page: number; limit: number; status?: string }) {
  const offset = (params.page - 1) * params.limit;
  const where: string[] = ['source = :source'];
  const replacements: Record<string, unknown> = {
    source: SOURCE.SHOPIFY,
    limit: params.limit,
    offset,
  };
  if (params.status) {
    where.push('status = :status');
    replacements.status = params.status;
  }
  const whereClause = where.join(' AND ');
  const rows = await sequelize.query(
    `SELECT id, source_dispute_id, order_id, amount, currency, reason, status,
            evidence_due_by::text AS evidence_due_by, finalized_on::text AS finalized_on,
            network_reason_code
       FROM disputes WHERE ${whereClause}
       ORDER BY evidence_due_by DESC NULLS LAST
       LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements },
  );
  const total = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM disputes WHERE ${whereClause}`,
    { type: QueryTypes.SELECT, replacements },
  );
  return { rows, total: parseInt(total[0]?.count ?? '0', 10) };
}
