import baseService from '@services/configs/baseService';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type { RangeState } from '@store/slices/rangeSlice';
import type {
  GA4Summary, GA4TrafficDaily, GA4Channel, GA4EcommerceDaily,
  GA4Product, GA4Device, GA4Geography, GA4Realtime,
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

export async function fetchGA4(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.ga4;

  const [summary, overview, channels, ecommerce, products, devices, geography, realtime] =
    await Promise.all([
      safe(get<GA4Summary>(e.summary, params), {
        total_sessions: 0, total_users: 0, total_new_users: 0,
        total_page_views: 0, avg_bounce_rate: 0, avg_session_duration: 0,
      }),
      safe(get<GA4TrafficDaily[]>(e.overview, params), []),
      safe(get<GA4Channel[]>(e.channels, params), []),
      safe(get<GA4EcommerceDaily[]>(e.ecommerce, params), []),
      safe(get<GA4Product[]>(e.products, params), []),
      safe(get<GA4Device[]>(e.devices, params), []),
      safe(get<GA4Geography[]>(e.geography, params), []),
      safe(get<GA4Realtime[]>(e.realtime), []),
    ]);

  return {
    summary: numify(summary, [
      'total_sessions', 'total_users', 'total_new_users',
      'total_page_views', 'avg_bounce_rate', 'avg_session_duration',
    ]),
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
    devices: devices.map((r) => numify(r, [
      'sessions', 'active_users', 'purchase_revenue', 'conversion_rate',
    ])),
    geography: geography.map((r) => numify(r, [
      'active_users', 'sessions', 'purchase_revenue', 'transactions',
    ])),
    realtime: realtime.map((r) => numify(r, ['active_users'])),
  };
}

export function fetchGA4Realtime(): Promise<GA4Realtime[]> {
  return safe(get<GA4Realtime[]>(API_ENDPOINTS.ga4.realtime), [])
    .then((rows) => rows.map((r) => numify(r, ['active_users'])));
}
