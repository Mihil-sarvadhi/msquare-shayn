import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';

export interface TrafficDailyRow {
  date: string; sessions: number; active_users: number; new_users: number;
  page_views: number; bounce_rate: string; avg_session_duration: string;
}
export interface ChannelRow {
  channel: string; sessions: string; active_users: string;
  purchase_revenue: string; conversions: string; conversion_rate: string;
}
export interface EcommerceDailyRow {
  date: string; purchase_revenue: string; transactions: number;
  avg_purchase_revenue: string; ecommerce_purchases: number; checkouts: number;
  conversion_rate: string;
}
export interface ProductRow {
  item_name: string; items_viewed: string; items_added_to_cart: string;
  items_purchased: string; purchase_revenue: string;
}
export interface RealtimeRow {
  country: string; device_category: string; active_users: number; updated_at: string;
}
export interface CountryActiveUsersRow {
  country: string;
  active_users: string;
  updated_at: string;
}
export interface SummaryRow {
  total_sessions: string; total_users: string; total_new_users: string;
  total_page_views: string; avg_session_duration: string;
}
export interface PagesScreensRow {
  page_title: string;
  screen_page_views: string;
  active_users: string;
  views_per_active_user: string;
  avg_engagement_time_per_active_user: string;
  event_count: string;
  bounce_rate: string;
}

export function getTrafficDaily(since: string, until: string): Promise<TrafficDailyRow[]> {
  return sequelize.query<TrafficDailyRow>(
    `SELECT date::text, sessions, active_users, new_users, page_views, bounce_rate, avg_session_duration
     FROM ga4_traffic_daily
     WHERE date BETWEEN :since AND :until
     ORDER BY date ASC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export function getChannels(since: string, until: string): Promise<ChannelRow[]> {
  return sequelize.query<ChannelRow>(
    `SELECT channel,
       SUM(sessions) AS sessions,
       SUM(active_users) AS active_users,
       SUM(purchase_revenue) AS purchase_revenue,
       SUM(conversions) AS conversions,
       AVG(conversion_rate) AS conversion_rate
     FROM ga4_traffic_channels
     WHERE date BETWEEN :since AND :until
     GROUP BY channel
     ORDER BY SUM(sessions) DESC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export function getEcommerceDaily(since: string, until: string): Promise<EcommerceDailyRow[]> {
  return sequelize.query<EcommerceDailyRow>(
    `SELECT date::text, purchase_revenue, transactions, avg_purchase_revenue,
            ecommerce_purchases, checkouts, conversion_rate
     FROM ga4_ecommerce_daily
     WHERE date BETWEEN :since AND :until
     ORDER BY date ASC`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export function getProducts(since: string, until: string): Promise<ProductRow[]> {
  return sequelize.query<ProductRow>(
    `SELECT item_name,
       SUM(items_viewed) AS items_viewed,
       SUM(items_added_to_cart) AS items_added_to_cart,
       SUM(items_purchased) AS items_purchased,
       SUM(purchase_revenue) AS purchase_revenue
     FROM ga4_top_products
     WHERE date BETWEEN :since AND :until
     GROUP BY item_name
     ORDER BY SUM(purchase_revenue) DESC
     LIMIT 10`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export function getRealtime(): Promise<RealtimeRow[]> {
  return sequelize.query<RealtimeRow>(
    `SELECT country, device_category, active_users, updated_at::text
     FROM ga4_realtime
     ORDER BY active_users DESC`,
    { type: QueryTypes.SELECT },
  );
}

export function getCountryActiveUsersFromRealtime(): Promise<CountryActiveUsersRow[]> {
  return sequelize.query<CountryActiveUsersRow>(
    `SELECT country,
       SUM(active_users) AS active_users,
       MAX(updated_at)::text AS updated_at
     FROM ga4_realtime
     WHERE country IS NOT NULL
       AND country <> ''
       AND LOWER(country) NOT IN ('unknown', '(not set)', 'not set')
     GROUP BY country
     ORDER BY SUM(active_users) DESC
     LIMIT 20`,
    { type: QueryTypes.SELECT },
  );
}

export function getPagesScreens(since: string, until: string): Promise<PagesScreensRow[]> {
  return sequelize.query<PagesScreensRow>(
    `SELECT page_title,
       SUM(screen_page_views) AS screen_page_views,
       SUM(active_users) AS active_users,
       CASE
         WHEN SUM(active_users) > 0
           THEN ROUND(SUM(screen_page_views)::numeric / SUM(active_users)::numeric, 2)
         ELSE 0
       END AS views_per_active_user,
       AVG(avg_engagement_time_per_active_user) AS avg_engagement_time_per_active_user,
       SUM(event_count) AS event_count,
       AVG(bounce_rate) AS bounce_rate
     FROM ga4_pages_screens
     WHERE date BETWEEN :since AND :until
       AND page_title IS NOT NULL
       AND page_title <> ''
       AND LOWER(page_title) NOT IN ('(not set)', 'unknown')
     GROUP BY page_title
     ORDER BY SUM(screen_page_views) DESC
     LIMIT 10`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
}

export async function getSummary(since: string, until: string): Promise<SummaryRow> {
  const [row] = await sequelize.query<SummaryRow>(
    `SELECT
       COALESCE(SUM(sessions), 0)         AS total_sessions,
       COALESCE(SUM(active_users), 0)     AS total_users,
       COALESCE(SUM(new_users), 0)        AS total_new_users,
       COALESCE(SUM(page_views), 0)       AS total_page_views,
       COALESCE(AVG(avg_session_duration), 0) AS avg_session_duration
     FROM ga4_traffic_daily
     WHERE date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );
  return row;
}
