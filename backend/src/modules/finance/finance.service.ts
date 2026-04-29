import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { SOURCE } from '@constant';
import {
  refundSummaryAggregates,
  listRefunds as listRefundsRepo,
  type RefundsListParams,
} from './refunds.repository';
import {
  paymentMethodSplit as paymentMethodSplitRepo,
  listTransactions as listTransactionsRepo,
  type TxListParams,
} from './transactions.repository';
import { listLocations } from './locations.repository';
import type {
  FinanceKpis,
  GroupBy,
  PaymentMethodSplit,
  RefundsSummary,
  RevenueBreakdownComparison,
  RevenueBreakdownPoint,
  SalesBreakdown,
  SalesBreakdownDailyPoint,
  SalesBreakdownTotals,
  SalesByChannel,
  SalesByChannelEntry,
  SalesByProduct,
  SalesByProductEntry,
} from './finance.types';

interface OrderTotals {
  gross_revenue: number;
  total_discounts: number;
  total_tax: number;
  total_shipping: number;
  order_count: number;
}

/**
 * Top-line totals matching Shopify Analytics' Sales Breakdown semantics:
 * - Window orders by Shopify-IST `created_at`.
 * - Gross sales = (subtotal + total_discounts) × tax_factor (tax-exclusive,
 *   matches Shopify "Gross sales").
 * - Discounts = total_discounts × tax_factor (tax-exclusive).
 * - Tax & shipping captured only on PAID, non-cancelled orders.
 * - All test orders excluded; cancelled/voided orders count toward gross
 *   (Shopify includes them and offsets via Returns).
 */
async function orderTotals(from: Date, to: Date): Promise<OrderTotals> {
  const result = await sequelize.query<{
    gross_revenue: string;
    total_discounts: string;
    total_tax: string;
    total_shipping: string;
    order_count: string;
  }>(
    `SELECT COALESCE(SUM(
              (subtotal + COALESCE(total_discounts, 0))
              * CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                     THEN (subtotal - total_tax) / subtotal
                     ELSE 1.0 END
            ), 0)::text AS gross_revenue,
            COALESCE(SUM(
              COALESCE(total_discounts, 0)
              * CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                     THEN (subtotal - total_tax) / subtotal
                     ELSE 1.0 END
            ), 0)::text AS total_discounts,
            COALESCE(SUM(
              CASE WHEN financial_status = 'PAID' AND cancelled_at IS NULL
                   THEN COALESCE(total_tax, 0) ELSE 0 END
            ), 0)::text AS total_tax,
            COALESCE(SUM(
              CASE WHEN financial_status = 'PAID' AND cancelled_at IS NULL
                   THEN COALESCE(total_shipping, 0) ELSE 0 END
            ), 0)::text AS total_shipping,
            COUNT(*)::text AS order_count
       FROM shopify_orders
       WHERE created_at BETWEEN :from AND :to
         AND COALESCE(test, FALSE) = FALSE`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );
  const row = result[0];
  return {
    gross_revenue: parseFloat(row?.gross_revenue ?? '0'),
    total_discounts: parseFloat(row?.total_discounts ?? '0'),
    total_tax: parseFloat(row?.total_tax ?? '0'),
    total_shipping: parseFloat(row?.total_shipping ?? '0'),
    order_count: parseInt(row?.order_count ?? '0', 10),
  };
}

/**
 * Returns total for the window using the same EVENT-DATE attribution Shopify
 * uses (refund/void date, not order created_at). See `returnsDaily` for the
 * complete formula explanation. Tax-excl, matches Shopify "Returns" exactly.
 */
