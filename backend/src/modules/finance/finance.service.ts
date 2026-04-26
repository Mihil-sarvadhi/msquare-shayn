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
import {
  payoutAggregates,
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
       WHERE created_at BETWEEN :from AND :to`,
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
  const [orders, refunds, payouts] = await Promise.all([
    orderTotals(from, to),
    refundSummaryAggregates(from, to),
    payoutAggregates(from, to),
  ]);

  // Per spec: net_revenue = gross - discounts - refunds - tax - shipping
  const net_revenue =
    orders.gross_revenue -
    orders.total_discounts -
    refunds.total_refunds -
    orders.total_tax -
    orders.total_shipping;
  const fees_pct =
    payouts.payouts_received > 0 ? (payouts.shopify_fees / payouts.payouts_received) * 100 : 0;
  const refund_rate =
    orders.order_count > 0 ? (refunds.refund_count / orders.order_count) * 100 : 0;

  return {
    gross_revenue: orders.gross_revenue,
    total_discounts: orders.total_discounts,
    total_tax: orders.total_tax,
    total_shipping: orders.total_shipping,
    total_refunds: refunds.total_refunds,
    net_revenue,
    payouts_received: payouts.payouts_received,
    shopify_fees: payouts.shopify_fees,
    fees_pct,
    refund_rate,
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
