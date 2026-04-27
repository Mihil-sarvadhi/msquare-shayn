import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { SOURCE } from '@constant';
import { logger } from '@logger/logger';
import { fetchSalesBreakdownViaShopifyQL } from '@modules/shopify/shopify.connector';
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
import {
  listPayouts as listPayoutsRepo,
  findPayoutById,
  type PayoutsListParams,
} from './payouts.repository';
import { listBalanceTransactionsForPayout } from './balance-transactions.repository';
import { listLocations } from './locations.repository';
import type {
  FinanceKpis,
  GroupBy,
  PaymentMethodSplit,
  PayoutDetail,
  RefundsSummary,
  RevenueBreakdownPoint,
  SalesBreakdown,
  SalesBreakdownDailyPoint,
  SalesBreakdownTotals,
} from './finance.types';

interface OrderTotals {
  gross_revenue: number;
  total_discounts: number;
  total_tax: number;
  total_shipping: number;
  order_count: number;
}

async function orderTotals(from: Date, to: Date): Promise<OrderTotals> {
  const result = await sequelize.query<{
    gross_revenue: string;
    total_discounts: string;
    total_tax: string;
    total_shipping: string;
    order_count: string;
  }>(
    `SELECT COALESCE(SUM(revenue),0)::text AS gross_revenue,
            COALESCE(SUM(total_discounts),0)::text AS total_discounts,
            COALESCE(SUM(total_tax),0)::text AS total_tax,
            COALESCE(SUM(total_shipping),0)::text AS total_shipping,
            COUNT(*)::text AS order_count
       FROM shopify_orders
       WHERE created_at BETWEEN :from AND :to
         AND COALESCE(financial_status, '') <> 'voided'
         AND cancelled_at IS NULL
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

export async function getKpis(from: Date, to: Date): Promise<FinanceKpis> {
  const [orders, refunds] = await Promise.all([
    orderTotals(from, to),
    refundSummaryAggregates(from, to),
  ]);

  // Per spec: net_revenue = gross - discounts - refunds - tax - shipping
  const net_revenue =
    orders.gross_revenue -
    orders.total_discounts -
    refunds.total_refunds -
    orders.total_tax -
    orders.total_shipping;

  return {
    gross_revenue: orders.gross_revenue,
    total_discounts: orders.total_discounts,
    total_tax: orders.total_tax,
    total_shipping: orders.total_shipping,
    total_refunds: refunds.total_refunds,
    net_revenue,
    refund_count: refunds.refund_count,
    order_count: orders.order_count,
  };
}

export async function getRevenueBreakdown(
  from: Date,
  to: Date,
  groupBy: GroupBy,
): Promise<RevenueBreakdownPoint[]> {
  const truncUnit = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month';
  const orderRows = await sequelize.query<{
    bucket: string;
    gross: string;
    discounts: string;
    tax: string;
    shipping: string;
  }>(
    `SELECT date_trunc('${truncUnit}', created_at)::date::text AS bucket,
            COALESCE(SUM(revenue),0)::text AS gross,
            COALESCE(SUM(total_discounts),0)::text AS discounts,
            COALESCE(SUM(total_tax),0)::text AS tax,
            COALESCE(SUM(total_shipping),0)::text AS shipping
       FROM shopify_orders
       WHERE created_at BETWEEN :from AND :to
       GROUP BY bucket
       ORDER BY bucket ASC`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );

  const refundRows = await sequelize.query<{ bucket: string; refunds: string }>(
    `SELECT date_trunc('${truncUnit}', refunded_at)::date::text AS bucket,
            COALESCE(SUM(refund_amount),0)::text AS refunds
       FROM orders_refunds
       WHERE source = :source AND refunded_at BETWEEN :from AND :to
       GROUP BY bucket`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );

  const refundMap = new Map(refundRows.map((r) => [r.bucket, parseFloat(r.refunds)]));

  return orderRows.map((r) => {
    const gross = parseFloat(r.gross);
    const discounts = parseFloat(r.discounts);
    const tax = parseFloat(r.tax);
    const shipping = parseFloat(r.shipping);
    const refunds = refundMap.get(r.bucket) ?? 0;
    return {
      date: r.bucket,
      gross,
      discounts,
      refunds,
      tax,
      net: gross - discounts - refunds - tax - shipping,
    };
  });
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

export async function listPayouts(params: PayoutsListParams) {
  return listPayoutsRepo(params);
}

export async function getPayoutDetail(id: number): Promise<PayoutDetail | null> {
  const payout = await findPayoutById(id);
  if (!payout) return null;
  const balance_transactions = await listBalanceTransactionsForPayout(id);
  return { payout, balance_transactions };
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
  // Shopify Analytics' "Returns" represents revenue that didn't reach the merchant.
  // For COD-heavy stores this is dominated by RTO (orders voided after delivery
  // attempt fails), which has no associated Refund record — payment was never
  // captured to begin with. Our model:
  //
  //   uncollected_gross = gross_sales of orders not in financial_status PAID, OR
  //                       cancelled. Bucketed by order created_at.
  //   paid_refunds      = total_refunded on PAID orders (money captured then
  //                       returned). Bucketed by created_at — Shopify attributes
  //                       to the period the order was placed in.
  //   return_fees       = restocking/return-shipping fees from orders_returns
  //                       (separate negative line in the breakdown).
  //
  // We dedupe by tagging each order's contribution exactly once across the two
  // buckets (uncollected vs paid_refunds).
  return sequelize.query<ReturnsDailyRow>(
    `WITH formal_returns_per_order AS (
       SELECT order_id, SUM(total_value) AS total_return_value
         FROM orders_returns
        WHERE source = :source AND status NOT IN ('DECLINED','CANCELED')
        GROUP BY order_id
     ),
     order_returns AS (
       SELECT date_trunc('day', o.created_at)::date AS d,
              -- Per-order Returns contribution:
              --   PAID + clean       -> 0 (fully captured, nothing returned)
              --   PAID + refunded    -> total_refunded (money refunded back)
              --   PAID + in-progress return -> formal_return_value (items coming back)
              --   Non-PAID/cancelled -> gross - total_received (uncaptured portion)
              --
              -- Multiplied by the per-order tax factor (subtotal - tax) / subtotal
              -- to land in Shopify's tax-EXCLUSIVE reporting space.
              (CASE
                WHEN COALESCE(o.financial_status,'') = 'PAID' AND o.cancelled_at IS NULL
                  THEN GREATEST(
                    COALESCE(fr.total_return_value, 0),
                    COALESCE(o.total_refunded, 0)
                  )
                ELSE
                  -- Items value treated as returned. SHAYN's COD deposit (~₹200,
                  -- non-refundable when RTO) is captured in total_received but
                  -- it's a SERVICE FEE, not items revenue — Shopify's Sales
                  -- report counts the full items value as returned regardless.
                  COALESCE(o.gross_sales, o.revenue, 0)
              END)
              *
              CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                   THEN (o.subtotal - o.total_tax) / o.subtotal
                   ELSE 1.0 END
              AS contribution
         FROM shopify_orders o
         LEFT JOIN formal_returns_per_order fr ON fr.order_id = o.order_id
        WHERE o.created_at BETWEEN :from AND :to
          AND COALESCE(o.test, FALSE) = FALSE
     ),
     return_fees AS (
       SELECT date_trunc('day', return_created_at)::date AS d,
              SUM(return_shipping_fee_total) AS fees
         FROM orders_returns
        WHERE source = :source
          AND return_created_at BETWEEN :from AND :to
          AND status NOT IN ('DECLINED','CANCELED')
        GROUP BY 1
     )
     SELECT d::text AS date,
            COALESCE(SUM(contribution), 0)::text AS returns,
            '0'::text AS return_fees
       FROM order_returns
      GROUP BY d
      UNION ALL
     SELECT d::text AS date,
            '0'::text AS returns,
            COALESCE(fees, 0)::text AS return_fees
       FROM return_fees`,
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

export type SalesBreakdownMode = 'computed' | 'shopify_native';

/**
 * 5-minute in-memory cache for ShopifyQL responses. Keyed by (from|to|mode).
 * ShopifyQL has a per-shop API rate budget — caching prevents every dashboard
 * tile + page-load from spending it. Stays warm for the common founder workflow
 * (open dashboard, click into Finance, change date range, etc.).
 */
const SHOPIFYQL_CACHE = new Map<string, { data: SalesBreakdown; expiresAt: number }>();
const SHOPIFYQL_TTL_MS = 5 * 60 * 1000;

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function buildBreakdownViaShopifyQL(
  from: Date,
  to: Date,
): Promise<{ totals: SalesBreakdownTotals; daily: SalesBreakdownDailyPoint[] }> {
  const result = await fetchSalesBreakdownViaShopifyQL(from, to);
  // ShopifyQL totals don't include order_count; fall back to our orders table count
  // so the founder still sees order volume.
  const orderCountResult = await sequelize.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM shopify_orders
     WHERE created_at BETWEEN :from AND :to
       AND COALESCE(financial_status, '') <> 'voided'
       AND cancelled_at IS NULL
       AND COALESCE(test, FALSE) = FALSE`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );
  const order_count = parseInt(orderCountResult[0]?.n ?? '0', 10);
  return {
    totals: { ...result.totals, order_count },
    daily: result.daily.map((d) => ({ ...d })),
  };
}

