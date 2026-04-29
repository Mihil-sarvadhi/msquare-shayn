import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import type {
  ChannelComparisonRow,
  ChannelSummaryRow,
  OrderStatusRow,
  RecentOrderRow,
  ReturnsRow,
  RevenueTrendRow,
  TopProductRow,
  UnicommerceFilters,
} from './unicommerce.types';

/**
 * All read endpoints share the same since/until/channel? filter shape.
 * Channel filter is optional — when omitted we return data for every channel.
 */

export async function getSummary(filters: UnicommerceFilters): Promise<ChannelSummaryRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<ChannelSummaryRow>(
    `SELECT
       COALESCE(channel, 'UNKNOWN') AS channel,
       COUNT(*)::int AS orders,
       COALESCE(SUM(total_price), 0)::float AS revenue,
       COALESCE(AVG(total_price), 0)::float AS aov,
       SUM(CASE WHEN cod = TRUE THEN 1 ELSE 0 END)::int AS cod_orders,
       SUM(CASE WHEN cod = FALSE THEN 1 ELSE 0 END)::int AS prepaid_orders,
       SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)::int AS cancelled,
       SUM(CASE WHEN status IN ('RETURN_REQUESTED','RETURNED','RETURN_EXPECTED') THEN 1 ELSE 0 END)::int AS returned
     FROM unicommerce_orders
     WHERE order_date::date BETWEEN :since AND :until
       AND (:channel::text IS NULL OR channel = :channel)
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
       cancelled_orders::int AS cancelled_orders,
       returned_orders::int AS returned_orders,
       cod_orders::int AS cod_orders,
       prepaid_orders::int AS prepaid_orders
     FROM unicommerce_channel_daily
     WHERE date BETWEEN :since AND :until
       AND (:channel::text IS NULL OR channel = :channel)
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
     WHERE o.order_date::date BETWEEN :since AND :until
       AND o.status != 'CANCELLED'
       AND (:channel::text IS NULL OR o.channel = :channel)
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
     WHERE order_date::date BETWEEN :since AND :until
       AND (:channel::text IS NULL OR channel = :channel)
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
       COALESCE(SUM(total_price), 0)::float AS revenue,
       COALESCE(AVG(total_price), 0)::float AS aov,
       SUM(CASE WHEN cod = TRUE THEN 1 ELSE 0 END)::int AS cod_orders,
       SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)::int AS cancelled
     FROM unicommerce_orders
     WHERE order_date::date BETWEEN :since AND :until
     GROUP BY COALESCE(channel, 'UNKNOWN')
     ORDER BY orders DESC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getReturns(filters: UnicommerceFilters): Promise<ReturnsRow[]> {
  const { since, until, channel } = filters;
  return sequelize.query<ReturnsRow>(
    `SELECT
       channel,
       return_reason,
       COUNT(*)::int AS count
     FROM unicommerce_returns
     WHERE created_date::date BETWEEN :since AND :until
       AND (:channel::text IS NULL OR channel = :channel)
     GROUP BY channel, return_reason
     ORDER BY count DESC`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null },
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
     WHERE order_date::date BETWEEN :since AND :until
       AND (:channel::text IS NULL OR channel = :channel)
     ORDER BY order_date DESC
     LIMIT 20`,
    {
      type: QueryTypes.SELECT,
      replacements: { since, until, channel: channel ?? null },
    },
  );
}
