import baseService from '@services/configs/baseService';
import type {
  KPIs, RevenueTrendItem, MetaFunnel, Campaign, Product,
  LogisticsItem, AbandonedCarts, ConnectorHealth,
  ReviewsSummary, TopRatedProduct, RecentReview,
} from '@app/types/dashboard';

const get = <T>(url: string, params?: Record<string, string>) =>
  baseService.get<{ data: T }>(url, { params }).then((r) => r.data.data);

const safe = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);

export async function fetchAllDashboard(range: string) {
  const params = { range };
  const [kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics, abandonedCarts,
    health, reviewsSummary, topRatedProducts, recentReviews] = await Promise.all([
    get<KPIs>('/dashboard/kpis', params),
    get<RevenueTrendItem[]>('/dashboard/revenue-trend', params),
    get<MetaFunnel>('/dashboard/meta-funnel', params),
    get<Campaign[]>('/dashboard/campaigns', params),
    get<Product[]>('/dashboard/top-products', params),
    get<LogisticsItem[]>('/dashboard/logistics', params),
    get<AbandonedCarts>('/dashboard/abandoned-carts', params),
    get<ConnectorHealth[]>('/health'),
    safe(get<ReviewsSummary>('/dashboard/reviews-summary'), null as unknown as ReviewsSummary),
    safe(get<TopRatedProduct[]>('/dashboard/top-rated-products'), []),
    safe(get<RecentReview[]>('/dashboard/recent-reviews'), []),
  ]);
  return {
    kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics,
    abandonedCarts, health, reviewsSummary, topRatedProducts, recentReviews,
  };
}
