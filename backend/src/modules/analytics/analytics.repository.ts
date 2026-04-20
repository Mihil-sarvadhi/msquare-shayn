import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import type {
  RtoByStateRow,
  CodVsPrepaidRow,
  GeoRevenueRow,
  LogisticsCostsRow,
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

export async function getLogisticsCosts(since: string, until: string): Promise<LogisticsCostsRow> {
  const [row] = await sequelize.query<LogisticsCostsRow>(
    `SELECT COALESCE(SUM(billed_fwd_charges), 0) AS fwd,
            COALESCE(SUM(billed_rto_charges), 0) AS rto,
            COALESCE(SUM(billed_cod_charges), 0) AS cod,
            COALESCE(SUM(billed_gst_charges), 0) AS gst,
            COALESCE(SUM(billed_total), 0) AS total
     FROM ithink_shipments WHERE order_date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  return row;
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
): Promise<CustomerOverviewRow> {
  const [row] = await sequelize.query<CustomerOverviewRow>(
    `WITH period_customers AS (
       SELECT o.customer_id,
              MIN(fo.min_date) AS first_ever_date
       FROM shopify_orders o
       JOIN (
         SELECT customer_id, MIN(created_at::date) AS min_date
         FROM shopify_orders
         WHERE financial_status != 'voided' AND customer_id IS NOT NULL
         GROUP BY customer_id
       ) fo ON fo.customer_id = o.customer_id
       WHERE o.created_at::date BETWEEN :since AND :until
         AND o.financial_status != 'voided' AND o.customer_id IS NOT NULL
       GROUP BY o.customer_id
     )
     SELECT
       COUNT(*)::int                                                              AS total_customers,
       COUNT(CASE WHEN first_ever_date BETWEEN :since AND :until THEN 1 END)::int AS new_customers,
       COUNT(CASE WHEN first_ever_date < :since THEN 1 END)::int                  AS returning_customers,
       CASE WHEN COUNT(*) > 0
            THEN ROUND(COUNT(CASE WHEN first_ever_date < :since THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1)
            ELSE 0 END                                                             AS repeat_rate
     FROM period_customers`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  return row;
}

export async function getCustomerSegments(since: string, until: string): Promise<CustomerSegmentRow[]> {
  return sequelize.query<CustomerSegmentRow>(
    `WITH customer_order_counts AS (
       SELECT customer_id, COUNT(*) AS orders_count
       FROM shopify_orders
       WHERE financial_status != 'voided'
         AND customer_id IS NOT NULL
         AND created_at::date BETWEEN :since AND :until
       GROUP BY customer_id
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
    `SELECT customer_id,
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
       AND customer_id IS NOT NULL
     GROUP BY customer_id
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
    `SELECT date::text,
            SUM(spend) AS spend, SUM(purchases) AS purchases,
            SUM(purchase_value) AS purchase_value,
            CASE WHEN SUM(spend) > 0
              THEN ROUND((SUM(purchase_value) / SUM(spend))::numeric, 2) ELSE 0 END AS roas,
            ROUND(AVG(ctr)::numeric, 2) AS ctr,
            CASE WHEN SUM(purchases) > 0
              THEN ROUND((SUM(spend) / SUM(purchases))::numeric, 2) ELSE 0 END AS cpp
     FROM meta_daily_insights WHERE date BETWEEN :since AND :until
     GROUP BY date ORDER BY date ASC`,
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
