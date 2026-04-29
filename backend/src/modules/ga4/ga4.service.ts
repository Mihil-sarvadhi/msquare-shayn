import { resolveDateRange } from '@utils/resolveDateRange';
import type { DateRange } from '@utils/resolveDateRange';
import * as repo from './ga4.repository';
import {
  getCountryActiveUsers,
  getPeriodTotals,
  getRealtimeByDimension,
  getRealtimeTrendActiveUsers,
  getRecentNewUsersByMinuteAndDimension,
} from './ga4.connector';

export { resolveDateRange };
export type { DateRange };

export const getTrafficDaily   = (since: string, until: string) => repo.getTrafficDaily(since, until);
export const getChannels       = (since: string, until: string) => repo.getChannels(since, until);
export const getEcommerceDaily = (since: string, until: string) => repo.getEcommerceDaily(since, until);
export const getProducts       = (since: string, until: string) => repo.getProducts(since, until);
export const getRealtime       = () => repo.getRealtime();
export const getPagesScreens   = (since: string, until: string) => repo.getPagesScreens(since, until);

export interface GA4CountryActiveUsersData {
  country: string;
  activeUsers: number;
  updatedAt: string;
  source: 'db' | 'ga4';
}

export interface GA4RealtimeWidgetQuery {
  location: 'country' | 'city';
  metric: 'activeUsers' | 'newUsers';
}

interface GA4RealtimeTrendPoint {
  minute: string;
  value: number;
}

interface GA4RealtimeLocationRow {
  location: string;
  value: number;
}

export interface GA4RealtimeWidgetData {
  metric: 'activeUsers' | 'newUsers';
  location: 'country' | 'city';
  total: number;
  trend: GA4RealtimeTrendPoint[];
  breakdown: GA4RealtimeLocationRow[];
  updatedAt: string;
}

function isMeaningfulLocation(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return Boolean(
    normalized &&
      normalized !== 'unknown' &&
      normalized !== '(not set)' &&
      normalized !== 'not set' &&
      normalized !== 'undefined' &&
      normalized !== 'null',
  );
}

function formatMinuteLabel(raw: string): string {
  const hh = raw.slice(8, 10);
  const mm = raw.slice(10, 12);
  return `${hh}:${mm}`;
}

async function buildActiveUsersRealtime(location: 'country' | 'city'): Promise<GA4RealtimeWidgetData> {
  const [breakdownResp, trendResp] = await Promise.all([
    getRealtimeByDimension(location),
    getRealtimeTrendActiveUsers(),
  ]);

  const breakdown = (breakdownResp.rows ?? []).map((row) => ({
    location: row.dimensionValues[0]?.value || 'Unknown',
    value: parseInt(row.metricValues[0]?.value ?? '0', 10),
  })).filter((row) => isMeaningfulLocation(row.location));

  const trendMap = new Map<number, number>();
  for (const row of trendResp.rows ?? []) {
    const minuteAgo = parseInt(row.dimensionValues[0]?.value ?? '0', 10);
    if (minuteAgo >= 0 && minuteAgo <= 29) {
      trendMap.set(minuteAgo, parseInt(row.metricValues[0]?.value ?? '0', 10));
    }
  }

  const trend: GA4RealtimeTrendPoint[] = Array.from({ length: 30 }, (_, index) => 29 - index).map((minuteAgo) => ({
    minute: `${minuteAgo}m ago`,
    value: trendMap.get(minuteAgo) ?? 0,
  }));

  return {
    metric: 'activeUsers',
    location,
    total: breakdown.reduce((sum, row) => sum + row.value, 0),
    trend,
    breakdown: breakdown.slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
}

async function buildNewUsersRecent(location: 'country' | 'city'): Promise<GA4RealtimeWidgetData> {
  const report = await getRecentNewUsersByMinuteAndDimension(location);
  const rows = report.rows ?? [];

  const minutesDesc = Array.from(new Set(rows.map((row) => row.dimensionValues[0]?.value ?? ''))).filter(Boolean);
  const recentMinutes = minutesDesc.slice(0, 30);

  const trendMap = new Map<string, number>();
  const breakdownMap = new Map<string, number>();

  for (const row of rows) {
    const minute = row.dimensionValues[0]?.value ?? '';
    if (!recentMinutes.includes(minute)) continue;
    const loc = row.dimensionValues[1]?.value || 'Unknown';
    const value = parseInt(row.metricValues[0]?.value ?? '0', 10);
    trendMap.set(minute, (trendMap.get(minute) ?? 0) + value);
    breakdownMap.set(loc, (breakdownMap.get(loc) ?? 0) + value);
  }

  const trend: GA4RealtimeTrendPoint[] = [...recentMinutes]
    .reverse()
    .map((minute) => ({
      minute: formatMinuteLabel(minute),
      value: trendMap.get(minute) ?? 0,
    }));

  const breakdown: GA4RealtimeLocationRow[] = [...breakdownMap.entries()]
    .map(([loc, value]) => ({ location: loc, value }))
    .filter((row) => isMeaningfulLocation(row.location))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    metric: 'newUsers',
    location,
    total: trend.reduce((sum, point) => sum + point.value, 0),
    trend,
    breakdown,
    updatedAt: new Date().toISOString(),
  };
}

export async function getRealtimeWidgetData(query: GA4RealtimeWidgetQuery): Promise<GA4RealtimeWidgetData> {
  if (query.metric === 'newUsers') {
    return buildNewUsersRecent(query.location);
  }
  return buildActiveUsersRealtime(query.location);
}

const countryActiveUsersCache = new Map<string, { at: number; data: GA4CountryActiveUsersData[] }>();
const COUNTRY_ACTIVE_USERS_TTL_MS = 5 * 60 * 1000;

export async function getCountryActiveUsersData(since: string, until: string): Promise<GA4CountryActiveUsersData[]> {
  const cacheKey = `${since}:${until}`;
  const cached = countryActiveUsersCache.get(cacheKey);
  if (cached && Date.now() - cached.at < COUNTRY_ACTIVE_USERS_TTL_MS) {
    return cached.data;
  }

  try {
    const report = await getCountryActiveUsers(since, until);
    const now = new Date().toISOString();
    const result = (report.rows ?? [])
      .map((row) => ({
        country: row.dimensionValues[0]?.value || 'Unknown',
        activeUsers: parseInt(row.metricValues[0]?.value ?? '0', 10),
        updatedAt: now,
        source: 'ga4' as const,
      }))
      .filter((row) => isMeaningfulLocation(row.country))
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .slice(0, 20);
    countryActiveUsersCache.set(cacheKey, { at: Date.now(), data: result });
    return result;
  } catch (error) {
    throw new Error(`Failed to fetch country active users from GA4: ${(error as Error).message}`);
  }
}

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
        avg_session_duration: parseFloat(row.metricValues[4].value),
      };
    }
  } catch {
    // fall through to DB fallback
  }
  return repo.getSummary(since, until);
}
