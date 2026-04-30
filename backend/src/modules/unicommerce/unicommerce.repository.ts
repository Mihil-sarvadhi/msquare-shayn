import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import type {
  CategoryRow,
  ChannelComparisonRow,
  ChannelReturnsRow,
  ChannelSummaryRow,
  OrderStatusRow,
  ProductByChannelRow,
  RecentOrderRow,
  ReturnsRow,
  RevenueTrendRow,
  TodaySnapshot,
  TopProductRow,
  TopProductWithPctRow,
  UnicommerceFilters,
} from './unicommerce.types';

/**
 * All read endpoints share the same since/until/channel? filter shape.
 * Channel filter is optional — when omitted we return data for every channel.
 */

/**
 * Uniware stores channel codes with tenant suffixes (FLIPKART_SHAYN,
 * AMAZON_SHAYN, MYNTRAPPMP, etc.) while the frontend tabs send short names
 * (FLIPKART, AMAZON, …). Match via ILIKE so the tab filter works without
 * having to hard-code per-tenant variants. "Returned" counts orders whose
 * raw_response has any entry in its returns[] array — Uniware tracks
 * returns at line/package level, never on the parent order.status.
 */

const CHANNEL_FILTER_CLAUSE = `(:channel::text IS NULL OR channel ILIKE '%' || :channel || '%')`;

// Uniware's own reports exclude cancelled orders from revenue and AOV. We
// match that so the dashboard reconciles. Cancelled orders still contribute
// to total order count and to the "Cancelled Orders" KPI separately.
const REVENUE_FILTER_CLAUSE = `status IS DISTINCT FROM 'CANCELLED'`;

/**
 * Shayn's catalog uses 2-letter SKU prefixes for product type. Mapping was
 * verified against the actual `unicommerce_order_items` data:
 *   QM → Earring  (1149 items — earrings/studs/hoops/loops)
 *   QA → Ring     (590 items — rings & bands)
 *   QG → Necklace (355 items — chains & necklaces)
 *   QK → Bracelet (251 items)
 *   QC → Pendant  (152 items)
 *   QS → Necklace (96 items — mangalsutras)
 *   anything else → Other
 */
const SKU_CATEGORY_CASE = `
  CASE LEFT(i.sku, 2)
    WHEN 'QM' THEN 'Earring'
    WHEN 'QA' THEN 'Ring'
    WHEN 'QG' THEN 'Necklace'
    WHEN 'QS' THEN 'Necklace'
    WHEN 'QK' THEN 'Bracelet'
    WHEN 'QC' THEN 'Pendant'
    ELSE 'Other'
  END
`;

export async function getSummary(filters: UnicommerceFilters): Promise<ChannelSummaryRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<ChannelSummaryRow>(
    `SELECT
       COALESCE(channel, 'UNKNOWN') AS channel,
       COUNT(*)::int AS orders,
       COALESCE(SUM(CASE WHEN ${REVENUE_FILTER_CLAUSE} THEN total_price ELSE 0 END), 0)::float AS revenue,
       COALESCE(
         AVG(CASE WHEN ${REVENUE_FILTER_CLAUSE} THEN total_price END),
         0
       )::float AS aov,
       SUM(CASE WHEN cod = TRUE THEN 1 ELSE 0 END)::int AS cod_orders,
       SUM(CASE WHEN cod = FALSE THEN 1 ELSE 0 END)::int AS prepaid_orders,
       SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)::int AS cancelled,
       SUM(
         CASE WHEN raw_response IS NOT NULL
                AND jsonb_typeof(raw_response->'returns') = 'array'
                AND jsonb_array_length(raw_response->'returns') > 0
              THEN 1 ELSE 0 END
       )::int AS returned
     FROM unicommerce_orders
     WHERE (order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
       AND ${CHANNEL_FILTER_CLAUSE}
     GROUP BY COALESCE(channel, 'UNKNOWN')
     ORDER BY revenue DESC`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null },
    },
  );
}

export async function getRevenueTrend(filters: UnicommerceFilters): Promise<RevenueTrendRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<RevenueTrendRow>(
    `SELECT
       to_char(date, 'YYYY-MM-DD') AS date,
       channel,
       orders::int AS orders,
       revenue::float AS revenue,
       units_sold::int AS units_sold,
       cancelled_orders::int AS cancelled_orders,
       returned_orders::int AS returned_orders,
       cod_orders::int AS cod_orders,
       prepaid_orders::int AS prepaid_orders
     FROM unicommerce_channel_daily
     WHERE date BETWEEN :since AND :until
       AND ${CHANNEL_FILTER_CLAUSE}
     ORDER BY date ASC, channel ASC`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null },
    },
  );
}

