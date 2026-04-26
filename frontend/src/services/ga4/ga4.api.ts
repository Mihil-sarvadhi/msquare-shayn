import baseService from '@services/configs/baseService';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type { RangeState } from '@store/slices/rangeSlice';
import type {
  GA4Summary, GA4TrafficDaily, GA4Channel, GA4EcommerceDaily,
  GA4Product, GA4Realtime, GA4RealtimeWidget, GA4PageScreen, GA4SummaryInsights, GA4CountryActiveUsers,
} from '@app/types/ga4';

const get = <T>(url: string, params: Record<string, string> = {}) =>
  baseService.get<{ data: T }>(url, { params }).then((r) => r.data.data);

const safe = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);

// Coerce pg numeric strings to numbers at the API boundary
function numify<T extends object>(row: T, keys: (keyof T)[]): T {
  const out = { ...row } as Record<string, unknown>;
  for (const k of keys) out[k as string] = Number(out[k as string] ?? 0);
  return out as T;
}

function deltaPct(current: number, baseline: number): number {
  if (!baseline) return current ? 100 : 0;
  return ((current - baseline) / baseline) * 100;
}

type DateRangeParams = { startDate: string; endDate: string };

function ymdToUtcDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function utcDateToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftUtcDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function resolveCurrentRange(range: RangeState): DateRangeParams | null {
  const params = buildRangeParams(range);
  if (params.startDate && params.endDate) {
    return { startDate: params.startDate, endDate: params.endDate };
  }

  const today = new Date();
  const todayYmd = utcDateToYmd(today);
  if (params.range === '7d') {
    return { startDate: utcDateToYmd(shiftUtcDays(ymdToUtcDate(todayYmd), -6)), endDate: todayYmd };
  }
  if (params.range === '30d') {
    return { startDate: utcDateToYmd(shiftUtcDays(ymdToUtcDate(todayYmd), -29)), endDate: todayYmd };
  }
  return null;
}