async function returnsTotalExclTax(from: Date, to: Date): Promise<number> {
  const result = await sequelize.query<{ amount: string }>(
    // Shopify-Analytics-exact "Returns" formula — verified against live DB.
    //
    // FIVE event-date-bucketed cases, dedup-disjoint (each order contributes
    // exactly once across cases):
    //
    //   case1 — refunds with non-empty refund_line_items:
    //           Σ(li_subtotal) × tax_factor MINUS withheld_fee
    //           (withheld_fee = max(0, li_subtotal − refund_amount), e.g.
    //           a restocking/handling fee held from the customer's refund).
    //   case2 — closed return for an order whose refund(s) in window have
    //           empty refund_line_items: total_value × tax_factor (use
    //           Return record's items value since the refund record gives
    //           no item detail).
    //   case3 — refund with empty refund_line_items where the order has
    //           NO sibling LI refund AND NO closed return: fall back to
    //           refund_amount × tax_factor. Catches legacy refunds where
    //           Shopify's GraphQL didn't return per-line detail.
    //   case4 — closed return for orders WITHOUT any refund in window:
    //           total_value × tax_factor. Catches RTO COD (items came
    //           back, no money flowed).
    //   case5 — voided orders without any return or refund in window:
    //           subtotal × tax_factor. Catches edge-case immediate voids.
    //
    // OPEN/REQUESTED returns are excluded — Shopify's "Returns" only counts
    // CLOSED. Refund_amount (totalRefundedSet) excludes shipping/tip via
    // the line-items-only sum; only legacy/empty-LI refunds use refund_amount
    // directly via case3.
    `WITH refund_orders_any AS (
       SELECT DISTINCT order_id FROM orders_refunds
        WHERE source = :source
          AND refunded_at BETWEEN :from AND :to
     ),
     refund_orders_with_li AS (
       SELECT DISTINCT r.order_id FROM orders_refunds r
       CROSS JOIN LATERAL (
         SELECT COALESCE(SUM((rli->>'amount')::numeric), 0) AS s
           FROM jsonb_array_elements(COALESCE(r.refund_line_items, '[]'::jsonb)) AS rli
       ) li
       WHERE r.source = :source
         AND r.refunded_at BETWEEN :from AND :to
         AND li.s > 0
     ),
     return_orders_closed AS (
       SELECT DISTINCT order_id FROM orders_returns
        WHERE source = :source
          AND return_created_at BETWEEN :from AND :to
          AND status = 'CLOSED'
     ),
     case1 AS (
       SELECT SUM(
                li.li_subtotal
                * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                       THEN (o.subtotal - o.total_tax) / o.subtotal
                       ELSE 1.0 END
                - CASE WHEN r.refund_amount > 0
                       THEN GREATEST(0, li.li_subtotal - r.refund_amount)
                       ELSE 0 END
              ) AS amount
         FROM orders_refunds r
         JOIN shopify_orders o ON o.order_id = r.order_id
         CROSS JOIN LATERAL (
           SELECT COALESCE(SUM((rli->>'amount')::numeric), 0) AS li_subtotal
             FROM jsonb_array_elements(COALESCE(r.refund_line_items, '[]'::jsonb)) AS rli
         ) li
        WHERE r.source = :source
          AND r.refunded_at BETWEEN :from AND :to
          AND COALESCE(o.test, FALSE) = FALSE
          AND li.li_subtotal > 0
     ),
     case2 AS (
       SELECT SUM(
                COALESCE(r.total_value, 0)
                * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                       THEN (o.subtotal - o.total_tax) / o.subtotal
                       ELSE 1.0 END
              ) AS amount
         FROM orders_returns r
         JOIN shopify_orders o ON o.order_id = r.order_id
        WHERE r.source = :source
          AND r.return_created_at BETWEEN :from AND :to
          AND r.status = 'CLOSED'
          AND COALESCE(o.test, FALSE) = FALSE
          AND r.order_id IN (SELECT order_id FROM refund_orders_any)
          AND r.order_id NOT IN (SELECT order_id FROM refund_orders_with_li)
     ),
     case3 AS (
       SELECT SUM(
                r.refund_amount
                * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                       THEN (o.subtotal - o.total_tax) / o.subtotal
                       ELSE 1.0 END
              ) AS amount
         FROM orders_refunds r
         JOIN shopify_orders o ON o.order_id = r.order_id
         CROSS JOIN LATERAL (
           SELECT COALESCE(SUM((rli->>'amount')::numeric), 0) AS li_subtotal
             FROM jsonb_array_elements(COALESCE(r.refund_line_items, '[]'::jsonb)) AS rli
         ) li
        WHERE r.source = :source
          AND r.refunded_at BETWEEN :from AND :to
          AND COALESCE(o.test, FALSE) = FALSE
          AND li.li_subtotal = 0
          AND r.refund_amount > 0
          AND r.order_id NOT IN (SELECT order_id FROM refund_orders_with_li)
          AND r.order_id NOT IN (SELECT order_id FROM return_orders_closed)
     ),
     case4 AS (
       SELECT SUM(
                COALESCE(r.total_value, 0)
                * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                       THEN (o.subtotal - o.total_tax) / o.subtotal
                       ELSE 1.0 END
              ) AS amount
         FROM orders_returns r
         JOIN shopify_orders o ON o.order_id = r.order_id
        WHERE r.source = :source
          AND r.return_created_at BETWEEN :from AND :to
          AND r.status = 'CLOSED'
          AND COALESCE(o.test, FALSE) = FALSE
          AND r.order_id NOT IN (SELECT order_id FROM refund_orders_any)
     ),
     case5 AS (
       SELECT SUM(
                COALESCE(subtotal, 0)
                * CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                       THEN (subtotal - total_tax) / subtotal
                       ELSE 1.0 END
              ) AS amount
         FROM shopify_orders
        WHERE cancelled_at BETWEEN :from AND :to
          AND COALESCE(test, FALSE) = FALSE
          AND COALESCE(financial_status, '') = 'VOIDED'
          AND order_id NOT IN (SELECT order_id FROM refund_orders_any)
          AND order_id NOT IN (SELECT order_id FROM return_orders_closed)
     )
     SELECT (COALESCE((SELECT amount FROM case1), 0)
           + COALESCE((SELECT amount FROM case2), 0)
           + COALESCE((SELECT amount FROM case3), 0)
           + COALESCE((SELECT amount FROM case4), 0)
           + COALESCE((SELECT amount FROM case5), 0))::text AS amount`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  return parseFloat(result[0]?.amount ?? '0');
}

/**
 * Storefront KPIs for the Finance tile strip:
 *  - sessions                 = SUM(shopify_analytics_daily.sessions)
 *  - orders                   = COUNT(shopify_orders) in window (test=false)
 *  - returning_customer_rate  = distinct returning customers / distinct customers × 100
 *
 * Returning-rate matches Shopify Admin's tooltip exactly:
 * "Returning customer rate = returning customers / customers" — distinct customers,
 * NOT orders. A customer placing two orders in the window counts once on each side.
 *
 * `gross_sales` for the tile reuses `buildBreakdown` — see project memory:
 * any Shopify-derived sales number must factor through buildBreakdown/computeTotals.
 */
interface StorefrontMetrics {
  sessions: number;
  returning_customer_rate: number; // 0-100
  orders: number;
}

async function storefrontMetrics(from: Date, to: Date): Promise<StorefrontMetrics> {
  const [analyticsRows, orderRows] = await Promise.all([
    sequelize.query<{ sessions: string }>(
      `SELECT COALESCE(SUM(sessions), 0)::text AS sessions
         FROM shopify_analytics_daily
         WHERE source = :source
           AND date BETWEEN (:from)::date AND (:to)::date`,
      {
        type: QueryTypes.SELECT,
        replacements: { source: SOURCE.SHOPIFY, from, to },
      },
    ),
    sequelize.query<{
      orders: string;
      distinct_customers: string;
      returning_customers: string;
    }>(
      `WITH base AS (
         SELECT order_id, customer_id, created_at
           FROM shopify_orders
           WHERE created_at BETWEEN :from AND :to
             AND COALESCE(test, FALSE) = FALSE
       )
       SELECT COUNT(*)::text AS orders,
              COUNT(DISTINCT customer_id)::text AS distinct_customers,
              COUNT(DISTINCT CASE WHEN customer_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM shopify_orders prior
                             WHERE prior.customer_id = base.customer_id
                               AND prior.created_at < base.created_at
                               AND COALESCE(prior.test, FALSE) = FALSE
                          ) THEN customer_id END)::text AS returning_customers
         FROM base`,
      { type: QueryTypes.SELECT, replacements: { from, to } },
    ),
  ]);

  const o = orderRows[0] ?? {
    orders: '0',
    distinct_customers: '0',
    returning_customers: '0',
  };
  const distinctCustomers = parseInt(o.distinct_customers, 10);
  const returningCustomers = parseInt(o.returning_customers, 10);
  return {
    sessions: parseInt(analyticsRows[0]?.sessions ?? '0', 10),
    orders: parseInt(o.orders, 10),
    returning_customer_rate:
      distinctCustomers > 0 ? (returningCustomers / distinctCustomers) * 100 : 0,
  };
}

export async function getKpis(from: Date, to: Date): Promise<FinanceKpis> {
  const ms = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - ms);

  const [orders, refundsSummary, returnsExcl, sf, sfPrev] = await Promise.all([
    orderTotals(from, to),
    refundSummaryAggregates(from, to),
    returnsTotalExclTax(from, to),
    storefrontMetrics(from, to),
    storefrontMetrics(prevFrom, prevTo),
  ]);

  // Mirror Shopify Sales Breakdown exactly:
  //   net_sales       = gross_sales - discounts - returns
  //   taxes (display) = effective_rate × net_sales (Shopify reports tax on net,
  //                     not tax on gross)
  //   total_sales     = net_sales + shipping + taxes - return_fees
  // We expose `net_revenue` here as Shopify's `total_sales` so the founder-
  // facing "True Net Revenue" tile matches the breakdown's Total sales line.
  const subtotalExcl = orders.gross_revenue - orders.total_discounts;
  const net_sales = subtotalExcl - returnsExcl;
  const tax_rate =
    subtotalExcl > 0 && orders.total_tax > 0
      ? orders.total_tax / (subtotalExcl - orders.total_tax + orders.total_tax) // = total_tax / subtotalExcl
      : 0;
  const taxes_on_net = Math.round(tax_rate * net_sales * 100) / 100;
  const net_revenue = net_sales + orders.total_shipping + taxes_on_net;

  return {
    gross_revenue: orders.gross_revenue,
    total_discounts: orders.total_discounts,
    total_tax: taxes_on_net,
    total_shipping: orders.total_shipping,
    total_refunds: returnsExcl,
    net_revenue,
    refund_count: refundsSummary.refund_count,
    order_count: orders.order_count,
    sessions: { value: sf.sessions, previous: sfPrev.sessions },
    returning_customer_rate: {
      value: sf.returning_customer_rate,
      previous: sfPrev.returning_customer_rate,
    },
    orders: { value: sf.orders, previous: sfPrev.orders },
  };
}

