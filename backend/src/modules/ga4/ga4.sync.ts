import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ConnectorHealth } from '@db/models';
import { logger } from '@logger/logger';
import {
  getTrafficOverview,
  getTrafficByChannel,
  getEcommercePerformance,
  getTopProducts,
  getTopPagesScreens,
  getRealtimeUsers,
  formatGA4Date,
  type GA4Response,
} from './ga4.connector';

function rows(resp: GA4Response) {
  return resp.rows ?? [];
}

async function upsertTraffic(resp: GA4Response): Promise<number> {
  let count = 0;
  for (const r of rows(resp)) {
    await sequelize.query(
      `INSERT INTO ga4_traffic_daily
         (date, sessions, active_users, new_users, page_views, bounce_rate, avg_session_duration, synced_at)
       VALUES (:date, :sessions, :activeUsers, :newUsers, :pageViews, :bounceRate, :avgSession, NOW())
       ON CONFLICT (date) DO UPDATE SET
         sessions = EXCLUDED.sessions,
         active_users = EXCLUDED.active_users,
         new_users = EXCLUDED.new_users,
         page_views = EXCLUDED.page_views,
         bounce_rate = EXCLUDED.bounce_rate,
         avg_session_duration = EXCLUDED.avg_session_duration,
         synced_at = NOW()`,
      {
        type: QueryTypes.INSERT,
        replacements: {
          date: formatGA4Date(r.dimensionValues[0].value),
          sessions: parseInt(r.metricValues[0].value, 10),
          activeUsers: parseInt(r.metricValues[1].value, 10),
          newUsers: parseInt(r.metricValues[2].value, 10),
          pageViews: parseInt(r.metricValues[3].value, 10),
          bounceRate: parseFloat(r.metricValues[4].value),
          avgSession: parseFloat(r.metricValues[5].value),
        },
      },
    );
    count++;
  }
  return count;
}

async function upsertChannels(resp: GA4Response): Promise<number> {
  let count = 0;
  for (const r of rows(resp)) {
    await sequelize.query(
      `INSERT INTO ga4_traffic_channels
         (date, channel, sessions, active_users, purchase_revenue, conversions, conversion_rate, synced_at)
       VALUES (:date, :channel, :sessions, :activeUsers, :revenue, :conversions, :convRate, NOW())
       ON CONFLICT (date, channel) DO UPDATE SET
         sessions = EXCLUDED.sessions,
         active_users = EXCLUDED.active_users,
         purchase_revenue = EXCLUDED.purchase_revenue,
         conversions = EXCLUDED.conversions,
         conversion_rate = EXCLUDED.conversion_rate,
         synced_at = NOW()`,
      {
        type: QueryTypes.INSERT,
        replacements: {
          date: formatGA4Date(r.dimensionValues[0].value),
          channel: r.dimensionValues[1].value,
          sessions: parseInt(r.metricValues[0].value, 10),
          activeUsers: parseInt(r.metricValues[1].value, 10),
          revenue: parseFloat(r.metricValues[2].value),
          conversions: parseInt(r.metricValues[3].value, 10),
          convRate: parseFloat(r.metricValues[4].value),
        },
      },
    );
    count++;
  }
  return count;
}

async function upsertEcommerce(resp: GA4Response): Promise<number> {
  let count = 0;
  for (const r of rows(resp)) {
    await sequelize.query(
      `INSERT INTO ga4_ecommerce_daily
         (date, purchase_revenue, transactions, avg_purchase_revenue,
          ecommerce_purchases, checkouts, conversion_rate, synced_at)
       VALUES (:date, :revenue, :transactions, :avgRev, :purchases, :checkouts, :convRate, NOW())
       ON CONFLICT (date) DO UPDATE SET
         purchase_revenue = EXCLUDED.purchase_revenue,
         transactions = EXCLUDED.transactions,
         avg_purchase_revenue = EXCLUDED.avg_purchase_revenue,
         ecommerce_purchases = EXCLUDED.ecommerce_purchases,
         checkouts = EXCLUDED.checkouts,
         conversion_rate = EXCLUDED.conversion_rate,
         synced_at = NOW()`,
      {
        type: QueryTypes.INSERT,
        replacements: {
          date: formatGA4Date(r.dimensionValues[0].value),
          revenue: parseFloat(r.metricValues[0].value),
          transactions: parseInt(r.metricValues[1].value, 10),
          avgRev: parseFloat(r.metricValues[2].value),
          purchases: parseInt(r.metricValues[3].value, 10),
          checkouts: parseInt(r.metricValues[4].value, 10),
          convRate: parseFloat(r.metricValues[5].value),
        },
      },
    );
    count++;
  }
  return count;
}

