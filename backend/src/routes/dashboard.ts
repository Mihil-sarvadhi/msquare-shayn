import { Router, Request, Response } from 'express';
import db from '../config/database';
import { resolveDateRange } from '@utils/resolveDateRange';
import type { DateRangeQuery } from '@utils/resolveDateRange';

const router = Router();

function getDateRange(req: Request): { since: string; until: string } {
  return resolveDateRange(req.query as DateRangeQuery);
}

router.get('/kpis', async (req: Request, res: Response) => {
  const { since, until } = getDateRange(req);
  try {
    const [shopifyKPIs, metaKPIs, ithinkKPIs] = await Promise.all([
      db.query(
        `SELECT
          COALESCE(SUM(revenue), 0) AS total_revenue,
          COUNT(*) AS total_orders,
          COALESCE(AVG(revenue), 0) AS aov,
          COUNT(DISTINCT customer_id) AS unique_customers,
          SUM(CASE WHEN payment_mode = 'COD' THEN 1 ELSE 0 END) AS cod_orders,
          SUM(CASE WHEN payment_mode = 'Prepaid' THEN 1 ELSE 0 END) AS prepaid_orders
        FROM shopify_orders
        WHERE created_at::date BETWEEN $1 AND $2
          AND financial_status != 'voided'`,
        [since, until],
      ),
      db.query(
        `SELECT
          COALESCE(SUM(spend), 0) AS total_spend,
          COALESCE(SUM(impressions), 0) AS total_impressions,
          COALESCE(SUM(clicks), 0) AS total_clicks,
          COALESCE(SUM(purchases), 0) AS total_purchases,
          COALESCE(SUM(purchase_value), 0) AS total_purchase_value,
          CASE WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend) ELSE 0 END AS roas
        FROM meta_daily_insights
        WHERE date BETWEEN $1 AND $2`,
        [since, until],
      ),
      db.query(
        `SELECT
          COUNT(*) AS total_shipments,
          SUM(CASE WHEN current_status_code = 'DL' THEN 1 ELSE 0 END) AS delivered,
          SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END) AS rto,
          SUM(CASE WHEN current_status_code = 'UD' AND current_status LIKE '%Out For Delivery%' THEN 1 ELSE 0 END) AS ofd,
          SUM(CASE WHEN current_status = 'Undelivered' THEN 1 ELSE 0 END) AS ndr
        FROM ithink_shipments
        WHERE order_date BETWEEN $1 AND $2`,
        [since, until],
      ),
    ]);

    const s = shopifyKPIs.rows[0];
    const m = metaKPIs.rows[0];
    const i = ithinkKPIs.rows[0];
    const rtoRate =
      parseInt(i.total_shipments, 10) > 0
        ? ((parseInt(i.rto, 10) / parseInt(i.total_shipments, 10)) * 100).toFixed(1)
        : '0';

    res.json({
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
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/revenue-trend', async (req: Request, res: Response) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(
      `SELECT
        created_at::date AS date,
        SUM(revenue) AS revenue,
        COUNT(*) AS orders
       FROM shopify_orders
       WHERE created_at::date BETWEEN $1 AND $2
         AND financial_status != 'voided'
       GROUP BY created_at::date
       ORDER BY date ASC`,
      [since, until],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/meta-funnel', async (req: Request, res: Response) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(
      `SELECT
        SUM(spend) AS spend,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(purchases) AS purchases,
        SUM(purchase_value) AS purchase_value,
        CASE WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend) ELSE 0 END AS roas
       FROM meta_daily_insights
       WHERE date BETWEEN $1 AND $2`,
      [since, until],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/campaigns', async (req: Request, res: Response) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(
      `SELECT
        campaign_id, campaign_name, objective,
        SUM(spend) AS spend,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(purchases) AS purchases,
        SUM(purchase_value) AS purchase_value,
        CASE WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend) ELSE 0 END AS roas
       FROM meta_daily_insights
       WHERE date BETWEEN $1 AND $2
       GROUP BY campaign_id, campaign_name, objective
       ORDER BY spend DESC
       LIMIT 20`,
      [since, until],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/top-products', async (req: Request, res: Response) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(
      `SELECT
        li.product_id,
        li.title,
        SUM(li.quantity * li.unit_price) AS revenue,
        SUM(li.quantity) AS units_sold,
        COUNT(DISTINCT o.order_id) AS orders
       FROM shopify_order_lineitems li
       JOIN shopify_orders o ON o.order_id = li.order_id
       WHERE o.created_at::date BETWEEN $1 AND $2
         AND o.financial_status != 'voided'
       GROUP BY li.product_id, li.title
       ORDER BY revenue DESC
       LIMIT 5`,
      [since, until],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/logistics', async (req: Request, res: Response) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(
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
       WHERE order_date BETWEEN $1 AND $2
       GROUP BY 1, 2
       ORDER BY count DESC`,
      [since, until],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/abandoned-carts', async (req: Request, res: Response) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(
      `SELECT
        COUNT(*) AS count,
        COALESCE(SUM(cart_value), 0) AS total_value,
        COALESCE(AVG(cart_value), 0) AS avg_value
       FROM shopify_abandoned_checkouts
       WHERE created_at::date BETWEEN $1 AND $2
         AND recovered = FALSE`,
      [since, until],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Judge.me routes
router.get('/reviews-summary', async (_req: Request, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT
        (SELECT COALESCE(average_rating, 0) FROM judgeme_store_summary ORDER BY synced_at DESC LIMIT 1) AS store_rating,
        (SELECT COALESCE(total_reviews, 0) FROM judgeme_store_summary ORDER BY synced_at DESC LIMIT 1) AS total_reviews,
        COUNT(*) FILTER (WHERE rating = 5) AS five_star,
        COUNT(*) FILTER (WHERE rating = 4) AS four_star,
        COUNT(*) FILTER (WHERE rating = 3) AS three_star,
        COUNT(*) FILTER (WHERE rating = 2) AS two_star,
        COUNT(*) FILTER (WHERE rating = 1) AS one_star,
        COUNT(*) FILTER (WHERE has_photos = TRUE) AS with_photos,
        COUNT(*) FILTER (WHERE verified = TRUE) AS verified_count
       FROM judgeme_reviews
       WHERE published = TRUE`,
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/reviews-trend', async (req: Request, res: Response) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(
      `SELECT
        created_at AS date,
        COUNT(*) AS review_count,
        ROUND(AVG(rating)::numeric, 2) AS avg_rating
       FROM judgeme_reviews
       WHERE published = TRUE
         AND created_at BETWEEN $1 AND $2
       GROUP BY created_at
       ORDER BY date ASC`,
      [since, until],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/top-rated-products', async (_req: Request, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT
        p.product_id, p.handle, p.title,
        ROUND(AVG(r.rating)::numeric, 2) AS average_rating,
        COUNT(r.review_id) AS reviews_count
       FROM judgeme_products p
       JOIN judgeme_reviews r ON r.product_id::text = p.external_id
       WHERE r.published = TRUE
       GROUP BY p.product_id, p.handle, p.title
       HAVING COUNT(r.review_id) > 0
       ORDER BY average_rating DESC, COUNT(r.review_id) DESC
       LIMIT 5`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/recent-reviews', async (req: Request, res: Response) => {
  const { since, until } = getDateRange(req);
  const limitParam = parseInt((req.query.limit as string) || '50', 10);
  const limit = Math.min(Math.max(1, limitParam), 1000);
  try {
    const { rows } = await db.query(
      `SELECT
        r.review_id, r.rating, r.title, r.body, r.reviewer_name,
        r.created_at, r.has_photos, r.verified, r.picture_urls,
        (SELECT p.title FROM judgeme_products p
         WHERE p.external_id = r.product_id::text
         LIMIT 1) AS product_title
       FROM judgeme_reviews r
       WHERE r.published = TRUE
         AND r.created_at BETWEEN $1 AND $2
       ORDER BY r.created_at DESC
       LIMIT $3`,
      [since, until, limit],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/all-reviews', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  const rating = parseInt((req.query.rating as string) || '0', 10);
  const search = ((req.query.search as string) || '').trim();
  const offset = (page - 1) * limit;

  const conditions: string[] = ['r.published = TRUE'];
  const params: (string | number)[] = [];
  let idx = 1;

  if (rating >= 1 && rating <= 5) {
    conditions.push(`r.rating = $${idx++}`);
    params.push(rating);
  }
  if (search) {
    conditions.push(
      `(r.title ILIKE $${idx} OR r.body ILIKE $${idx} OR r.reviewer_name ILIKE $${idx})`,
    );
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');

  try {
    const [dataRes, countRes] = await Promise.all([
      db.query(
        `SELECT r.review_id, r.rating, r.title, r.body, r.reviewer_name,
                r.created_at, r.has_photos, r.verified, r.picture_urls,
                (SELECT p.title FROM judgeme_products p
                 WHERE p.external_id = r.product_external_id OR p.handle = r.product_handle
                 LIMIT 1) AS product_title
         FROM judgeme_reviews r
         WHERE ${where}
         ORDER BY r.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
      db.query(`SELECT COUNT(*) AS total FROM judgeme_reviews r WHERE ${where}`, params),
    ]);
    res.json({ reviews: dataRes.rows, total: parseInt(countRes.rows[0].total, 10), page, limit });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