export async function getRevenueBreakdown(
  from: Date,
  to: Date,
  groupBy: GroupBy,
): Promise<RevenueBreakdownPoint[]> {
  // Reuse buildBreakdown so totals match the Sales Breakdown panel exactly.
  // Critical: buildBreakdown surfaces "return-only days" (refund/void events
  // on dates with no orders in the window) — the prior bespoke SQL here
  // dropped those by iterating only over orderRows.
  // Per project memory, any Shopify-derived sales metric must factor through
  // this chain rather than rolling fresh formulas.
  const { daily, totals } = await buildBreakdown(from, to);

  // Per-day Total sales uses the period's effective tax rate so the series
  // sums to totals.total_sales exactly. The raw `daily[i].taxes` field uses
  // collected tax (which over-counts on refunded items); for the period total
  // computeTotals re-derives Tax as effectiveRate × net_sales. Apply the same
  // ratio here so per-day totals sum to the displayed period Total sales.
  const effectiveRate = totals.net_sales !== 0 ? totals.taxes / totals.net_sales : 0;

  const dayPoints: RevenueBreakdownPoint[] = daily.map((d) => {
    const dayTax = d.net_sales * effectiveRate;
    return {
      date: d.date,
      gross: d.gross_sales,
      discounts: d.discounts,
      refunds: d.returns,
      tax: dayTax,
      total: d.net_sales + d.shipping_charges + dayTax - d.return_fees,
      orders: d.order_count,
    };
  });
  if (groupBy === 'day') {
    return dayPoints.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Re-aggregate to week/month buckets in JS to keep a single source of truth.
  const bucketKey = (date: string): string => {
    const d = new Date(`${date}T00:00:00.000Z`);
    if (groupBy === 'month') {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
    }
    // week → Monday-anchored ISO date
    const day = d.getUTCDay();
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    return monday.toISOString().slice(0, 10);
  };
  const buckets = new Map<string, RevenueBreakdownPoint>();
  for (const p of dayPoints) {
    const key = bucketKey(p.date);
    const cur = buckets.get(key) ?? {
      date: key,
      gross: 0,
      discounts: 0,
      refunds: 0,
      tax: 0,
      total: 0,
      orders: 0,
    };
    cur.gross += p.gross;
    cur.discounts += p.discounts;
    cur.refunds += p.refunds;
    cur.tax += p.tax;
    cur.total += p.total;
    cur.orders += p.orders;
    buckets.set(key, cur);
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Same as getRevenueBreakdown but also returns the previous equivalent period
 * so the chart can overlay a comparison line — mirrors Shopify Analytics'
 * "Total sales over time" current-vs-comparison view.
 */
export async function getRevenueBreakdownWithComparison(
  from: Date,
  to: Date,
  groupBy: GroupBy,
): Promise<RevenueBreakdownComparison> {
  const ms = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - ms);
  const [current, previous] = await Promise.all([
    getRevenueBreakdown(from, to, groupBy),
    getRevenueBreakdown(prevFrom, prevTo, groupBy),
  ]);
  return {
    current: { from: fmtDate(from), to: fmtDate(to), points: current },
    previous: { from: fmtDate(prevFrom), to: fmtDate(prevTo), points: previous },
  };
}

/* ─────────────────── Total Sales by Channel ───────────────────
 * Mirrors Shopify Analytics' "Total sales by sales channel" donut.
 * For each channel:
 *   total = SUM(subtotal × tax_factor)              -- net sales (orders in window)
 *         + SUM(shipping + tax for PAID, !cancelled) -- shipping & taxes
 *         − SUM(void amount, refund amount)          -- returns attributed to original channel
 * Returns are bucketed by event date (cancelled_at / refunded_at) and joined
 * back to the original order so they reduce the correct channel's total.
 */
const CHANNEL_LABELS: Record<string, string> = {
  pos: 'Point of Sale',
  web: 'Online Store',
  shopify_draft_order: 'Draft Order',
  android: 'Mobile (Android)',
  iphone: 'Mobile (iOS)',
  // Apps that put their API client ID in Shopify's `sourceName` field instead
  // of a friendly name. New orders sync with `app.name` (see resolveChannel
  // in shopify.mapper.ts), but already-synced rows still hold the numeric ID —
  // map them here so the dashboard matches Shopify Analytics today.
  '277977923585': 'Gokwik_Shayn',
  '4388981': 'Return Prime',
};

function normalizeChannelName(raw: string): string {
  const lower = raw.toLowerCase();
  return CHANNEL_LABELS[lower] ?? raw;
}

async function salesByChannelForRange(
  from: Date,
  to: Date,
): Promise<{
  total: number;
  channels: SalesByChannelEntry[];
}> {
  const rows = await sequelize.query<{ channel_name: string; total: string }>(
    `WITH base AS (
       SELECT
         COALESCE(NULLIF(TRIM(channel), ''), 'Direct') AS channel_name,
         COALESCE(SUM(
           COALESCE(subtotal, 0) *
           CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                THEN (subtotal - total_tax) / subtotal
                ELSE 1.0 END
         ), 0)
         + COALESCE(SUM(
             CASE WHEN financial_status = 'PAID' AND cancelled_at IS NULL
                  THEN COALESCE(total_shipping, 0) + COALESCE(total_tax, 0)
                  ELSE 0 END
           ), 0) AS amount
       FROM shopify_orders
       WHERE created_at BETWEEN :from AND :to
         AND COALESCE(test, FALSE) = FALSE
       GROUP BY channel_name
     ),
     voids AS (
       SELECT
         COALESCE(NULLIF(TRIM(channel), ''), 'Direct') AS channel_name,
         COALESCE(SUM(
           COALESCE(subtotal, 0) *
           CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                THEN (subtotal - total_tax) / subtotal
                ELSE 1.0 END
         ), 0) AS amount
       FROM shopify_orders
       WHERE cancelled_at BETWEEN :from AND :to
         AND COALESCE(test, FALSE) = FALSE
         AND COALESCE(financial_status, '') = 'VOIDED'
       GROUP BY channel_name
     ),
     refunds AS (
       SELECT
         COALESCE(NULLIF(TRIM(o.channel), ''), 'Direct') AS channel_name,
         COALESCE(SUM(
           r.refund_amount *
           CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                THEN (o.subtotal - o.total_tax) / o.subtotal
                ELSE 1.0 END
         ), 0) AS amount
       FROM orders_refunds r
       JOIN shopify_orders o ON o.order_id = r.order_id
       WHERE r.source = :source
         AND r.refunded_at BETWEEN :from AND :to
         AND COALESCE(o.test, FALSE) = FALSE
       GROUP BY channel_name
     ),
     all_channels AS (
       SELECT channel_name FROM base
       UNION SELECT channel_name FROM voids
       UNION SELECT channel_name FROM refunds
     )
     SELECT
       a.channel_name,
       (COALESCE(b.amount, 0) - COALESCE(v.amount, 0) - COALESCE(r.amount, 0)) AS total
     FROM all_channels a
     LEFT JOIN base   b USING (channel_name)
     LEFT JOIN voids  v USING (channel_name)
     LEFT JOIN refunds r USING (channel_name)
     ORDER BY total DESC NULLS LAST`,
    {
      type: QueryTypes.SELECT,
      replacements: { from, to, source: SOURCE.SHOPIFY },
    },
  );

  const channels: SalesByChannelEntry[] = rows.map((row) => ({
    name: normalizeChannelName(row.channel_name),
    amount: parseFloat(row.total),
  }));
  const total = channels.reduce((s, c) => s + c.amount, 0);
  return { total, channels };
}

export async function getSalesByChannel(from: Date, to: Date): Promise<SalesByChannel> {
  const ms = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - ms);
  const [current, previous] = await Promise.all([
    salesByChannelForRange(from, to),
    salesByChannelForRange(prevFrom, prevTo),
  ]);
  return {
    current: { from: fmtDate(from), to: fmtDate(to), ...current },
    previous: { from: fmtDate(prevFrom), to: fmtDate(prevTo), ...previous },
  };
}

/* ─────────────────── Total Sales by Product ───────────────────
 * Mirrors Shopify Analytics' "Total sales by product" — same 3-CTE pattern
 * as salesByChannelForRange (base − voids − refunds), grouped per product:
 *   base    = LI gross_excl − LI allocated discount + LI share of shipping/tax
 *             (orders created in window)
 *   voids   = LI gross_excl for orders cancelled in window with status VOIDED
 *             (event-date attribution, mirroring returnsDaily)
 *   refunds = refund_line_items.amount × parent order's tax_factor for refunds
 *             with refunded_at in window (event-date attribution). SKUs are
 *             mapped back to product_id via a representative shopify_order_lineitems
 *             row so the refund offsets the right product group.
 * Tax_factor matches the rest of the Sales Breakdown chain.
 */
async function salesByProductForRange(
  from: Date,
  to: Date,
  limit: number,
): Promise<{ total: number; products: SalesByProductEntry[] }> {
  // NOTE on ORDER BY: amount stays a numeric expression (no ::text cast) so
  // PostgreSQL sorts it numerically — ::text triggers lexical sort ('9' > '13').
  const rows = await sequelize.query<{
    group_key: string;
    product_id: string | null;
    title: string;
    vendor: string | null;
    product_type: string | null;
    amount: string;
    units: string;
  }>(
    `WITH per_order_li AS (
       SELECT order_id, SUM(quantity * unit_price) AS li_sum
       FROM shopify_order_lineitems
       WHERE quantity * unit_price > 0
       GROUP BY order_id
     ),
     sku_to_product AS (
       SELECT DISTINCT ON (sku)
              sku,
              NULLIF(product_id, '') AS product_id,
              title
         FROM shopify_order_lineitems
         WHERE COALESCE(NULLIF(TRIM(sku), ''), '') <> ''
         ORDER BY sku, id DESC
     ),
     base AS (
       SELECT
         COALESCE(NULLIF(li.product_id, ''), 'title:' || COALESCE(NULLIF(TRIM(li.title), ''), 'unknown')) AS group_key,
         MAX(NULLIF(li.product_id, ''))           AS product_id,
         COALESCE(MAX(p.title), MAX(li.title))    AS title,
         MAX(p.vendor)                            AS vendor,
         MAX(p.product_type)                      AS product_type,
         COALESCE(SUM(
           -- LI gross_excl − allocated discount (tax-excl)
           (
             (li.quantity * li.unit_price)
             - (li.quantity * li.unit_price / NULLIF(pol.li_sum, 0))
               * COALESCE(o.total_discounts, 0)
           )
           * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                  THEN (o.subtotal - o.total_tax) / o.subtotal
                  ELSE 1.0 END
           + CASE WHEN o.financial_status = 'PAID' AND o.cancelled_at IS NULL
                  THEN (li.quantity * li.unit_price / NULLIF(pol.li_sum, 0))
                       * (COALESCE(o.total_shipping, 0) + COALESCE(o.total_tax, 0))
                  ELSE 0 END
         ), 0) AS amount,
         COALESCE(SUM(li.quantity), 0) AS units
       FROM shopify_order_lineitems li
       JOIN shopify_orders o ON o.order_id = li.order_id
       JOIN per_order_li pol ON pol.order_id = li.order_id
       LEFT JOIN products p
              ON p.source = 'shopify'
             AND NULLIF(li.product_id, '') IS NOT NULL
             AND p.source_product_id = li.product_id
       WHERE o.created_at BETWEEN :from AND :to
         AND COALESCE(o.test, FALSE) = FALSE
         AND COALESCE(NULLIF(TRIM(li.title), ''), '') <> ''
       GROUP BY group_key
     ),
     voids AS (
       SELECT
         COALESCE(NULLIF(li.product_id, ''), 'title:' || COALESCE(NULLIF(TRIM(li.title), ''), 'unknown')) AS group_key,
         COALESCE(SUM(
           (li.quantity * li.unit_price)
           * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                  THEN (o.subtotal - o.total_tax) / o.subtotal
                  ELSE 1.0 END
         ), 0) AS amount
       FROM shopify_order_lineitems li
       JOIN shopify_orders o ON o.order_id = li.order_id
       WHERE o.cancelled_at BETWEEN :from AND :to
         AND COALESCE(o.test, FALSE) = FALSE
         AND COALESCE(o.financial_status, '') = 'VOIDED'
         AND COALESCE(NULLIF(TRIM(li.title), ''), '') <> ''
       GROUP BY group_key
     ),
     refunds AS (
       SELECT
         COALESCE(stp.product_id, 'title:' || COALESCE(NULLIF(TRIM(stp.title), ''), 'unknown')) AS group_key,
         COALESCE(SUM(
           rli.amount
           * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                  THEN (o.subtotal - o.total_tax) / o.subtotal
                  ELSE 1.0 END
         ), 0) AS amount
       FROM orders_refunds r
       JOIN shopify_orders o ON o.order_id = r.order_id
       CROSS JOIN LATERAL jsonb_to_recordset(COALESCE(r.refund_line_items, '[]'::jsonb))
                            AS rli(sku TEXT, quantity INTEGER, amount NUMERIC)
       LEFT JOIN sku_to_product stp ON stp.sku = rli.sku
       WHERE r.source = :source
         AND r.refunded_at BETWEEN :from AND :to
         AND COALESCE(o.test, FALSE) = FALSE
         AND COALESCE(NULLIF(TRIM(rli.sku), ''), '') <> ''
       GROUP BY group_key
     ),
     all_keys AS (
       SELECT group_key FROM base
       UNION SELECT group_key FROM voids
       UNION SELECT group_key FROM refunds
     )
     SELECT
       k.group_key                                                             AS group_key,
       b.product_id                                                            AS product_id,
       COALESCE(b.title, 'Untitled product')                                   AS title,
       b.vendor                                                                AS vendor,
       b.product_type                                                          AS product_type,
       (COALESCE(b.amount, 0) - COALESCE(v.amount, 0) - COALESCE(rf.amount, 0)) AS amount,
       COALESCE(b.units, 0)::text                                              AS units
     FROM all_keys k
     LEFT JOIN base    b  USING (group_key)
     LEFT JOIN voids   v  USING (group_key)
     LEFT JOIN refunds rf USING (group_key)
     ORDER BY amount DESC NULLS LAST
     LIMIT :limit`,
    { type: QueryTypes.SELECT, replacements: { from, to, limit, source: SOURCE.SHOPIFY } },
  );

  const products: SalesByProductEntry[] = rows.map((r) => ({
    product_id: r.product_id ?? r.group_key,
    title: r.title ?? 'Untitled product',
    vendor: r.vendor,
    product_type: r.product_type,
    amount: parseFloat(r.amount),
    units: parseInt(r.units, 10),
  }));
  const total = products.reduce((s, p) => s + p.amount, 0);
  return { total, products };
}

export async function getSalesByProduct(from: Date, to: Date, limit = 10): Promise<SalesByProduct> {
  const ms = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - ms);
  const [current, previous] = await Promise.all([
    salesByProductForRange(from, to, limit),
    salesByProductForRange(prevFrom, prevTo, limit),
  ]);
  return {
    current: { from: fmtDate(from), to: fmtDate(to), ...current },
    previous: { from: fmtDate(prevFrom), to: fmtDate(prevTo), ...previous },
  };
}

