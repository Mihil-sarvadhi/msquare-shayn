import { resolveDateRange } from '@utils/resolveDateRange';
import type { DateRange } from '@utils/resolveDateRange';
import * as repo from './ga4.repository';
import { getPeriodTotals } from './ga4.connector';

export { resolveDateRange };
export type { DateRange };

export const getTrafficDaily   = (since: string, until: string) => repo.getTrafficDaily(since, until);
export const getChannels       = (since: string, until: string) => repo.getChannels(since, until);
export const getEcommerceDaily = (since: string, until: string) => repo.getEcommerceDaily(since, until);
export const getProducts       = (since: string, until: string) => repo.getProducts(since, until);
export const getDevices        = (since: string, until: string) => repo.getDevices(since, until);
export const getGeography      = (since: string, until: string) => repo.getGeography(since, until);
export const getRealtime       = () => repo.getRealtime();

/**
 * Live summary from GA4 API — returns unique deduplicated user/session counts that match GA4's UI.
 * Falls back to DB aggregates (sum of daily rows) if GA4 is unreachable.
 */
export async function getSummary(since: string, until: string) {
  try {
    const resp = await getPeriodTotals(since, until);
    const row = resp.rows?.[0];
    if (row) {
      return {
        total_sessions:       parseInt(row.metricValues[0].value, 10),
        total_users:          parseInt(row.metricValues[1].value, 10),
        total_new_users:      parseInt(row.metricValues[2].value, 10),
        total_page_views:     parseInt(row.metricValues[3].value, 10),
        avg_bounce_rate:      parseFloat(row.metricValues[4].value),
        avg_session_duration: parseFloat(row.metricValues[5].value),
      };
    }
  } catch {
    // fall through to DB fallback
  }
  return repo.getSummary(since, until);
}
