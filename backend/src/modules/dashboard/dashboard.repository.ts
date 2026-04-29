import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import type {
  KpiResult,
  RevenueTrendRow,
  MetaFunnelRow,
  CampaignRow,
  TopProductRow,
  LogisticsRow,
  AbandonedCartsRow,
  ReviewsSummaryRow,
  ReviewsTrendRow,
  TopRatedProductRow,
  RecentReviewRow,
  AllReviewsResult,
  RecentOrderRow,
  RevenueVsSpendRow,
} from './dashboard.types';

export async function getKpis(since: string, until: string): Promise<KpiResult> {
  const [shopifyKPIs, metaKPIs, ithinkKPIs] = await Promise.all([
    sequelize.query<{
      total_revenue: string;
      total_orders: string;
      aov: string;
      unique_customers: string;
      cod_orders: string;
      prepaid_orders: string;
      cancelled_orders: string;
    }>(
      // Revenue/AOV mirror Shopify Analytics' "Gross sales": tax-EXCLUSIVE
      // (subtotal + discounts) × tax_factor, where tax_factor strips embedded
      // GST per order. For Indian (tax-inclusive) stores raw subtotal includes
      // tax, so the stored gross_sales column would inflate the KPI by ~3%.
      // Test orders are excluded to match Shopify's own filter.
      `WITH scoped_orders AS (
         SELECT
           financial_status,
           payment_mode,
           customer_id,
           (COALESCE(subtotal, 0) + COALESCE(total_discounts, 0)) *
             CASE
               WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                 THEN (subtotal - total_tax) / subtotal
               ELSE 1.0
             END AS gross_excl_tax
         FROM shopify_orders
         WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
           AND COALESCE(test, FALSE) = FALSE
       )
       SELECT
        COALESCE(SUM(CASE WHEN financial_status != 'voided' THEN gross_excl_tax ELSE 0 END), 0) AS total_revenue,
        COUNT(CASE WHEN financial_status != 'voided' THEN 1 END) AS total_orders,
        COALESCE(AVG(CASE WHEN financial_status != 'voided' THEN gross_excl_tax END), 0) AS aov,
        COUNT(DISTINCT CASE WHEN financial_status != 'voided' THEN customer_id END) AS unique_customers,
        SUM(CASE WHEN payment_mode = 'COD' AND financial_status != 'voided' THEN 1 ELSE 0 END) AS cod_orders,
        SUM(CASE WHEN payment_mode = 'Prepaid' AND financial_status != 'voided' THEN 1 ELSE 0 END) AS prepaid_orders,
        COUNT(CASE WHEN financial_status = 'voided' THEN 1 END) AS cancelled_orders
       FROM scoped_orders`,
      { type: QueryTypes.SELECT, replacements: { since, until } },
    ),
    sequelize.query<{
      total_spend: string;
      total_impressions: string;
      total_clicks: string;
      total_purchases: string;
      total_purchase_value: string;
      roas: string;
    }>(
      `SELECT
        COALESCE(SUM(spend), 0) AS total_spend,
        COALESCE(SUM(impressions), 0) AS total_impressions,
        COALESCE(SUM(clicks), 0) AS total_clicks,
        COALESCE(SUM(purchases), 0) AS total_purchases,
        COALESCE(SUM(purchase_value), 0) AS total_purchase_value,
        CASE WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend) ELSE 0 END AS roas
       FROM meta_daily_insights
       WHERE date BETWEEN :since AND :until`,
      { type: QueryTypes.SELECT, replacements: { since, until } },
    ),
    sequelize.query<{
      total_shipments: string;
      delivered: string;
      rto: string;
      ofd: string;
      ndr: string;
    }>(
      `SELECT
        COUNT(*) AS total_shipments,
        SUM(CASE WHEN current_status_code = 'DL' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END) AS rto,
        SUM(CASE WHEN current_status_code = 'UD' AND current_status LIKE '%Out For Delivery%' THEN 1 ELSE 0 END) AS ofd,
        SUM(CASE WHEN current_status = 'Undelivered' THEN 1 ELSE 0 END) AS ndr
       FROM ithink_shipments
       WHERE order_date BETWEEN :since AND :until`,
      { type: QueryTypes.SELECT, replacements: { since, until } },
    ),
  ]);

  const s = shopifyKPIs[0];
  const m = metaKPIs[0];
  const i = ithinkKPIs[0];
  const rtoRate =
    parseInt(i.total_shipments, 10) > 0
      ? ((parseInt(i.rto, 10) / parseInt(i.total_shipments, 10)) * 100).toFixed(1)
      : '0';

  return {
    revenue: parseFloat(s.total_revenue),
    orders: parseInt(s.total_orders, 10),
    aov: parseFloat(s.aov),
    customers: parseInt(s.unique_customers, 10),
    codOrders: parseInt(s.cod_orders, 10),
    prepaidOrders: parseInt(s.prepaid_orders, 10),
    adSpend: parseFloat(m.total_spend),
    impressions: parseInt(m.total_impressions, 10),
    clicks: parseInt(m.total_clicks, 10),
    purchases: parseInt(m.total_purchases, 10),
    purchaseValue: parseFloat(m.total_purchase_value),
    roas: parseFloat(m.roas),
    totalShipments: parseInt(i.total_shipments, 10),
    delivered: parseInt(i.delivered, 10),
    rto: parseInt(i.rto, 10),
    ofd: parseInt(i.ofd, 10),
    ndr: parseInt(i.ndr, 10),
    rtoRate: parseFloat(rtoRate),
    cancelledOrders: parseInt(s.cancelled_orders, 10),
  };
}