export async function getPaymentMethodSplit(from: Date, to: Date): Promise<PaymentMethodSplit> {
  const split = await paymentMethodSplitRepo(from, to);
  return {
    cod: split.cod,
    prepaid: split.prepaid,
    breakdown_by_gateway: split.by_gateway,
  };
}

export async function getRefundsSummary(from: Date, to: Date): Promise<RefundsSummary> {
  const summary = await refundSummaryAggregates(from, to);

  const orderRateRows = await sequelize.query<{ bucket: string; order_count: string }>(
    `SELECT date_trunc('day', created_at)::date::text AS bucket, COUNT(*)::text AS order_count
       FROM shopify_orders WHERE created_at BETWEEN :from AND :to GROUP BY bucket`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );
  const refundRateRows = await sequelize.query<{ bucket: string; refund_count: string }>(
    `SELECT date_trunc('day', refunded_at)::date::text AS bucket, COUNT(*)::text AS refund_count
       FROM orders_refunds WHERE source = :source AND refunded_at BETWEEN :from AND :to GROUP BY bucket`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  const orderMap = new Map(orderRateRows.map((r) => [r.bucket, parseInt(r.order_count, 10)]));
  const refundMap = new Map(refundRateRows.map((r) => [r.bucket, parseInt(r.refund_count, 10)]));
  const allBuckets = new Set([...orderMap.keys(), ...refundMap.keys()]);
  const refund_rate_over_time = Array.from(allBuckets)
    .sort()
    .map((bucket) => {
      const oc = orderMap.get(bucket) ?? 0;
      const rc = refundMap.get(bucket) ?? 0;
      return { date: bucket, rate: oc > 0 ? (rc / oc) * 100 : 0 };
    });

  const skuRows = await sequelize.query<{ sku: string; count: string; amount: string }>(
    `WITH refund_lines AS (
       SELECT (jsonb_array_elements(refund_line_items))->>'sku' AS sku,
              ((jsonb_array_elements(refund_line_items))->>'amount')::numeric AS amount
         FROM orders_refunds
         WHERE source = :source AND refunded_at BETWEEN :from AND :to
       )
       SELECT sku, COUNT(*)::text AS count, SUM(amount)::text AS amount
         FROM refund_lines
         WHERE sku IS NOT NULL AND sku <> ''
         GROUP BY sku
         ORDER BY SUM(amount) DESC
         LIMIT 20`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );

  return {
    refund_rate_over_time,
    top_reasons: summary.by_reason,
    refunds_by_sku: skuRows.map((r) => ({
      sku: r.sku,
      count: parseInt(r.count, 10),
      amount: parseFloat(r.amount),
    })),
  };
}

export async function listRefunds(params: RefundsListParams) {
  return listRefundsRepo(params);
}

export async function listTransactions(params: TxListParams) {
  return listTransactionsRepo(params);
}

export async function getLocations() {
  return listLocations();
}

/* ---------- Shopify-spec Sales Breakdown ----------
 * Mirrors Shopify Analytics → Sales report.
 *   gross_sales        = SUM(orders.gross_sales)        (subtotal + discounts, tax-inclusive for India)
 *   discounts          = SUM(orders.total_discounts)
 *   returns            = SUM(orders_returns.total_value) bucketed by return_created_at
 *                        + SUM(orders_refunds.refund_amount) for refunds without a Return record.
 *                        Shopify's "Returns" tracks the value of items going back, not just
 *                        money refunded — covers RTO/cancelled COD orders that never paid.
 *   net_sales          = gross_sales - discounts - returns
 *   shipping_charges   = SUM(orders.total_shipping)
 *   return_fees        = SUM(orders_returns.return_shipping_fee_total)
 *   taxes              = SUM(orders.total_tax) for non-VOIDED, non-cancelled orders
 *                        (Shopify nets tax on returned items; voided orders never collected tax).
 *   total_sales        = net_sales + shipping_charges + taxes - return_fees
 * Order rows bucketed by `created_at::date`, returns by `return_created_at::date`. */

interface OrderDailyRow {
  date: string;
  gross_sales: string;
  discounts: string;
  shipping_charges: string;
  taxes: string;
  // PAID-order tax-exclusive subtotal — used to compute the effective tax rate
  // (taxes / paid_subtotal_excl_tax) so the breakdown's Tax line matches Shopify.
  paid_subtotal_excl: string;
  order_count: string;
}
interface ReturnsDailyRow {
  date: string;
  returns: string;
  return_fees: string;
}

/**
 * Match Shopify Analytics' Total Sales Breakdown scope: include cancelled and
 * voided orders in gross (Shopify counts them, then nets via Returns/refunds).
 * Only test orders are excluded.
 */
const SHOPIFY_ANALYTICS_FILTER = `
  AND COALESCE(test, FALSE) = FALSE
`;

async function ordersDaily(from: Date, to: Date): Promise<OrderDailyRow[]> {
  // Shopify reports gross/discounts in tax-EXCLUSIVE form. For Indian
  // tax-inclusive stores our raw line-item values include GST, so we strip the
  // embedded tax per-order using each order's actual tax_factor:
  //
  //   tax_factor = (subtotal - total_tax) / subtotal     (0 < factor ≤ 1)
  //   gross_excl = (subtotal + total_discounts) * tax_factor
  //   disc_excl  = total_discounts * tax_factor
  //
  // VOIDED/cancelled orders also have total_tax populated by Shopify (tax that
  // *would* have been collected), so the factor is well-defined for them too.
  //
  // Tax & shipping are only counted on PAID, non-cancelled orders — Shopify
  // only includes captured tax. Returns are netted against this in computeTotals
  // (Shopify's reported Tax = effective_rate × net_sales).
  return sequelize.query<OrderDailyRow>(
    `SELECT date_trunc('day', created_at)::date::text AS date,
            COALESCE(SUM(
              (subtotal + COALESCE(total_discounts, 0)) *
              CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                   THEN (subtotal - total_tax) / subtotal
                   ELSE 1.0 END
            ), 0)::text AS gross_sales,
            COALESCE(SUM(
              COALESCE(total_discounts, 0) *
              CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                   THEN (subtotal - total_tax) / subtotal
                   ELSE 1.0 END
            ), 0)::text AS discounts,
            COALESCE(SUM(
              CASE WHEN financial_status = 'PAID' AND cancelled_at IS NULL
                   THEN COALESCE(total_shipping, 0) ELSE 0 END
            ), 0)::text AS shipping_charges,
            COALESCE(SUM(
              CASE WHEN financial_status = 'PAID' AND cancelled_at IS NULL
                   THEN COALESCE(total_tax, 0) ELSE 0 END
            ), 0)::text AS taxes,
            COALESCE(SUM(
              CASE WHEN financial_status = 'PAID' AND cancelled_at IS NULL
                   THEN COALESCE(subtotal, 0) - COALESCE(total_tax, 0) ELSE 0 END
            ), 0)::text AS paid_subtotal_excl,
            COUNT(*)::text AS order_count
       FROM shopify_orders
       WHERE created_at BETWEEN :from AND :to
       ${SHOPIFY_ANALYTICS_FILTER}
       GROUP BY date
       ORDER BY date ASC`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );
}

async function returnsDaily(from: Date, to: Date): Promise<ReturnsDailyRow[]> {
  // Shopify-Analytics-exact "Returns" formula — verified against live DB.
  // See returnsTotalExclTax for the full rationale. Five event-date-bucketed
  // cases, dedup-disjoint (each order contributes exactly once across cases):
  //   case1 = refunds with non-empty refund_line_items
  //   case2 = closed return for order whose refund(s) lack line items
  //   case3 = legacy refund_amount fallback when no LI sibling and no return
  //   case4 = orphan closed returns (no refund in window)
  //   case5 = voids without return or refund
  return sequelize.query<ReturnsDailyRow>(
    `WITH refund_orders_any AS (
       SELECT DISTINCT order_id FROM orders_refunds
        WHERE source = :source
          AND refunded_at BETWEEN :from AND :to
     ),
     refund_orders_with_li AS (
       SELECT DISTINCT r.order_id FROM orders_refunds r
       CROSS JOIN LATERAL (
         SELECT COALESCE(SUM((rli->>'amount')::numeric), 0) AS s
           FROM jsonb_array_elements(COALESCE(r.refund_line_items, '[]'::jsonb)) AS rli
       ) li
       WHERE r.source = :source
         AND r.refunded_at BETWEEN :from AND :to
         AND li.s > 0
     ),
     return_orders_closed AS (
       SELECT DISTINCT order_id FROM orders_returns
        WHERE source = :source
          AND return_created_at BETWEEN :from AND :to
          AND status = 'CLOSED'
     ),
     case1 AS (
       SELECT date_trunc('day', r.refunded_at)::date AS d,
              SUM(
                li.li_subtotal
                * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                       THEN (o.subtotal - o.total_tax) / o.subtotal
                       ELSE 1.0 END
                - CASE WHEN r.refund_amount > 0
                       THEN GREATEST(0, li.li_subtotal - r.refund_amount)
                       ELSE 0 END
              ) AS amount
         FROM orders_refunds r
         JOIN shopify_orders o ON o.order_id = r.order_id
         CROSS JOIN LATERAL (
           SELECT COALESCE(SUM((rli->>'amount')::numeric), 0) AS li_subtotal
             FROM jsonb_array_elements(COALESCE(r.refund_line_items, '[]'::jsonb)) AS rli
         ) li
        WHERE r.source = :source
          AND r.refunded_at BETWEEN :from AND :to
          AND COALESCE(o.test, FALSE) = FALSE
          AND li.li_subtotal > 0
        GROUP BY 1
     ),
     case2 AS (
       SELECT date_trunc('day', r.return_created_at)::date AS d,
              SUM(
                COALESCE(r.total_value, 0)
                * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                       THEN (o.subtotal - o.total_tax) / o.subtotal
                       ELSE 1.0 END
              ) AS amount
         FROM orders_returns r
         JOIN shopify_orders o ON o.order_id = r.order_id
        WHERE r.source = :source
          AND r.return_created_at BETWEEN :from AND :to
          AND r.status = 'CLOSED'
          AND COALESCE(o.test, FALSE) = FALSE
          AND r.order_id IN (SELECT order_id FROM refund_orders_any)
          AND r.order_id NOT IN (SELECT order_id FROM refund_orders_with_li)
        GROUP BY 1
     ),
     case3 AS (
       SELECT date_trunc('day', r.refunded_at)::date AS d,
              SUM(
                r.refund_amount
                * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                       THEN (o.subtotal - o.total_tax) / o.subtotal
                       ELSE 1.0 END
              ) AS amount
         FROM orders_refunds r
         JOIN shopify_orders o ON o.order_id = r.order_id
         CROSS JOIN LATERAL (
           SELECT COALESCE(SUM((rli->>'amount')::numeric), 0) AS li_subtotal
             FROM jsonb_array_elements(COALESCE(r.refund_line_items, '[]'::jsonb)) AS rli
         ) li
        WHERE r.source = :source
          AND r.refunded_at BETWEEN :from AND :to
          AND COALESCE(o.test, FALSE) = FALSE
          AND li.li_subtotal = 0
          AND r.refund_amount > 0
          AND r.order_id NOT IN (SELECT order_id FROM refund_orders_with_li)
          AND r.order_id NOT IN (SELECT order_id FROM return_orders_closed)
        GROUP BY 1
     ),
     case4 AS (
       SELECT date_trunc('day', r.return_created_at)::date AS d,
              SUM(
                COALESCE(r.total_value, 0)
                * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                       THEN (o.subtotal - o.total_tax) / o.subtotal
                       ELSE 1.0 END
              ) AS amount
         FROM orders_returns r
         JOIN shopify_orders o ON o.order_id = r.order_id
        WHERE r.source = :source
          AND r.return_created_at BETWEEN :from AND :to
          AND r.status = 'CLOSED'
          AND COALESCE(o.test, FALSE) = FALSE
          AND r.order_id NOT IN (SELECT order_id FROM refund_orders_any)
        GROUP BY 1
     ),
     case5 AS (
       SELECT date_trunc('day', cancelled_at)::date AS d,
              SUM(
                COALESCE(subtotal, 0)
                * CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                       THEN (subtotal - total_tax) / subtotal
                       ELSE 1.0 END
              ) AS amount
         FROM shopify_orders
        WHERE cancelled_at BETWEEN :from AND :to
          AND COALESCE(test, FALSE) = FALSE
          AND COALESCE(financial_status, '') = 'VOIDED'
          AND order_id NOT IN (SELECT order_id FROM refund_orders_any)
          AND order_id NOT IN (SELECT order_id FROM return_orders_closed)
        GROUP BY 1
     ),
     return_fees AS (
       SELECT date_trunc('day', return_created_at)::date AS d,
              SUM(return_shipping_fee_total) AS fees
         FROM orders_returns
        WHERE source = :source
          AND return_created_at BETWEEN :from AND :to
          AND status = 'CLOSED'
        GROUP BY 1
     )
     SELECT d::text AS date, COALESCE(amount,0)::text AS returns, '0'::text AS return_fees FROM case1
      UNION ALL
     SELECT d::text AS date, COALESCE(amount,0)::text AS returns, '0'::text AS return_fees FROM case2
      UNION ALL
     SELECT d::text AS date, COALESCE(amount,0)::text AS returns, '0'::text AS return_fees FROM case3
      UNION ALL
     SELECT d::text AS date, COALESCE(amount,0)::text AS returns, '0'::text AS return_fees FROM case4
      UNION ALL
     SELECT d::text AS date, COALESCE(amount,0)::text AS returns, '0'::text AS return_fees FROM case5
      UNION ALL
     SELECT d::text AS date, '0'::text AS returns, COALESCE(fees,0)::text AS return_fees FROM return_fees`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
}

function emptyTotals(): SalesBreakdownTotals {
  return {
    gross_sales: 0,
    discounts: 0,
    returns: 0,
    net_sales: 0,
    shipping_charges: 0,
    return_fees: 0,
    taxes: 0,
    total_sales: 0,
    order_count: 0,
  };
}

function computeTotals(
  daily: SalesBreakdownDailyPoint[],
  orderCount: number,
  collectedTax: number,
  paidSubtotalExcl: number,
): SalesBreakdownTotals {
  const t = emptyTotals();
  for (const d of daily) {
    t.gross_sales += d.gross_sales;
    t.discounts += d.discounts;
    t.returns += d.returns;
    t.shipping_charges += d.shipping_charges;
    t.return_fees += d.return_fees;
  }
  t.net_sales = t.gross_sales - t.discounts - t.returns;
  // Shopify's "Taxes" line is the tax that ended up in the merchant's hands —
  // tax_on_net_sales, not tax_on_gross. We derive the effective tax rate from
  // PAID orders' actual figures (collected_tax / paid_subtotal_excl_tax) and
  // apply it to the period's net_sales. For Indian GST this rounds to 3% and
  // matches Shopify's report exactly.
  const effectiveRate = paidSubtotalExcl > 0 ? collectedTax / paidSubtotalExcl : 0;
  t.taxes = Math.round(effectiveRate * t.net_sales * 100) / 100;
  t.total_sales = t.net_sales + t.shipping_charges + t.taxes - t.return_fees;
  t.order_count = orderCount;
  return t;
}

async function buildBreakdown(
  from: Date,
  to: Date,
): Promise<{ totals: SalesBreakdownTotals; daily: SalesBreakdownDailyPoint[] }> {
  const [orderRows, returnRows] = await Promise.all([
    ordersDaily(from, to),
    returnsDaily(from, to),
  ]);
  // returnsDaily can emit multiple rows per date (one from returns, one from
  // refund residue). Sum them per date.
  const returnsMap = new Map<string, { returns: number; return_fees: number }>();
  for (const r of returnRows) {
    const prev = returnsMap.get(r.date) ?? { returns: 0, return_fees: 0 };
    prev.returns += parseFloat(r.returns);
    prev.return_fees += parseFloat(r.return_fees);
    returnsMap.set(r.date, prev);
  }
  let orderCount = 0;
  let collectedTax = 0;
  let paidSubtotalExcl = 0;
  const daily: SalesBreakdownDailyPoint[] = orderRows.map((r) => {
    const gross = parseFloat(r.gross_sales);
    const discounts = parseFloat(r.discounts);
    const shipping = parseFloat(r.shipping_charges);
    const dayTax = parseFloat(r.taxes);
    const dayPaidSubtotalExcl = parseFloat(r.paid_subtotal_excl);
    const ret = returnsMap.get(r.date) ?? { returns: 0, return_fees: 0 };
    const net = gross - discounts - ret.returns;
    orderCount += parseInt(r.order_count, 10);
    collectedTax += dayTax;
    paidSubtotalExcl += dayPaidSubtotalExcl;
    // Per-day tax = day's net × overall effective rate (computed in computeTotals)
    return {
      date: r.date,
      gross_sales: gross,
      discounts,
      returns: ret.returns,
      net_sales: net,
      shipping_charges: shipping,
      return_fees: ret.return_fees,
      taxes: dayTax,
      total_sales: net + shipping + dayTax - ret.return_fees,
      order_count: parseInt(r.order_count, 10),
    };
  });
  // Surface return-only days (returns/refunds without a matching order date in window)
  for (const [date, ret] of returnsMap.entries()) {
    if (!daily.find((d) => d.date === date)) {
      daily.push({
        date,
        gross_sales: 0,
        discounts: 0,
        returns: ret.returns,
        net_sales: -ret.returns,
        order_count: 0,
        shipping_charges: 0,
        return_fees: ret.return_fees,
        taxes: 0,
        total_sales: -ret.returns - ret.return_fees,
      });
    }
  }
  daily.sort((a, b) => a.date.localeCompare(b.date));
  return {
    totals: computeTotals(daily, orderCount, collectedTax, paidSubtotalExcl),
    daily,
  };
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Sales Breakdown — computed entirely from synced data (`shopify_orders`,
 * `orders_refunds`, `orders_returns`, `shopify_order_lineitems`). DB is the
 * single source of truth so the same formula chain works once we layer in
 * Amazon / Flipkart / Myntra orders alongside Shopify, and so custom reports
 * built on top of these tables stay internally consistent with the headline
 * tiles. Per project memory, every Shopify-derived sales metric must factor
 * through `ordersDaily` / `returnsDaily` / `buildBreakdown` / `computeTotals`.
 */
export async function getSalesBreakdown(from: Date, to: Date): Promise<SalesBreakdown> {
  const ms = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - ms);
  const [current, prevDaily] = await Promise.all([
    buildBreakdown(from, to),
    buildBreakdown(prevFrom, prevTo),
  ]);
  return {
    current: { from: fmtDate(from), to: fmtDate(to), totals: current.totals, daily: current.daily },
    previous: { from: fmtDate(prevFrom), to: fmtDate(prevTo), totals: prevDaily.totals },
  };
}
