import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type {
  NetRevenue, RtoByStateItem, CodVsPrepaidItem, GeoRevenueItem,
  LogisticsCosts, CodCashFlow, CustomerOverview, CustomerSegmentItem,
  TopCustomerItem, DiscountItem, MarketingTrendItem, AttributionGap, TopSkuItem,
  MoneyStuck,
} from '@app/types/analytics';

const get = <T>(url: string, range: string) =>
  baseService.get<{ data: T }>(url, { params: { range } }).then((r) => r.data.data);

export async function fetchOperations(range: string) {
  const e = API_ENDPOINTS.analytics;
  const [netRevenue, rtoByState, codVsPrepaidRto, geoRevenue, logisticsCosts, codCashFlow, topSkus, moneyStuck] =
    await Promise.all([
      get<NetRevenue>(e.netRevenue, range),
      get<RtoByStateItem[]>(e.rtoByState, range),
      get<CodVsPrepaidItem[]>(e.codVsPrepaidRto, range),
      get<GeoRevenueItem[]>(e.geoRevenue, range),
      get<LogisticsCosts>(e.logisticsCosts, range),
      get<CodCashFlow>(e.codCashFlow, range),
      get<TopSkuItem[]>(e.topSkus, range),
      get<MoneyStuck>(e.moneyStuck, range),
    ]);
  return { netRevenue, rtoByState, codVsPrepaidRto, geoRevenue, logisticsCosts, codCashFlow, topSkus, moneyStuck };
}

export async function fetchCustomers(range: string) {
  const e = API_ENDPOINTS.analytics;
  const [customerOverviewRaw, customerSegments, topCustomers, discountAnalysis] = await Promise.all([
    get<CustomerOverview>(e.customerOverview, range),
    get<CustomerSegmentItem[]>(e.customerSegments, range),
    get<TopCustomerItem[]>(e.topCustomers, range),
    get<DiscountItem[]>(e.discountAnalysis, range),
  ]);
  const customerOverview: CustomerOverview = {
    total_customers:     Number(customerOverviewRaw.total_customers ?? 0),
    new_customers:       Number(customerOverviewRaw.new_customers ?? 0),
    returning_customers: Number(customerOverviewRaw.returning_customers ?? 0),
    repeat_rate:         Number(customerOverviewRaw.repeat_rate ?? 0),
  };
  return { customerOverview, customerSegments, topCustomers, discountAnalysis };
}

export async function fetchMarketing(range: string) {
  const e = API_ENDPOINTS.analytics;
  const [marketingTrend, attributionGapRaw] = await Promise.all([
    get<MarketingTrendItem[]>(e.marketingTrend, range),
    get<{ meta_purchases: number; shopify_orders: number }>(e.attributionGap, range),
  ]);
  const meta    = Number(attributionGapRaw.meta_purchases ?? 0);
  const shopify = Number(attributionGapRaw.shopify_orders ?? 0);
  const attributionGap: AttributionGap = {
    meta_purchases: meta,
    shopify_orders: shopify,
    attribution_rate: shopify > 0 ? Math.round((meta / shopify) * 100) : 0,
    gap: meta - shopify,
  };
  return { marketingTrend, attributionGap };
}