export async function getTopProducts(filters: UnicommerceFilters): Promise<TopProductRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<TopProductRow>(
    `SELECT
       COALESCE(i.sku, 'UNKNOWN') AS sku,
       i.product_name,
       COALESCE(i.channel, o.channel) AS channel,
       SUM(i.quantity)::int AS units_sold,
       COALESCE(SUM(i.total_price), 0)::float AS revenue,
       COUNT(DISTINCT i.order_code)::int AS orders
     FROM unicommerce_order_items i
     JOIN unicommerce_orders o ON o.order_code = i.order_code
     WHERE (o.order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
       AND o.status != 'CANCELLED'
       AND (:channel::text IS NULL OR o.channel ILIKE '%' || :channel || '%')
     GROUP BY i.sku, i.product_name, COALESCE(i.channel, o.channel)
     ORDER BY revenue DESC
     LIMIT 10`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null },
    },
  );
}

export async function getOrderStatus(filters: UnicommerceFilters): Promise<OrderStatusRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<OrderStatusRow>(
    `SELECT
       COALESCE(status, 'UNKNOWN') AS status,
       COUNT(*)::int AS count,
       COALESCE(SUM(total_price), 0)::float AS revenue
     FROM unicommerce_orders
     WHERE (order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
       AND ${CHANNEL_FILTER_CLAUSE}
     GROUP BY COALESCE(status, 'UNKNOWN')
     ORDER BY count DESC`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null },
    },
  );
}