export async function getSalesBreakdown(
  from: Date,
  to: Date,
  mode: SalesBreakdownMode = 'computed',
): Promise<SalesBreakdown> {
  const ms = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - ms);

  if (mode === 'shopify_native') {
    const cacheKey = `${fmtDate(from)}|${fmtDate(to)}|shopify_native`;
    const cached = SHOPIFYQL_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    // Surface the real error instead of silently falling back so the user sees
    // *why* "Verify with Shopify" isn't matching (missing scope, rate limit, etc.)
    // rather than a quiet wrong-number experience.
    const [current, prev] = await Promise.all([
      buildBreakdownViaShopifyQL(from, to),
      buildBreakdownViaShopifyQL(prevFrom, prevTo),
    ]);
    const data: SalesBreakdown = {
      current: {
        from: fmtDate(from),
        to: fmtDate(to),
        totals: current.totals,
        daily: current.daily,
      },
      previous: { from: fmtDate(prevFrom), to: fmtDate(prevTo), totals: prev.totals },
    };
    SHOPIFYQL_CACHE.set(cacheKey, { data, expiresAt: Date.now() + SHOPIFYQL_TTL_MS });
    logger.info(
      `[Finance] ShopifyQL totals: gross=${data.current.totals.gross_sales} returns=${data.current.totals.returns} net=${data.current.totals.net_sales} total=${data.current.totals.total_sales}`,
    );
    return data;
  }

  const [current, prevDaily] = await Promise.all([
    buildBreakdown(from, to),
    buildBreakdown(prevFrom, prevTo),
  ]);
  return {
    current: { from: fmtDate(from), to: fmtDate(to), totals: current.totals, daily: current.daily },
    previous: { from: fmtDate(prevFrom), to: fmtDate(prevTo), totals: prevDaily.totals },
  };
}
