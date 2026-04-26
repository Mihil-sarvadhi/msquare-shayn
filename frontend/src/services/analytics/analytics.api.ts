import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import type { RangeState } from '@store/slices/rangeSlice';
import type {
  RtoByStateItem, GeoRevenueItem,
  LogisticsCosts, CustomerOverview, CustomerSegmentItem,
  TopCustomerItem, MarketingTrendItem, TopSkuItem,
  ChannelRevenue, CreativeFatigueItem, ReturnReasonItem,
} from '@app/types/analytics';

const get = <T>(url: string, params: Record<string, string>) =>
  baseService.get<{ data: T }>(url, { params }).then((r) => r.data.data);

export async function fetchOperations(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.analytics;
  const [rtoByState, geoRevenue, logisticsCosts, topSkus, returnReasonsRaw] =
    await Promise.all([
      get<RtoByStateItem[]>(e.rtoByState, params),
      get<GeoRevenueItem[]>(e.geoRevenue, params),
      get<LogisticsCosts>(e.logisticsCosts, params),
      get<TopSkuItem[]>(e.topSkus, params),
      get<{ reason: string; count: string; pct: string }[]>(e.returnReasons, params),
    ]);
  const returnReasons: ReturnReasonItem[] = returnReasonsRaw.map((r) => ({
    reason: r.reason,
    count:  Number(r.count),
    pct:    Number(r.pct),
  }));
  return { rtoByState, geoRevenue, logisticsCosts, topSkus, returnReasons };
}

export async function fetchCustomers(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.analytics;
  const [customerOverviewRaw, customerSegments, topCustomers, geoRevenue] = await Promise.all([
    get<CustomerOverview>(e.customerOverview, params),
    get<CustomerSegmentItem[]>(e.customerSegments, params),
    get<TopCustomerItem[]>(e.topCustomers, params),
    get<GeoRevenueItem[]>(e.geoRevenue, params),
  ]);
  const customerOverview: CustomerOverview = {
    total_customers:     Number(customerOverviewRaw.total_customers ?? 0),
    new_customers:       Number(customerOverviewRaw.new_customers ?? 0),
    returning_customers: Number(customerOverviewRaw.returning_customers ?? 0),
    repeat_rate:         Number(customerOverviewRaw.repeat_rate ?? 0),
  };
  return { customerOverview, customerSegments, topCustomers, geoRevenue };
}

export async function fetchMarketing(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.analytics;
  const [marketingTrend, channelRevenueRaw, creativeFatigueRaw] = await Promise.all([
    get<MarketingTrendItem[]>(e.marketingTrend, params),
    // get<{ meta_purchases: number; shopify_orders: number }>(e.attributionGap, params),
    get<{ shopify_revenue: number; meta_revenue: number; organic_revenue: number }>(e.channelRevenue, params),
    get<{ date: string; frequency: string | null; ctr: string | null }[]>(e.creativeFatigue, params),
  ]);
  // Attribution Gap disabled — card commented out in UI
  // const meta    = Number(attributionGapRaw.meta_purchases ?? 0);
  // const shopify = Number(attributionGapRaw.shopify_orders ?? 0);
  // const attributionGap: AttributionGap = {
  //   meta_purchases: meta, shopify_orders: shopify,
  //   attribution_rate: shopify > 0 ? Math.round((meta / shopify) * 100) : 0, gap: meta - shopify,
  // };
  const attributionGap = null;
  const channelRevenue: ChannelRevenue = {
    shopify_revenue: Number(channelRevenueRaw.shopify_revenue ?? 0),
    meta_revenue:    Number(channelRevenueRaw.meta_revenue ?? 0),
    organic_revenue: Number(channelRevenueRaw.organic_revenue ?? 0),
  };
  const creativeFatigue: CreativeFatigueItem[] = creativeFatigueRaw.map((r) => ({
    date:      r.date,
    frequency: r.frequency !== null ? Number(r.frequency) : null,
    ctr:       r.ctr       !== null ? Number(r.ctr)       : null,
  }));
  return { marketingTrend, attributionGap, channelRevenue, creativeFatigue };
}
