import baseService from '@services/configs/baseService';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type { RangeState } from '@store/slices/rangeSlice';
import type {
  KPIs, RevenueTrendItem, MetaFunnel, Campaign, Product,
  LogisticsItem, AbandonedCarts, ConnectorHealth,
  ReviewsSummary, TopRatedProduct, RecentReview,
} from '@app/types/dashboard';

const get = <T>(url: string, params: Record<string, string>) =>
  baseService.get<{ data: T }>(url, { params }).then((r) => r.data.data);

const getNoParams = <T>(url: string) =>
  baseService.get<{ data: T }>(url).then((r) => r.data.data);

const safe = <T>(p: Promise<T>, fallback: T | null): Promise<T | null> => p.catch(() => fallback);

export async function fetchAllDashboard(range: RangeState) {
  const params = buildRangeParams(range);
  const [kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics, abandonedCarts,
    health, reviewsSummary, topRatedProducts, recentReviews] = await Promise.all([
    get<KPIs>(API_ENDPOINTS.dashboard.kpis, params),
    get<RevenueTrendItem[]>(API_ENDPOINTS.dashboard.revenueTrend, params),
    get<MetaFunnel>(API_ENDPOINTS.dashboard.metaFunnel, params),
    get<Campaign[]>(API_ENDPOINTS.dashboard.campaigns, params),
    get<Product[]>(API_ENDPOINTS.dashboard.topProducts, params),
    get<LogisticsItem[]>(API_ENDPOINTS.dashboard.logistics, params),
    get<AbandonedCarts>(API_ENDPOINTS.dashboard.abandonedCarts, params),
    getNoParams<ConnectorHealth[]>(API_ENDPOINTS.health),
    safe(get<ReviewsSummary>(API_ENDPOINTS.dashboard.reviewsSummary, params), null),
    safe(get<TopRatedProduct[]>(API_ENDPOINTS.dashboard.topRatedProducts, params), []),
    safe(get<RecentReview[]>(API_ENDPOINTS.dashboard.recentReviews, params), []),
  ]);
  return {
    kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics,
    abandonedCarts, health, reviewsSummary, topRatedProducts, recentReviews,
  };
}
