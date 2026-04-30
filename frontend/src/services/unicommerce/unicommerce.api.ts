import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type {
  CategoryRow,
  ChannelComparisonRow,
  ChannelReturnsRow,
  ChannelSummaryRow,
  FastMovingSkuRow,
  InventorySummary,
  OrderStatusRow,
  ProductByChannelRow,
  RecentOrderRow,
  ReturnsRow,
  RevenueTrendRow,
  TodaySnapshot,
  TopProductRow,
  TopProductWithPctRow,
  ZeroOrderSkuRow,
} from '@app/types/unicommerce-api';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface UnicommerceParams {
  range?: string;
  startDate?: string;
  endDate?: string;
  channel?: string;
}

const get = <T>(url: string, params: UnicommerceParams) =>
  baseService.get<ApiEnvelope<T>>(url, { params }).then((r) => r.data.data);

export const unicommerceApi = {
  getSummary: (params: UnicommerceParams) =>
    get<ChannelSummaryRow[]>(API_ENDPOINTS.unicommerce.summary, params),

  getRevenueTrend: (params: UnicommerceParams) =>
    get<RevenueTrendRow[]>(API_ENDPOINTS.unicommerce.revenueTrend, params),

  getTopProducts: (params: UnicommerceParams) =>
    get<TopProductRow[]>(API_ENDPOINTS.unicommerce.topProducts, params),

  getOrderStatus: (params: UnicommerceParams) =>
    get<OrderStatusRow[]>(API_ENDPOINTS.unicommerce.orderStatus, params),

  getChannelComparison: (params: UnicommerceParams) =>
    get<ChannelComparisonRow[]>(API_ENDPOINTS.unicommerce.channelComparison, params),

  getReturns: (params: UnicommerceParams) =>
    get<ReturnsRow[]>(API_ENDPOINTS.unicommerce.returns, params),

  getRecentOrders: (params: UnicommerceParams) =>
    get<RecentOrderRow[]>(API_ENDPOINTS.unicommerce.recentOrders, params),

  getTopCategories: (params: UnicommerceParams) =>
    get<CategoryRow[]>(API_ENDPOINTS.unicommerce.topCategories, params),

  getTopProductsPct: (params: UnicommerceParams) =>
    get<TopProductWithPctRow[]>(API_ENDPOINTS.unicommerce.topProductsPct, params),

  getTopProductsByChannel: (params: UnicommerceParams) =>
    get<ProductByChannelRow[]>(API_ENDPOINTS.unicommerce.topProductsByChannel, params),

  getChannelReturns: (params: UnicommerceParams) =>
    get<ChannelReturnsRow[]>(API_ENDPOINTS.unicommerce.channelReturns, params),

  /** Today vs yesterday — independent of the page's range filter. */
  getTodaySnapshot: () =>
    baseService
      .get<{ success: boolean; data: TodaySnapshot }>(API_ENDPOINTS.unicommerce.todaySnapshot)
      .then((r) => r.data.data),

  /** Inventory snapshot — independent of the range filter. */
  getInventorySummary: () =>
    baseService
      .get<{ success: boolean; data: InventorySummary }>(
        API_ENDPOINTS.unicommerce.inventorySummary,
      )
      .then((r) => r.data.data),

  getFastMovingSkus: () =>
    baseService
      .get<{ success: boolean; data: FastMovingSkuRow[] }>(
        API_ENDPOINTS.unicommerce.inventoryFastMoving,
      )
      .then((r) => r.data.data),

  getZeroOrderSkus: () =>
    baseService
      .get<{ success: boolean; data: ZeroOrderSkuRow[] }>(
        API_ENDPOINTS.unicommerce.inventoryZeroOrders,
      )
      .then((r) => r.data.data),

  fetchOverview: async (params: UnicommerceParams) => {
    const [
      summary,
      revenueTrend,
      topProducts,
      orderStatus,
      channelComparison,
      returns,
      recentOrders,
      topCategories,
      topProductsPct,
      topProductsByChannel,
      channelReturns,
    ] = await Promise.all([
      unicommerceApi.getSummary(params),
      unicommerceApi.getRevenueTrend(params),
      unicommerceApi.getTopProducts(params),
      unicommerceApi.getOrderStatus(params),
      unicommerceApi.getChannelComparison(params),
      unicommerceApi.getReturns(params),
      unicommerceApi.getRecentOrders(params),
      unicommerceApi.getTopCategories(params),
      unicommerceApi.getTopProductsPct(params),
      unicommerceApi.getTopProductsByChannel(params),
      unicommerceApi.getChannelReturns(params),
    ]);
    return {
      summary,
      revenueTrend,
      topProducts,
      orderStatus,
      channelComparison,
      returns,
      recentOrders,
      topCategories,
      topProductsPct,
      topProductsByChannel,
      channelReturns,
    };
  },
};