export async function getRevenueTrend(since: string, until: string): Promise<RevenueTrendRow[]> {
  // Match getKpis: tax-EXCLUSIVE Shopify Analytics gross sales, test orders excluded.
  return sequelize.query<RevenueTrendRow>(
    `SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS date,
            SUM(
              (COALESCE(subtotal, 0) + COALESCE(total_discounts, 0)) *
              CASE
                WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                  THEN (subtotal - total_tax) / subtotal
                ELSE 1.0
              END
            ) AS revenue,
            COUNT(*) AS orders
     FROM shopify_orders
     WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
       AND financial_status != 'voided'
       AND COALESCE(test, FALSE) = FALSE
     GROUP BY (created_at AT TIME ZONE 'Asia/Kolkata')::date ORDER BY date ASC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getMetaFunnel(since: string, until: string): Promise<MetaFunnelRow> {
  const rows = await sequelize.query<MetaFunnelRow>(
    `SELECT SUM(spend) AS spend, SUM(impressions) AS impressions, SUM(clicks) AS clicks,
            SUM(purchases) AS purchases, SUM(purchase_value) AS purchase_value,
            CASE WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend) ELSE 0 END AS roas
     FROM meta_daily_insights WHERE date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  return rows[0];
}

export async function getCampaigns(since: string, until: string): Promise<CampaignRow[]> {
  return sequelize.query<CampaignRow>(
    `SELECT campaign_id, campaign_name, objective,
            SUM(spend) AS spend, SUM(impressions) AS impressions, SUM(reach) AS reach,
            SUM(clicks) AS clicks, SUM(purchases) AS purchases,
            SUM(purchase_value) AS purchase_value,
            CASE WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend) ELSE 0 END AS roas
     FROM meta_daily_insights WHERE date BETWEEN :since AND :until
     GROUP BY campaign_id, campaign_name, objective ORDER BY spend DESC LIMIT 20`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getTopProducts(since: string, until: string): Promise<TopProductRow[]> {
  return sequelize.query<TopProductRow>(
    `SELECT li.product_id, li.title,
            SUM(li.quantity * li.unit_price) AS revenue,
            SUM(li.quantity) AS units_sold,
            COUNT(DISTINCT o.order_id) AS orders
     FROM shopify_order_lineitems li
     JOIN shopify_orders o ON o.order_id = li.order_id
     WHERE (o.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
       AND o.financial_status != 'voided'
     GROUP BY li.product_id, li.title ORDER BY revenue DESC LIMIT 5`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getLogistics(since: string, until: string): Promise<LogisticsRow[]> {
  return sequelize.query<LogisticsRow>(
    `SELECT
       CASE
         WHEN current_status_code = 'DL' THEN 'Delivered'
         WHEN current_status_code LIKE 'RT%' THEN 'RTO'
         WHEN current_status_code = 'UD' AND current_status ILIKE '%Out For Delivery%' THEN 'Out For Delivery'
         WHEN current_status ILIKE '%Undelivered%' THEN 'NDR'
         ELSE 'In Transit'
       END AS current_status,
       CASE
         WHEN current_status_code = 'DL' THEN 'delivered'
         WHEN current_status_code LIKE 'RT%' THEN 'rto'
         WHEN current_status_code = 'UD' AND current_status ILIKE '%Out For Delivery%' THEN 'out_for_delivery'
         WHEN current_status ILIKE '%Undelivered%' THEN 'ndr'
         ELSE 'in_transit'
       END AS current_status_code,
       COUNT(*) AS count
     FROM ithink_shipments
     WHERE order_date BETWEEN :since AND :until
     GROUP BY 1, 2
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getAbandonedCarts(
  since: string,
  until: string,
): Promise<AbandonedCartsRow> {
  const rows = await sequelize.query<AbandonedCartsRow>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(cart_value), 0) AS total_value,
            COALESCE(AVG(cart_value), 0) AS avg_value
     FROM shopify_abandoned_checkouts
     WHERE recovered = FALSE
       AND created_at BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  return rows[0];
}

export async function getReviewsSummary(since: string, until: string): Promise<ReviewsSummaryRow> {
  const rows = await sequelize.query<ReviewsSummaryRow>(
    `SELECT
      ROUND(AVG(rating)::numeric, 2) AS store_rating,
      COUNT(*) AS total_reviews,
      COUNT(*) FILTER (WHERE rating = 5) AS five_star,
      COUNT(*) FILTER (WHERE rating = 4) AS four_star,
      COUNT(*) FILTER (WHERE rating = 3) AS three_star,
      COUNT(*) FILTER (WHERE rating = 2) AS two_star,
      COUNT(*) FILTER (WHERE rating = 1) AS one_star,
      COUNT(*) FILTER (WHERE has_photos = TRUE) AS with_photos,
      COUNT(*) FILTER (WHERE verified = TRUE) AS verified_count
     FROM judgeme_reviews WHERE published = TRUE AND created_at BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  return rows[0];
}

export async function getReviewsTrend(since: string, until: string): Promise<ReviewsTrendRow[]> {
  return sequelize.query<ReviewsTrendRow>(
    `SELECT created_at AS date, COUNT(*) AS review_count, ROUND(AVG(rating)::numeric, 2) AS avg_rating
     FROM judgeme_reviews WHERE published = TRUE AND created_at BETWEEN :since AND :until
     GROUP BY created_at ORDER BY date ASC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getTopRatedProducts(
  since: string,
  until: string,
): Promise<TopRatedProductRow[]> {
  return sequelize.query<TopRatedProductRow>(
    `SELECT p.product_id, p.handle, p.title,
            ROUND(AVG(r.rating)::numeric, 2) AS average_rating,
            COUNT(r.review_id) AS reviews_count
     FROM judgeme_products p
     JOIN judgeme_reviews r ON r.product_id::text = p.external_id
     WHERE r.published = TRUE AND r.created_at BETWEEN :since AND :until
     GROUP BY p.product_id, p.handle, p.title
     HAVING COUNT(r.review_id) > 0
     ORDER BY average_rating DESC, COUNT(r.review_id) DESC LIMIT 20`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getRecentReviews(since: string, until: string): Promise<RecentReviewRow[]> {
  return sequelize.query<RecentReviewRow>(
    `SELECT r.review_id, r.rating, r.title, r.body, r.reviewer_name,
            r.created_at, r.has_photos, r.verified, r.picture_urls,
            (SELECT p.title FROM judgeme_products p
             WHERE p.external_id = r.product_id::text LIMIT 1) AS product_title
     FROM judgeme_reviews r WHERE r.published = TRUE AND r.created_at BETWEEN :since AND :until
     ORDER BY r.created_at DESC LIMIT 50`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getAllReviews(
  page: number,
  limit: number,
  rating: number,
  search: string,
): Promise<AllReviewsResult> {
  const offset = (page - 1) * limit;
  const conditions: string[] = ['r.published = TRUE'];
  const replacements: Record<string, string | number> = { limit, offset };

  if (rating >= 1 && rating <= 5) {
    conditions.push('r.rating = :rating');
    replacements.rating = rating;
  }
  if (search) {
    conditions.push(
      '(r.title ILIKE :search OR r.body ILIKE :search OR r.reviewer_name ILIKE :search)',
    );
    replacements.search = `%${search}%`;
  }

  const where = conditions.join(' AND ');

  const [reviews, countRows] = await Promise.all([
    sequelize.query<RecentReviewRow>(
      `SELECT r.review_id, r.rating, r.title, r.body, r.reviewer_name,
              r.created_at, r.has_photos, r.verified, r.picture_urls,
              (SELECT p.title FROM judgeme_products p
               WHERE p.external_id = r.product_id::text LIMIT 1) AS product_title
       FROM judgeme_reviews r WHERE ${where} ORDER BY r.created_at DESC LIMIT :limit OFFSET :offset`,
      { type: QueryTypes.SELECT, replacements },
    ),
    sequelize.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM judgeme_reviews r WHERE ${where}`,
      { type: QueryTypes.SELECT, replacements },
    ),
  ]);

  return { reviews, total: parseInt(countRows[0].total, 10), page, limit };
}

export async function getRecentOrders(): Promise<RecentOrderRow[]> {
  // `revenue` mirrors Shopify's `totalPriceSet` — the customer-facing total
  // (subtotal − discount, tax included for Indian stores). This matches what
  // the merchant sees on Shopify's order detail page (e.g. ₹3,113.10 for an
  // order with subtotal ₹3,459, SHAYN10% discount and IGST included).
  return sequelize.query<RecentOrderRow>(
    `SELECT
       o.order_id,
       o.order_name,
       o.revenue,
       COALESCE(
         NULLIF(o.financial_status, ''),
         CASE
           WHEN o.payment_mode = 'Prepaid' THEN 'PAID'
           WHEN o.payment_mode = 'COD' THEN 'PENDING'
           ELSE 'N/A'
         END
       ) AS financial_status,
       COALESCE(NULLIF(o.fulfillment_status, ''), 'UNFULFILLED') AS fulfillment_status,
       o.customer_city,
       o.created_at,
       ARRAY_REMOVE(ARRAY_AGG(DISTINCT li.title), NULL) AS products
     FROM shopify_orders o
     LEFT JOIN shopify_order_lineitems li ON li.order_id = o.order_id
     WHERE o.financial_status != 'voided'
     GROUP BY
       o.order_id,
       o.order_name,
       o.revenue,
       o.financial_status,
       o.fulfillment_status,
       o.customer_city,
       o.created_at
     ORDER BY o.created_at DESC
     LIMIT 5`,
    { type: QueryTypes.SELECT },
  );
}

export async function getRevenueVsSpend(
  since: string,
  until: string,
): Promise<RevenueVsSpendRow[]> {
  return sequelize.query<RevenueVsSpendRow>(
    `SELECT d.date::text,
            COALESCE(o.revenue, '0') AS revenue,
            COALESCE(m.ad_spend, '0') AS ad_spend
     FROM generate_series(:since::date, :until::date, '1 day'::interval) AS d(date)
     LEFT JOIN (
       SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS date,
              SUM(revenue)::text AS revenue
       FROM shopify_orders
       WHERE financial_status != 'voided'
       GROUP BY (created_at AT TIME ZONE 'Asia/Kolkata')::date
     ) o ON o.date = d.date
     LEFT JOIN (
       SELECT date, SUM(spend)::text AS ad_spend
       FROM meta_daily_insights
       GROUP BY date
     ) m ON m.date = d.date
     ORDER BY d.date ASC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}
