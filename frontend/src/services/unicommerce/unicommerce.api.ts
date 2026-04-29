import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type {
  ChannelComparisonRow,
  ChannelSummaryRow,
  OrderStatusRow,
  RecentOrderRow,
  ReturnsRow,
  RevenueTrendRow,
  TopProductRow,
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

  fetchOverview: async (params: UnicommerceParams) => {
    const [summary, revenueTrend, topProducts, orderStatus, channelComparison, returns, recentOrders] =
      await Promise.all([
        unicommerceApi.getSummary(params),
        unicommerceApi.getRevenueTrend(params),
        unicommerceApi.getTopProducts(params),
        unicommerceApi.getOrderStatus(params),
        unicommerceApi.getChannelComparison(params),
        unicommerceApi.getReturns(params),
        unicommerceApi.getRecentOrders(params),
      ]);
    return {
      summary,
      revenueTrend,
      topProducts,
      orderStatus,
      channelComparison,
      returns,
      recentOrders,
    };
  },
};
