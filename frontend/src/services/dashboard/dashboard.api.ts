import baseService from '@services/configs/baseService';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type { RangeState } from '@store/slices/rangeSlice';
import type {
  KPIs, RevenueTrendItem, MetaFunnel, Campaign, Product,
  LogisticsItem, AbandonedCarts, ConnectorHealth,
  ReviewsSummary, TopRatedProduct, RecentReview, RecentOrder, ReviewsTrendItem,
  RevenueVsSpendItem, NetRevenueSnapshot, ShipmentsTrendItem,
} from '@app/types/dashboard';

const get = <T>(url: string, params: Record<string, string>) =>
  baseService.get<{ data: T }>(url, { params }).then((r) => r.data.data);

const getNoParams = <T>(url: string) =>
  baseService.get<{ data: T }>(url).then((r) => r.data.data);

const safe = <T>(p: Promise<T>, fallback: T | null): Promise<T | null> => p.catch(() => fallback);

function utcTodayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftUtcDays(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** Same-length block immediately before [startYmd, endYmd] (inclusive), UTC calendar days. */
function previousEquivalentRange(startYmd: string, endYmd: string): { startDate: string; endDate: string } {
  const start = new Date(`${startYmd}T00:00:00.000Z`);
  const end = new Date(`${endYmd}T00:00:00.000Z`);
  const daySpan = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (daySpan - 1));
  return {
    startDate: prevStart.toISOString().slice(0, 10),
    endDate: prevEnd.toISOString().slice(0, 10),
  };
}

function buildPrevPeriodParams(range: RangeState): Record<string, string> | null {
  // full-period presets have no meaningful prior-period delta
  if (range.preset === 'all' || range.preset === 'fytd' || range.preset === 'fqtd') return null;

  if (range.preset === 'custom' && range.startDate && range.endDate) {
    return previousEquivalentRange(range.startDate, range.endDate);
  }

  const todayYmd = utcTodayYmd();
  if (range.preset === '7d') {
    const startYmd = shiftUtcDays(todayYmd, -6);
    return previousEquivalentRange(startYmd, todayYmd);
  }

  // '30d' — 30 inclusive UTC days ending today (aligned with backend resolveDateRange + GA4 strip)
  const startYmd = shiftUtcDays(todayYmd, -29);
  return previousEquivalentRange(startYmd, todayYmd);
}

export async function fetchAllDashboard(range: RangeState) {
  const params = buildRangeParams(range);
  const prevParamsOrNull = buildPrevPeriodParams(range);

  const [
    kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics, abandonedCarts,
    health, reviewsSummary, topRatedProducts, recentReviews, recentOrders, reviewsTrend,
    prevKpis, revenueVsSpendRaw, netRevenue, shipmentsTrendRaw,
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
    safe(get<ShipmentsTrendItem[]>(API_ENDPOINTS.dashboard.shipmentsTrend, params), []),
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

  const shipmentsTrend: ShipmentsTrendItem[] = (shipmentsTrendRaw ?? []).map((r) => ({
    date: r.date,
    total_shipments: Number(r.total_shipments),
    delivered: Number(r.delivered),
    rto: Number(r.rto),
    ofd: Number(r.ofd),
    ndr: Number(r.ndr),
    cod_orders: Number(r.cod_orders ?? 0),
    prepaid_orders: Number(r.prepaid_orders ?? 0),
  }));

  return {
    kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics,
    abandonedCarts, health,
    reviewsSummary: reviewsSummaryNorm,
    topRatedProducts: topRatedProductsNorm,
    recentReviews,
    recentOrders, reviewsTrend: reviewsTrendNorm, prevKpis, revenueVsSpend, netRevenue,
    shipmentsTrend,
  };
}