function getPreviousEquivalentRange(range: DateRangeParams): DateRangeParams {
  const currentStart = ymdToUtcDate(range.startDate);
  const currentEnd = ymdToUtcDate(range.endDate);
  const daySpan = Math.floor((currentEnd.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const previousEnd = shiftUtcDays(currentStart, -1);
  const previousStart = shiftUtcDays(previousEnd, -(daySpan - 1));

  return {
    startDate: utcDateToYmd(previousStart),
    endDate: utcDateToYmd(previousEnd),
  };
}

export async function fetchGA4(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.ga4;
  const currentRange = resolveCurrentRange(range);
  const previousRange = currentRange ? getPreviousEquivalentRange(currentRange) : null;
  // Use the same explicit window for current + prior summaries and charts. Passing only
  // `range=30d` hits backend logic that does not match getPreviousEquivalentRange (30
  // inclusive days vs 31), which skewed bounce and other GA4 deltas.
  const rangeParams: Record<string, string> =
    currentRange !== null
      ? { startDate: currentRange.startDate, endDate: currentRange.endDate }
      : params;

  const [summary, summaryPrevious, overview, channels, ecommerce, products, realtime, countryActiveUsers, pagesScreens] =
    await Promise.all([
      safe(get<GA4Summary>(e.summary, rangeParams), {
        total_sessions: 0, total_users: 0, total_new_users: 0,
        total_page_views: 0, avg_bounce_rate: 0, avg_session_duration: 0,
      }),
      safe(previousRange ? get<GA4Summary>(e.summary, previousRange) : Promise.resolve({
        total_sessions: 0, total_users: 0, total_new_users: 0,
        total_page_views: 0, avg_bounce_rate: 0, avg_session_duration: 0,
      }), {
        total_sessions: 0, total_users: 0, total_new_users: 0,
        total_page_views: 0, avg_bounce_rate: 0, avg_session_duration: 0,
      }),
      safe(get<GA4TrafficDaily[]>(e.overview, rangeParams), []),
      safe(get<GA4Channel[]>(e.channels, rangeParams), []),
      safe(get<GA4EcommerceDaily[]>(e.ecommerce, rangeParams), []),
      safe(get<GA4Product[]>(e.products, rangeParams), []),
      safe(get<GA4Realtime[]>(e.realtime), []),
      safe(get<GA4CountryActiveUsers[]>(e.countryActiveUsers, rangeParams), []),
      safe(get<GA4PageScreen[]>(e.pagesScreens, rangeParams), []),
    ]);

  const normalizedSummary = numify(summary, [
    'total_sessions', 'total_users', 'total_new_users',
    'total_page_views', 'avg_bounce_rate', 'avg_session_duration',
  ]);
  const normalizedSummaryPrevious = numify(summaryPrevious, [
    'total_sessions', 'total_users', 'total_new_users',
    'total_page_views', 'avg_bounce_rate', 'avg_session_duration',
  ]);

  const summaryInsights: GA4SummaryInsights = {
    sessions_delta_pct: deltaPct(normalizedSummary.total_sessions, normalizedSummaryPrevious.total_sessions),
    users_delta_pct: deltaPct(normalizedSummary.total_users, normalizedSummaryPrevious.total_users),
    new_users_delta_pct: deltaPct(normalizedSummary.total_new_users, normalizedSummaryPrevious.total_new_users),
    page_views_delta_pct: deltaPct(normalizedSummary.total_page_views, normalizedSummaryPrevious.total_page_views),
    bounce_rate_delta_pct: deltaPct(normalizedSummary.avg_bounce_rate, normalizedSummaryPrevious.avg_bounce_rate),
    avg_session_duration_delta_pct: deltaPct(normalizedSummary.avg_session_duration, normalizedSummaryPrevious.avg_session_duration),
  };

  return {
    summary: numify(summary, [
      'total_sessions', 'total_users', 'total_new_users',
      'total_page_views', 'avg_bounce_rate', 'avg_session_duration',
    ]),
    summaryInsights,
    overview: overview.map((r) => numify(r, [
      'sessions', 'active_users', 'new_users', 'page_views',
      'bounce_rate', 'avg_session_duration',
    ])),
    channels: channels.map((r) => numify(r, [
      'sessions', 'active_users', 'purchase_revenue', 'conversions', 'conversion_rate',
    ])),
    ecommerce: ecommerce.map((r) => numify(r, [
      'purchase_revenue', 'transactions', 'avg_purchase_revenue',
      'ecommerce_purchases', 'checkouts', 'conversion_rate',
    ])),
    products: products.map((r) => numify(r, [
      'items_viewed', 'items_added_to_cart', 'items_purchased', 'purchase_revenue',
    ])),
    realtime: realtime.map((r) => numify(r, ['active_users'])),
    countryActiveUsers: countryActiveUsers.map((row) => ({
      country: row.country,
      activeUsers: Number(row.activeUsers ?? 0),
      updatedAt: row.updatedAt,
      source: row.source,
    })),
    pagesScreens: pagesScreens.map((r) => numify(r, [
      'screen_page_views',
      'active_users',
      'views_per_active_user',
      'avg_engagement_time_per_active_user',
      'event_count',
      'bounce_rate',
    ])),
  };
}

export function fetchGA4Realtime(): Promise<GA4Realtime[]> {
  return safe(get<GA4Realtime[]>(API_ENDPOINTS.ga4.realtime), [])
    .then((rows) => rows.map((r) => numify(r, ['active_users'])));
}

export function fetchGA4RealtimeWidget(
  location: 'country' | 'city',
  metric: 'activeUsers' | 'newUsers',
): Promise<GA4RealtimeWidget> {
  return safe(
    get<GA4RealtimeWidget>(API_ENDPOINTS.ga4.realtimeWidget, { location, metric }),
    {
      metric: 'activeUsers',
      location: 'country',
      total: 0,
      trend: [],
      breakdown: [],
      updatedAt: new Date(0).toISOString(),
    },
  ).then((row) => ({
    ...row,
    total: Number(row.total ?? 0),
    trend: row.trend.map((point) => ({
      minute: point.minute,
      value: Number(point.value ?? 0),
    })),
    breakdown: row.breakdown.map((item) => ({
      location: item.location,
      value: Number(item.value ?? 0),
    })),
  }));
}
