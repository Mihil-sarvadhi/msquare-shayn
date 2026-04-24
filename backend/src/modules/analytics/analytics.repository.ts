import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import type {
  RtoByStateRow,
  CodVsPrepaidRow,
  GeoRevenueRow,
  CodCashFlowRow,
  CustomerOverviewRow,
  CustomerSegmentRow,
  TopCustomerRow,
  DiscountRow,
  MarketingTrendRow,
  AttributionGapRow,
  TopSkuRow,
  MoneyStuckRow,
  ChannelRevenueRow,
  CourierScorecardRow,
  SlaByZoneRow,
  CreativeFatigueRow,
  CohortRetentionRow,
  ReturnReasonRow,
} from './analytics.types';

export async function getNetRevenue(since: string, until: string) {
  const [shopify] = await sequelize.query<{ gross_revenue: string }>(
    `SELECT COALESCE(SUM(revenue), 0) AS gross_revenue
     FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until AND financial_status != 'voided'`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  const [ithink] = await sequelize.query<{ logistics_cost: string; rto_waste: string }>(
    `SELECT
       COALESCE(SUM(billed_total), 0) AS logistics_cost,
       COALESCE(SUM(CASE WHEN current_status_code LIKE 'RT%'
         THEN billed_fwd_charges + billed_rto_charges ELSE 0 END), 0) AS rto_waste
     FROM ithink_shipments WHERE order_date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  const gross = parseFloat(shopify?.gross_revenue ?? '0');
  const logistics = parseFloat(ithink?.logistics_cost ?? '0');
  const rtoWaste = parseFloat(ithink?.rto_waste ?? '0');
  return {
    gross_revenue: gross,
    logistics_cost: logistics,
    net_revenue: gross - logistics,
    rto_waste: rtoWaste,
  };
}

export async function getRtoByState(since: string, until: string): Promise<RtoByStateRow[]> {
  return sequelize.query<RtoByStateRow>(
    `SELECT customer_state AS state, COUNT(*) AS total,
       SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END) AS rto_count,
       ROUND(100.0 * SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END)
         / NULLIF(COUNT(*), 0), 1) AS rto_rate
     FROM ithink_shipments
     WHERE order_date BETWEEN :since AND :until
       AND customer_state IS NOT NULL AND customer_state != ''
     GROUP BY customer_state
     ORDER BY rto_count DESC LIMIT 12`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getCodVsPrepaidRto(since: string, until: string): Promise<CodVsPrepaidRow[]> {
  return sequelize.query<CodVsPrepaidRow>(
    `SELECT payment_mode, COUNT(*) AS total,
       SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END) AS rto_count,
       ROUND(100.0 * SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END)
         / NULLIF(COUNT(*), 0), 1) AS rto_rate
     FROM ithink_shipments
     WHERE order_date BETWEEN :since AND :until
       AND payment_mode IN ('COD', 'Prepaid')
     GROUP BY payment_mode`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getGeoRevenue(since: string, until: string): Promise<GeoRevenueRow[]> {
  return sequelize.query<GeoRevenueRow>(
    `SELECT customer_state AS state, COALESCE(SUM(revenue), 0) AS revenue, COUNT(*) AS orders
     FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until AND financial_status != 'voided'
       AND customer_state IS NOT NULL AND customer_state != ''
     GROUP BY customer_state ORDER BY revenue DESC LIMIT 10`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getShipmentStatusBreakdown(since: string, until: string): Promise<{ status: string; count: number }[]> {
  return sequelize.query<{ status: string; count: number }>(
    `SELECT COALESCE(current_status, 'Unknown') AS status, COUNT(*) AS count
     FROM ithink_shipments
     WHERE order_date BETWEEN :since AND :until
     GROUP BY current_status ORDER BY count DESC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getCodCashFlow(since: string, until: string): Promise<CodCashFlowRow> {
  const [row] = await sequelize.query<CodCashFlowRow>(
    `SELECT COALESCE(SUM(cod_generated), 0) AS cod_generated,
            COALESCE(SUM(cod_remitted), 0) AS cod_remitted,
            COALESCE(SUM(cod_generated - cod_remitted), 0) AS pending
     FROM ithink_remittance
     WHERE remittance_date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  return row;
}

export async function getCustomerOverview(
  since: string,
  until: string,
  isAllTime = false,
): Promise<CustomerOverviewRow> {
  if (isAllTime) {
    const [row] = await sequelize.query<CustomerOverviewRow>(
      `SELECT
         COUNT(*)::int AS total_customers,
         COUNT(CASE WHEN COALESCE(orders_count, 0) <= 1 THEN 1 END)::int AS new_customers,
         COUNT(CASE WHEN COALESCE(orders_count, 0) > 1 THEN 1 END)::int AS returning_customers,
         CASE WHEN COUNT(*) > 0
              THEN ROUND(
                COUNT(CASE WHEN COALESCE(orders_count, 0) > 1 THEN 1 END)::numeric
                / COUNT(*)::numeric * 100, 1
              )
              ELSE 0 END AS repeat_rate
       FROM shopify_customers`,
      { type: QueryTypes.SELECT, replacements: {} },
    );
    return row;
  }

  const [row] = await sequelize.query<CustomerOverviewRow>(
    `WITH orders_normalized AS (
       SELECT
         COALESCE(NULLIF(customer_id, ''), NULLIF(LOWER(customer_email), '')) AS customer_key,
         created_at::date AS order_date
       FROM shopify_orders
       WHERE financial_status != 'voided'
     ),
     first_orders AS (
       SELECT customer_key, MIN(order_date) AS first_ever_date
       FROM orders_normalized
       WHERE customer_key IS NOT NULL
       GROUP BY customer_key
     ),
     period_customers AS (
       SELECT o.customer_key,
              MIN(fo.first_ever_date) AS first_ever_date,
              COUNT(*)                AS order_count
       FROM orders_normalized o
       JOIN first_orders fo ON fo.customer_key = o.customer_key
       WHERE o.order_date BETWEEN :since AND :until
         AND o.customer_key IS NOT NULL
       GROUP BY o.customer_key
     )
     SELECT
       COUNT(*)::int AS total_customers,
       COUNT(CASE WHEN first_ever_date BETWEEN :since AND :until THEN 1 END)::int AS new_customers,
       COUNT(CASE WHEN first_ever_date < :since THEN 1 END)::int AS returning_customers,
       CASE WHEN COUNT(*) > 0
            THEN ROUND(
              COUNT(CASE WHEN first_ever_date < :since THEN 1 END)::numeric
              / COUNT(*)::numeric * 100, 1
            )
            ELSE 0 END AS repeat_rate
     FROM period_customers`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  return row;
}

export async function getCustomerSegments(since: string, until: string): Promise<CustomerSegmentRow[]> {
  return sequelize.query<CustomerSegmentRow>(
    `WITH customer_order_counts AS (
       SELECT
         COALESCE(NULLIF(customer_id, ''), NULLIF(LOWER(customer_email), '')) AS customer_key,
         COUNT(*) AS orders_count
       FROM shopify_orders
       WHERE financial_status != 'voided'
         AND created_at::date BETWEEN :since AND :until
         AND COALESCE(NULLIF(customer_id, ''), NULLIF(LOWER(customer_email), '')) IS NOT NULL
       GROUP BY customer_key
     )
     SELECT
       CASE WHEN orders_count = 1 THEN '1 order'
            WHEN orders_count BETWEEN 2 AND 3 THEN '2-3 orders'
            WHEN orders_count BETWEEN 4 AND 5 THEN '4-5 orders'
            ELSE '6+ orders' END AS bucket,
       MIN(orders_count)::int    AS sort_key,
       COUNT(*)::int             AS count
     FROM customer_order_counts
     GROUP BY 1 ORDER BY MIN(orders_count)`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getTopCustomers(since: string, until: string): Promise<TopCustomerRow[]> {
  return sequelize.query<TopCustomerRow>(
    `SELECT
            COALESCE(NULLIF(customer_id, ''), NULLIF(LOWER(customer_email), '')) AS customer_id,
            MAX(customer_email)                          AS email,
            MAX(customer_name)                           AS name,
            MAX(customer_city)                           AS city,
            MAX(customer_state)                          AS state,
            COUNT(*)                                     AS orders_count,
            COALESCE(SUM(revenue), 0)::text              AS total_spent,
            MAX(created_at::date)                        AS last_order_date
     FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until
       AND financial_status != 'voided'
       AND COALESCE(NULLIF(customer_id, ''), NULLIF(LOWER(customer_email), '')) IS NOT NULL
    GROUP BY COALESCE(NULLIF(customer_id, ''), NULLIF(LOWER(customer_email), ''))
     ORDER BY SUM(revenue) DESC
     LIMIT 10`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getDiscountAnalysis(since: string, until: string): Promise<DiscountRow[]> {
  return sequelize.query<DiscountRow>(
    `SELECT COALESCE(NULLIF(discount_code, ''), 'No Discount') AS discount_code,
            COUNT(*) AS orders,
            COALESCE(SUM(revenue), 0) AS revenue,
            COALESCE(AVG(revenue), 0) AS aov,
            ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct_of_total
     FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until AND financial_status != 'voided'
     GROUP BY 1 ORDER BY orders DESC LIMIT 20`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getMarketingTrend(
  since: string,
  until: string,
): Promise<MarketingTrendRow[]> {
  return sequelize.query<MarketingTrendRow>(
    `SELECT d.date::text,
            m.spend, m.purchases, m.purchase_value,
            m.roas, m.ctr, m.cpp
     FROM generate_series(:since::date, :until::date, '1 day'::interval) AS d(date)
     LEFT JOIN (
       SELECT date,
              SUM(spend)::text AS spend,
              SUM(purchases)::text AS purchases,
              SUM(purchase_value)::text AS purchase_value,
              CASE WHEN SUM(spend) > 0
                THEN ROUND((SUM(purchase_value) / SUM(spend))::numeric, 2)::text
                ELSE NULL END AS roas,
              ROUND(AVG(ctr)::numeric, 2)::text AS ctr,
              CASE WHEN SUM(purchases) > 0
                THEN ROUND((SUM(spend) / SUM(purchases))::numeric, 2)::text
                ELSE NULL END AS cpp
       FROM meta_daily_insights
       WHERE date BETWEEN :since AND :until
       GROUP BY date
     ) m ON m.date = d.date
     ORDER BY d.date ASC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getAttributionGap(since: string, until: string): Promise<AttributionGapRow> {
  const [meta] = await sequelize.query<{ meta_purchases: string }>(
    `SELECT COALESCE(SUM(purchases), 0) AS meta_purchases
     FROM meta_daily_insights WHERE date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  const [shopify] = await sequelize.query<{ shopify_orders: string }>(
    `SELECT COUNT(*) AS shopify_orders FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until AND financial_status != 'voided'`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  return {
    meta_purchases: meta?.meta_purchases ?? '0',
    shopify_orders: shopify?.shopify_orders ?? '0',
  };
}

export async function getTopSkus(since: string, until: string): Promise<TopSkuRow[]> {
  return sequelize.query<TopSkuRow>(
    `SELECT
       li.sku,
       li.title,
       COALESCE(li.variant, '') AS variant,
       SUM(li.quantity) AS units_sold,
       COUNT(DISTINCT o.order_id) AS orders_count,
       SUM(li.quantity * li.unit_price) AS revenue
     FROM shopify_order_lineitems li
     JOIN shopify_orders o ON o.order_id = li.order_id
     WHERE o.created_at::date BETWEEN :since AND :until
       AND o.financial_status != 'voided'
       AND li.sku IS NOT NULL AND li.sku != ''
     GROUP BY li.sku, li.title, li.variant
     ORDER BY revenue DESC
     LIMIT 10`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getMoneyStuck(since: string, until: string): Promise<MoneyStuckRow> {
  const [row] = await sequelize.query<MoneyStuckRow>(
    `SELECT
       COUNT(s.awb) AS rto_count,
       COALESCE(SUM(o.revenue), 0) AS rto_order_value,
       0::numeric AS cod_pending,
       COALESCE(SUM(o.revenue), 0) AS total_stuck
     FROM ithink_shipments s
     JOIN shopify_orders o ON o.order_id = s.shopify_order_gql_id
     WHERE s.current_status_code LIKE 'RT%'
       AND s.order_date BETWEEN :since AND :until
       AND o.financial_status != 'voided'`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  return row;
}

export async function getCourierScorecard(since: string, until: string): Promise<CourierScorecardRow[]> {
  const total = await sequelize.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM ithink_shipments WHERE order_date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  const grandTotal = parseFloat(total[0]?.total ?? '1') || 1;
  return sequelize.query<CourierScorecardRow>(
    `SELECT
       COALESCE(NULLIF(courier, ''), 'Unknown') AS courier,
       COUNT(*) AS volume,
       ROUND(100.0 * COUNT(*) / :grandTotal, 1) AS split_pct,
       ROUND(100.0 * SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END)
         / NULLIF(COUNT(*), 0), 1) AS rto_rate,
       COALESCE(ROUND(AVG(
         CASE WHEN delivered_date IS NOT NULL AND order_date IS NOT NULL
           THEN EXTRACT(EPOCH FROM (delivered_date::timestamp - order_date::date::timestamp)) / 86400.0
         END
       )::numeric, 1), 0) AS avg_sla_days,
       COALESCE(ROUND(AVG(CASE WHEN billed_total > 0 THEN billed_total END)::numeric, 2), 0) AS cost_per_shipment
     FROM ithink_shipments
     WHERE order_date BETWEEN :since AND :until
     GROUP BY courier
     ORDER BY COUNT(*) DESC`,
    { type: QueryTypes.SELECT, replacements: { since, until, grandTotal } },
  );
}

export async function getSlaByZone(since: string, until: string): Promise<SlaByZoneRow[]> {
  return sequelize.query<SlaByZoneRow>(
    `SELECT
       zone,
       ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
         ORDER BY EXTRACT(EPOCH FROM (delivered_date::timestamp - order_date::date::timestamp)) / 86400.0
       )::numeric, 1) AS median_days,
       ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (
         ORDER BY EXTRACT(EPOCH FROM (delivered_date::timestamp - order_date::date::timestamp)) / 86400.0
       )::numeric, 1) AS p95_days,
       COUNT(*) AS total_shipments
     FROM ithink_shipments
     WHERE delivered_date IS NOT NULL AND zone IS NOT NULL AND zone != ''
       AND order_date BETWEEN :since AND :until
     GROUP BY zone
     ORDER BY median_days ASC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getChannelRevenue(since: string, until: string): Promise<ChannelRevenueRow> {
  const [shopifyRow] = await sequelize.query<{ shopify_revenue: string }>(
    `SELECT COALESCE(SUM(revenue), 0) AS shopify_revenue
     FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until
       AND financial_status != 'voided'`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  const [metaRow] = await sequelize.query<{ meta_revenue: string }>(
    `SELECT COALESCE(SUM(purchase_value), 0) AS meta_revenue
     FROM meta_daily_insights
     WHERE date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  const shopify = parseFloat(shopifyRow?.shopify_revenue ?? '0');
  const meta = parseFloat(metaRow?.meta_revenue ?? '0');
  return {
    shopify_revenue: String(shopify),
    meta_revenue: String(meta),
    organic_revenue: String(Math.max(0, shopify - meta)),
  };
}

export async function getCreativeFatigue(since: string, until: string): Promise<CreativeFatigueRow[]> {
  return sequelize.query<CreativeFatigueRow>(
    `WITH top_campaigns AS (
       SELECT campaign_id
       FROM meta_daily_insights
       WHERE date BETWEEN :since AND :until
       GROUP BY campaign_id
       ORDER BY SUM(spend) DESC
       LIMIT 5
     ),
     daily_agg AS (
       SELECT
         date,
         SUM(impressions)::bigint AS impressions,
         SUM(reach)::bigint       AS reach,
         SUM(clicks)::bigint      AS clicks
       FROM meta_daily_insights
       WHERE date BETWEEN :since AND :until
         AND campaign_id IN (SELECT campaign_id FROM top_campaigns)
       GROUP BY date
     )
     SELECT
       date::text,
       ROUND(
         SUM(impressions) OVER w7 /
         NULLIF(SUM(reach) OVER w7, 0)::numeric,
         2
       )::text AS frequency,
       ROUND(
         100.0 * SUM(clicks) OVER w7 /
         NULLIF(SUM(impressions) OVER w7, 0)::numeric,
         2
       )::text AS ctr
     FROM daily_agg
     WINDOW w7 AS (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
     ORDER BY date ASC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getCohortRetention(): Promise<CohortRetentionRow[]> {
  return sequelize.query<CohortRetentionRow>(
    `WITH first_orders AS (
       SELECT customer_id, DATE_TRUNC('month', MIN(created_at)) AS cohort_month
       FROM shopify_orders
       WHERE financial_status != 'voided' AND customer_id IS NOT NULL AND customer_id != ''
       GROUP BY customer_id
     ),
     repeat_orders AS (
       SELECT o.customer_id, DATE_TRUNC('month', o.created_at) AS purchase_month
       FROM shopify_orders o
       WHERE o.financial_status != 'voided' AND o.customer_id IS NOT NULL AND o.customer_id != ''
     )
     SELECT
       TO_CHAR(f.cohort_month, 'Mon YY') AS cohort_month,
       COUNT(DISTINCT f.customer_id)::text AS cohort_size,
       COUNT(DISTINCT CASE WHEN r.purchase_month = f.cohort_month                         THEN r.customer_id END)::text AS m0,
       COUNT(DISTINCT CASE WHEN r.purchase_month = f.cohort_month + INTERVAL '1 month'    THEN r.customer_id END)::text AS m1,
       COUNT(DISTINCT CASE WHEN r.purchase_month = f.cohort_month + INTERVAL '2 months'   THEN r.customer_id END)::text AS m2,
       COUNT(DISTINCT CASE WHEN r.purchase_month = f.cohort_month + INTERVAL '3 months'   THEN r.customer_id END)::text AS m3,
       COUNT(DISTINCT CASE WHEN r.purchase_month = f.cohort_month + INTERVAL '4 months'   THEN r.customer_id END)::text AS m4,
       COUNT(DISTINCT CASE WHEN r.purchase_month = f.cohort_month + INTERVAL '5 months'   THEN r.customer_id END)::text AS m5
     FROM first_orders f
     LEFT JOIN repeat_orders r ON r.customer_id = f.customer_id
     GROUP BY f.cohort_month
     ORDER BY f.cohort_month DESC
     LIMIT 12`,
    { type: QueryTypes.SELECT, replacements: {} },
  );
}

export async function getReturnReasons(since: string, until: string): Promise<ReturnReasonRow[]> {
  return sequelize.query<ReturnReasonRow>(
    `WITH reasons AS (
       SELECT
         COALESCE(
           NULLIF(TRIM(last_scan::jsonb ->> 'reason'), ''),
           NULLIF(TRIM(last_scan::jsonb ->> 'remark'), ''),
           'Unknown'
         ) AS reason
       FROM ithink_shipments
       WHERE current_status_code IN ('RT', 'RTD', 'RTO')
         AND last_scan IS NOT NULL
         AND left(trim(last_scan), 1) = '{'
         AND order_date BETWEEN :since AND :until
     )
     SELECT
       reason,
       COUNT(*)::text AS count,
       ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1)::text AS pct
     FROM reasons
     GROUP BY reason
     ORDER BY COUNT(*) DESC
     LIMIT 12`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}
