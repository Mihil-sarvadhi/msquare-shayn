import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import type { RangeState } from '@store/slices/rangeSlice';
import type {
  NetRevenue, RtoByStateItem, CodVsPrepaidItem, GeoRevenueItem,
  LogisticsCosts, CodCashFlow, CustomerOverview, CustomerSegmentItem,
  TopCustomerItem, DiscountItem, MarketingTrendItem, AttributionGap, TopSkuItem,
  MoneyStuck, ChannelRevenue,
} from '@app/types/analytics';

const get = <T>(url: string, params: Record<string, string>) =>
  baseService.get<{ data: T }>(url, { params }).then((r) => r.data.data);

export async function fetchOperations(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.analytics;
  const [netRevenue, rtoByState, codVsPrepaidRto, geoRevenue, logisticsCosts, codCashFlow, topSkus, moneyStuck] =
    await Promise.all([
      get<NetRevenue>(e.netRevenue, params),
      get<RtoByStateItem[]>(e.rtoByState, params),
      get<CodVsPrepaidItem[]>(e.codVsPrepaidRto, params),
      get<GeoRevenueItem[]>(e.geoRevenue, params),
      get<LogisticsCosts>(e.logisticsCosts, params),
      get<CodCashFlow>(e.codCashFlow, params),
      get<TopSkuItem[]>(e.topSkus, params),
      get<MoneyStuck>(e.moneyStuck, params),
    ]);
  return { netRevenue, rtoByState, codVsPrepaidRto, geoRevenue, logisticsCosts, codCashFlow, topSkus, moneyStuck };
}

export async function fetchCustomers(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.analytics;
  const [customerOverviewRaw, customerSegments, topCustomers, discountAnalysis] = await Promise.all([
    get<CustomerOverview>(e.customerOverview, params),
    get<CustomerSegmentItem[]>(e.customerSegments, params),
    get<TopCustomerItem[]>(e.topCustomers, params),
    get<DiscountItem[]>(e.discountAnalysis, params),
  ]);
  const customerOverview: CustomerOverview = {
    total_customers:     Number(customerOverviewRaw.total_customers ?? 0),
    new_customers:       Number(customerOverviewRaw.new_customers ?? 0),
    returning_customers: Number(customerOverviewRaw.returning_customers ?? 0),
    repeat_rate:         Number(customerOverviewRaw.repeat_rate ?? 0),
  };
  return { customerOverview, customerSegments, topCustomers, discountAnalysis };
}

export async function fetchMarketing(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.analytics;
  const [marketingTrend, attributionGapRaw, channelRevenueRaw] = await Promise.all([
    get<MarketingTrendItem[]>(e.marketingTrend, params),
    get<{ meta_purchases: number; shopify_orders: number }>(e.attributionGap, params),
    get<{ shopify_revenue: number; meta_revenue: number; organic_revenue: number }>(e.channelRevenue, params),
  ]);
  const meta    = Number(attributionGapRaw.meta_purchases ?? 0);
  const shopify = Number(attributionGapRaw.shopify_orders ?? 0);
  const attributionGap: AttributionGap = {
    meta_purchases: meta,
    shopify_orders: shopify,
    attribution_rate: shopify > 0 ? Math.round((meta / shopify) * 100) : 0,
    gap: meta - shopify,
  };
  const channelRevenue: ChannelRevenue = {
    shopify_revenue: Number(channelRevenueRaw.shopify_revenue ?? 0),
    meta_revenue:    Number(channelRevenueRaw.meta_revenue ?? 0),
    organic_revenue: Number(channelRevenueRaw.organic_revenue ?? 0),
  };
  return { marketingTrend, attributionGap, channelRevenue };
}