async function upsertProducts(resp: GA4Response, snapshotDate: string): Promise<number> {
  let count = 0;
  for (const r of rows(resp)) {
    await sequelize.query(
      `INSERT INTO ga4_top_products
         (date, item_name, items_viewed, items_added_to_cart, items_purchased, purchase_revenue, synced_at)
       VALUES (:date, :itemName, :viewed, :added, :purchased, :revenue, NOW())
       ON CONFLICT (date, item_name) DO UPDATE SET
         items_viewed = EXCLUDED.items_viewed,
         items_added_to_cart = EXCLUDED.items_added_to_cart,
         items_purchased = EXCLUDED.items_purchased,
         purchase_revenue = EXCLUDED.purchase_revenue,
         synced_at = NOW()`,
      {
        type: QueryTypes.INSERT,
        replacements: {
          date: snapshotDate,
          itemName: r.dimensionValues[0].value,
          viewed: parseInt(r.metricValues[0].value, 10),
          added: parseInt(r.metricValues[1].value, 10),
          purchased: parseInt(r.metricValues[2].value, 10),
          revenue: parseFloat(r.metricValues[3].value),
        },
      },
    );
    count++;
  }
  return count;
}

async function upsertPagesScreens(resp: GA4Response): Promise<number> {
  let count = 0;
  for (const r of rows(resp)) {
    const activeUsers = parseInt(r.metricValues[1].value, 10);
    const engagementDuration = parseFloat(r.metricValues[4].value);
    const avgEngagementPerUser = activeUsers > 0 ? engagementDuration / activeUsers : 0;
    await sequelize.query(
      `INSERT INTO ga4_pages_screens
         (date, page_title, screen_page_views, active_users, event_count, bounce_rate, avg_engagement_time_per_active_user, synced_at)
       VALUES (:date, :pageTitle, :views, :activeUsers, :eventCount, :bounceRate, :avgEngagementPerUser, NOW())
       ON CONFLICT (date, page_title) DO UPDATE SET
         screen_page_views = EXCLUDED.screen_page_views,
         active_users = EXCLUDED.active_users,
         event_count = EXCLUDED.event_count,
         bounce_rate = EXCLUDED.bounce_rate,
         avg_engagement_time_per_active_user = EXCLUDED.avg_engagement_time_per_active_user,
         synced_at = NOW()`,
      {
        type: QueryTypes.INSERT,
        replacements: {
          date: formatGA4Date(r.dimensionValues[0].value),
          pageTitle: r.dimensionValues[1].value || '(not set)',
          views: parseInt(r.metricValues[0].value, 10),
          activeUsers,
          eventCount: parseInt(r.metricValues[2].value, 10),
          bounceRate: parseFloat(r.metricValues[3].value),
          avgEngagementPerUser,
        },
      },
    );
    count++;
  }
  return count;
}

async function runStep<T>(
  name: string,
  fn: () => Promise<T>,
  upsert: (v: T) => Promise<number>,
): Promise<{ name: string; count: number; error?: string }> {
  try {
    const data = await fn();
    const count = await upsert(data);
    logger.info(`[GA4] ${name}: ${count} rows`);
    return { name, count };
  } catch (err) {
    const msg = (err as Error).message;
    logger.error(`[GA4] ${name} failed: ${msg}`);
    return { name, count: 0, error: msg };
  }
}

export async function syncGA4Data(
  startDate = '30daysAgo',
  endDate = 'yesterday',
): Promise<void> {
  // Snapshot date for products (period-aggregated, no date dimension in GA4 report)
  const snapshotDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const results = [
    await runStep('traffic',   () => getTrafficOverview(startDate, endDate),     upsertTraffic),
    await runStep('channels',  () => getTrafficByChannel(startDate, endDate),    upsertChannels),
    await runStep('ecommerce', () => getEcommercePerformance(startDate, endDate), upsertEcommerce),
    await runStep('products',  () => getTopProducts(startDate, endDate),          (v) => upsertProducts(v, snapshotDate)),
    await runStep('pages-screens', () => getTopPagesScreens(startDate, endDate),  upsertPagesScreens),
  ];

  const total  = results.reduce((a, r) => a + r.count, 0);
  const errors = results.filter((r) => r.error);

  if (errors.length === results.length) {
    await ConnectorHealth.update(
      { status: 'red', error_message: errors.map((e) => `${e.name}: ${e.error}`).join('; ') },
      { where: { connector_name: 'ga4' } },
    );
  } else {
    await ConnectorHealth.update(
      {
        last_sync_at: new Date(),
        status: errors.length ? 'yellow' : 'green',
        records_synced: total,
        error_message: errors.length ? errors.map((e) => `${e.name}: ${e.error}`).join('; ') : undefined,
      },
      { where: { connector_name: 'ga4' } },
    );
  }

  logger.info(`[GA4] Sync finished: ${total} rows, ${errors.length} errors`);
}

export async function syncGA4Realtime(): Promise<void> {
  try {
    const resp = await getRealtimeUsers();
    await sequelize.query('DELETE FROM ga4_realtime', { type: QueryTypes.DELETE });

    for (const r of rows(resp)) {
      await sequelize.query(
        `INSERT INTO ga4_realtime (country, device_category, active_users, updated_at)
         VALUES (:country, :device, :users, NOW())`,
        {
          type: QueryTypes.INSERT,
          replacements: {
            country: r.dimensionValues[0].value || 'Unknown',
            device: r.dimensionValues[1].value || 'Unknown',
            users: parseInt(r.metricValues[0].value, 10),
          },
        },
      );
    }
  } catch (err) {
    logger.error(`[GA4] Realtime sync error: ${(err as Error).message}`);
  }
}
