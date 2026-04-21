import baseService from '@services/configs/baseService';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type { RangeState } from '@store/slices/rangeSlice';
import type {
  KPIs, RevenueTrendItem, MetaFunnel, Campaign, Product,
  LogisticsItem, AbandonedCarts, ConnectorHealth,
  ReviewsSummary, TopRatedProduct, RecentReview, RecentOrder, ReviewsTrendItem,
  RevenueVsSpendItem, NetRevenueSnapshot,
} from '@app/types/dashboard';

const get = <T>(url: string, params: Record<string, string>) =>
  baseService.get<{ data: T }>(url, { params }).then((r) => r.data.data);

const getNoParams = <T>(url: string) =>
  baseService.get<{ data: T }>(url).then((r) => r.data.data);

const safe = <T>(p: Promise<T>, fallback: T | null): Promise<T | null> => p.catch(() => fallback);

function buildPrevPeriodParams(range: RangeState): Record<string, string> | null {
  // full-period presets have no meaningful prior-period delta
  if (range.preset === 'all' || range.preset === 'fytd' || range.preset === 'fqtd') return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let days: number;
  let currentSince: Date;

  if (range.preset === 'custom' && range.startDate && range.endDate) {
    currentSince = new Date(range.startDate);
    const currentUntil = new Date(range.endDate);
    days = Math.round((currentUntil.getTime() - currentSince.getTime()) / 86400000);
  } else if (range.preset === '7d') {
    days = 7;
    currentSince = new Date(today);
    currentSince.setDate(today.getDate() - 7);
  } else {
    // '30d'
    days = 30;
    currentSince = new Date(today);
    currentSince.setDate(today.getDate() - 30);
  }

  // Previous window: the same-length period immediately before the current window
  const prevUntil = new Date(currentSince);
  prevUntil.setDate(prevUntil.getDate() - 1);
  const prevSince = new Date(prevUntil);
  prevSince.setDate(prevSince.getDate() - (days - 1));

  return {
    startDate: prevSince.toISOString().split('T')[0],
    endDate:   prevUntil.toISOString().split('T')[0],
  };
}

export async function fetchAllDashboard(range: RangeState) {
  const params = buildRangeParams(range);
  const prevParamsOrNull = buildPrevPeriodParams(range);

  const [
    kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics, abandonedCarts,
    health, reviewsSummary, topRatedProducts, recentReviews, recentOrders, reviewsTrend,
    prevKpis, revenueVsSpendRaw, netRevenue,
  ] = await Promise.all([
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
    safe(get<RecentReview[]>(API_ENDPOINTS.dashboard.recentReviews, { ...params, limit: range.preset === 'all' ? '1000' : '50' }), []),
    safe(getNoParams<RecentOrder[]>(API_ENDPOINTS.dashboard.recentOrders), []),
    safe(get<ReviewsTrendItem[]>(API_ENDPOINTS.dashboard.reviewsTrend, params), []),
    prevParamsOrNull
      ? safe(get<KPIs>(API_ENDPOINTS.dashboard.kpis, prevParamsOrNull), null)
      : Promise.resolve(null),
    safe(get<{ date: string; revenue: string; ad_spend: string }[]>(API_ENDPOINTS.dashboard.revenueVsSpend, params), []),
    safe(get<NetRevenueSnapshot>(API_ENDPOINTS.analytics.netRevenue, params), null),
  ]);

  const revenueVsSpend: RevenueVsSpendItem[] = (revenueVsSpendRaw ?? []).map((r) => ({
    date: r.date,
    revenue: parseFloat(r.revenue),
    ad_spend: parseFloat(r.ad_spend),
  }));

  // PostgreSQL COUNT/AVG return strings via Sequelize — coerce to numbers at the API boundary
  const reviewsSummaryNorm: ReviewsSummary | null = reviewsSummary ? {
    store_rating:    Number(reviewsSummary.store_rating),
    total_reviews:   Number(reviewsSummary.total_reviews),
    five_star:       Number(reviewsSummary.five_star),
    four_star:       Number(reviewsSummary.four_star),
    three_star:      Number(reviewsSummary.three_star),
    two_star:        Number(reviewsSummary.two_star),
    one_star:        Number(reviewsSummary.one_star),
    with_photos:     Number(reviewsSummary.with_photos),
    verified_count:  Number(reviewsSummary.verified_count),
  } : null;

  const reviewsTrendNorm: ReviewsTrendItem[] = (reviewsTrend ?? []).map((r) => ({
    date:         r.date,
    review_count: Number(r.review_count),
    avg_rating:   Number(r.avg_rating),
  }));

  const topRatedProductsNorm: TopRatedProduct[] = (topRatedProducts ?? []).map((p) => ({
    product_id:     Number(p.product_id),
    handle:         p.handle,
    title:          p.title,
    average_rating: Number(p.average_rating),
    reviews_count:  Number(p.reviews_count),
  }));

  return {
    kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics,
    abandonedCarts, health,
    reviewsSummary: reviewsSummaryNorm,
    topRatedProducts: topRatedProductsNorm,
    recentReviews,
    recentOrders, reviewsTrend: reviewsTrendNorm, prevKpis, revenueVsSpend, netRevenue,
  };
}