export async function getChannelComparison(
  filters: UnicommerceFilters,
): Promise<ChannelComparisonRow[]> {
  const { since, until } = filters;
  return sequelize.query<ChannelComparisonRow>(
    `SELECT
       COALESCE(channel, 'UNKNOWN') AS channel,
       COUNT(*)::int AS orders,
       COALESCE(SUM(CASE WHEN ${REVENUE_FILTER_CLAUSE} THEN total_price ELSE 0 END), 0)::float AS revenue,
       COALESCE(
         AVG(CASE WHEN ${REVENUE_FILTER_CLAUSE} THEN total_price END),
         0
       )::float AS aov,
       SUM(CASE WHEN cod = TRUE THEN 1 ELSE 0 END)::int AS cod_orders,
       SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)::int AS cancelled
     FROM unicommerce_orders
     WHERE (order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
     GROUP BY COALESCE(channel, 'UNKNOWN')
     ORDER BY orders DESC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

/**
 * Returns aren't a separate sync — they're embedded in each order's
 * raw_response under a `returns` array. Unnest that array, key by
 * channel + return type (the human-readable reason), then group.
 */
export async function getReturns(filters: UnicommerceFilters): Promise<ReturnsRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<ReturnsRow>(
    `SELECT
       o.channel,
       ret->>'type' AS return_reason,
       COUNT(*)::int AS count
     FROM unicommerce_orders o
     CROSS JOIN LATERAL jsonb_array_elements(
       CASE WHEN jsonb_typeof(o.raw_response->'returns') = 'array'
            THEN o.raw_response->'returns'
            ELSE '[]'::jsonb END
     ) AS ret
     WHERE (o.order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
       AND (:channel::text IS NULL OR o.channel ILIKE '%' || :channel || '%')
     GROUP BY o.channel, ret->>'type'
     ORDER BY count DESC`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null },
    },
  );
}

/** Category breakdown by SKU prefix, with % of total revenue. */
export async function getTopCategories(filters: UnicommerceFilters): Promise<CategoryRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<CategoryRow>(
    `WITH item_revenue AS (
       SELECT
         ${SKU_CATEGORY_CASE} AS category,
         i.order_code,
         i.total_price
       FROM unicommerce_order_items i
       JOIN unicommerce_orders o ON o.order_code = i.order_code
       WHERE (o.order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
         AND o.status IS DISTINCT FROM 'CANCELLED'
         AND (:channel::text IS NULL OR o.channel ILIKE '%' || :channel || '%')
     ),
     totals AS (
       SELECT COALESCE(SUM(total_price), 0)::float AS total_revenue FROM item_revenue
     )
     SELECT
       cr.category,
       COUNT(*)::int AS items,
       COUNT(DISTINCT cr.order_code)::int AS orders,
       COALESCE(SUM(cr.total_price), 0)::float AS revenue,
       CASE WHEN t.total_revenue > 0
            THEN ROUND((SUM(cr.total_price) / t.total_revenue * 100)::numeric, 2)::float
            ELSE 0
       END AS pct_of_total
     FROM item_revenue cr, totals t
     GROUP BY cr.category, t.total_revenue
     ORDER BY revenue DESC`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null },
    },
  );
}

/**
 * Top SKUs by total revenue with a per-channel revenue pivot. Returns up to
 * `limit` rows; defaults to 20.
 */
export async function getTopProductsByChannel(
  filters: UnicommerceFilters,
  limit = 20,
): Promise<ProductByChannelRow[]> {
  const { since, until } = filters;
  return sequelize.query<ProductByChannelRow>(
    `WITH item_rev AS (
       SELECT
         i.sku,
         i.product_name,
         COALESCE(i.channel, o.channel) AS channel,
         i.total_price
       FROM unicommerce_order_items i
       JOIN unicommerce_orders o ON o.order_code = i.order_code
       WHERE (o.order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
         AND o.status IS DISTINCT FROM 'CANCELLED'
         AND i.sku IS NOT NULL
     )
     SELECT
       sku,
       MAX(product_name) AS product_name,
       COALESCE(SUM(total_price), 0)::float AS total_revenue,
       COALESCE(SUM(CASE WHEN channel ILIKE '%SHOPIFY%'  THEN total_price ELSE 0 END), 0)::float AS shopify_revenue,
       COALESCE(SUM(CASE WHEN channel ILIKE '%AMAZON%'   THEN total_price ELSE 0 END), 0)::float AS amazon_revenue,
       COALESCE(SUM(CASE WHEN channel ILIKE '%FLIPKART%' THEN total_price ELSE 0 END), 0)::float AS flipkart_revenue,
       COALESCE(SUM(CASE WHEN channel ILIKE '%MYNTRA%'   THEN total_price ELSE 0 END), 0)::float AS myntra_revenue,
       COALESCE(SUM(CASE WHEN channel ILIKE '%ETERNZ%'   THEN total_price ELSE 0 END), 0)::float AS eternz_revenue,
       COALESCE(SUM(CASE WHEN channel NOT ILIKE '%SHOPIFY%'
                          AND channel NOT ILIKE '%AMAZON%'
                          AND channel NOT ILIKE '%FLIPKART%'
                          AND channel NOT ILIKE '%MYNTRA%'
                          AND channel NOT ILIKE '%ETERNZ%'
                         THEN total_price ELSE 0 END), 0)::float AS other_revenue
     FROM item_rev
     GROUP BY sku
     ORDER BY total_revenue DESC
     LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, limit },
    },
  );
}

/**
 * Per-channel sold-vs-returned units. Sold = items in non-cancelled orders.
 * Returned = sum of returnItems[] lengths across each order's returns[]
 * array (Uniware tracks returns embedded in the parent saleOrderDTO).
 */
export async function getChannelReturns(filters: UnicommerceFilters): Promise<ChannelReturnsRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<ChannelReturnsRow>(
    `WITH sold AS (
       SELECT
         COALESCE(o.channel, 'UNKNOWN') AS channel,
         COUNT(*)::int AS units_sold
       FROM unicommerce_orders o
       JOIN unicommerce_order_items i ON i.order_code = o.order_code
       WHERE (o.order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
         AND o.status IS DISTINCT FROM 'CANCELLED'
         AND ${CHANNEL_FILTER_CLAUSE}
       GROUP BY COALESCE(o.channel, 'UNKNOWN')
     ),
     returned AS (
       SELECT
         COALESCE(o.channel, 'UNKNOWN') AS channel,
         COALESCE(SUM(jsonb_array_length(ret->'returnItems')), 0)::int AS return_units
       FROM unicommerce_orders o
       CROSS JOIN LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(o.raw_response->'returns') = 'array'
              THEN o.raw_response->'returns'
              ELSE '[]'::jsonb END
       ) AS ret
       WHERE (o.order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
         AND jsonb_typeof(ret->'returnItems') = 'array'
         AND ${CHANNEL_FILTER_CLAUSE}
       GROUP BY COALESCE(o.channel, 'UNKNOWN')
     )
     SELECT
       s.channel,
       s.units_sold,
       COALESCE(r.return_units, 0)::int AS return_units,
       CASE WHEN s.units_sold > 0
            THEN ROUND((COALESCE(r.return_units, 0)::numeric / s.units_sold * 100)::numeric, 2)::float
            ELSE 0
       END AS return_pct
     FROM sold s
     LEFT JOIN returned r ON r.channel = s.channel
     ORDER BY s.units_sold DESC`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null },
    },
  );
}

/**
 * Today vs Yesterday snapshot — both bucketed in IST so the day boundaries
 * line up with Uniware's reports. Revenue excludes cancelled orders;
 * "order items" = count of rows in unicommerce_order_items linked to
 * non-cancelled orders.
 */
export async function getTodaySnapshot(): Promise<TodaySnapshot> {
  const rows = await sequelize.query<TodaySnapshot>(
    `WITH bounds AS (
       SELECT
         (NOW() AT TIME ZONE 'Asia/Kolkata')::date              AS today_date,
         ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - 1)        AS yesterday_date
     ),
     orders_in_window AS (
       SELECT
         o.order_code,
         (o.order_date AT TIME ZONE 'Asia/Kolkata')::date AS day,
         o.status,
         o.total_price
       FROM unicommerce_orders o
       JOIN bounds b ON TRUE
       WHERE (o.order_date AT TIME ZONE 'Asia/Kolkata')::date IN (b.today_date, b.yesterday_date)
     )
     SELECT
       to_char((SELECT today_date FROM bounds), 'YYYY-MM-DD')      AS today_date,
       to_char((SELECT yesterday_date FROM bounds), 'YYYY-MM-DD')  AS yesterday_date,
       COALESCE(SUM(CASE WHEN o.day = (SELECT today_date FROM bounds)
                          AND o.status IS DISTINCT FROM 'CANCELLED'
                         THEN o.total_price ELSE 0 END), 0)::float AS today_revenue,
       COALESCE(SUM(CASE WHEN o.day = (SELECT yesterday_date FROM bounds)
                          AND o.status IS DISTINCT FROM 'CANCELLED'
                         THEN o.total_price ELSE 0 END), 0)::float AS yesterday_revenue,
       COALESCE(
         (SELECT COUNT(*)::int FROM unicommerce_order_items i
            JOIN orders_in_window oi2 ON oi2.order_code = i.order_code
           WHERE oi2.day = (SELECT today_date FROM bounds)
             AND oi2.status IS DISTINCT FROM 'CANCELLED'),
         0
       ) AS today_order_items,
       COALESCE(
         (SELECT COUNT(*)::int FROM unicommerce_order_items i
            JOIN orders_in_window oi2 ON oi2.order_code = i.order_code
           WHERE oi2.day = (SELECT yesterday_date FROM bounds)
             AND oi2.status IS DISTINCT FROM 'CANCELLED'),
         0
       ) AS yesterday_order_items
     FROM orders_in_window o`,
    { type: QueryTypes.SELECT },
  );
  // The query always returns a row (no GROUP BY, aggregates over zero rows
  // give NULLs which COALESCE turns into 0). Defensive default for empty DB.
  return (
    rows[0] ?? {
      today_date: new Date().toISOString().slice(0, 10),
      yesterday_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      today_revenue: 0,
      yesterday_revenue: 0,
      today_order_items: 0,
      yesterday_order_items: 0,
    }
  );
}

/** Existing top-products with % of total added. Configurable limit. */
export async function getTopProductsWithPct(
  filters: UnicommerceFilters,
  limit = 20,
): Promise<TopProductWithPctRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<TopProductWithPctRow>(
    `WITH scoped AS (
       SELECT
         COALESCE(i.sku, 'UNKNOWN') AS sku,
         i.product_name,
         COALESCE(i.channel, o.channel) AS channel,
         i.quantity,
         i.total_price,
         i.order_code
       FROM unicommerce_order_items i
       JOIN unicommerce_orders o ON o.order_code = i.order_code
       WHERE (o.order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
         AND o.status IS DISTINCT FROM 'CANCELLED'
         AND (:channel::text IS NULL OR o.channel ILIKE '%' || :channel || '%')
     ),
     totals AS (
       SELECT COALESCE(SUM(total_price), 0)::float AS total_revenue FROM scoped
     )
     SELECT
       s.sku,
       MAX(s.product_name) AS product_name,
       MAX(s.channel) AS channel,
       SUM(s.quantity)::int AS units_sold,
       COALESCE(SUM(s.total_price), 0)::float AS revenue,
       COUNT(DISTINCT s.order_code)::int AS orders,
       CASE WHEN t.total_revenue > 0
            THEN ROUND((SUM(s.total_price) / t.total_revenue * 100)::numeric, 2)::float
            ELSE 0
       END AS pct_of_total
     FROM scoped s, totals t
     GROUP BY s.sku, t.total_revenue
     ORDER BY revenue DESC
     LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null, limit },
    },
  );
}

export async function getRecentOrders(filters: UnicommerceFilters): Promise<RecentOrderRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<RecentOrderRow>(
    `SELECT
       order_code,
       display_order_code,
       channel,
       status,
       to_char(order_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS order_date,
       total_price::float AS total_price,
       cod,
       customer_name,
       city,
       state
     FROM unicommerce_orders
     WHERE (order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN :since AND :until
       AND ${CHANNEL_FILTER_CLAUSE}
     ORDER BY order_date DESC
     LIMIT 20`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null },
    },
  );
}
