import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type {
  FinanceKpisApi,
  PaginationApi,
  PaymentMethodSplitApi,
  RefundRowApi,
  RefundsSummaryApi,
  RevenueBreakdownComparisonApi,
  SalesBreakdownApi,
  SalesByChannelApi,
  SalesByProductApi,
  TxRowApi,
} from '@app/types/finance-api';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  pagination?: PaginationApi;
  message?: string;
}

interface RangeParams {
  from: string;
  to: string;
}

interface PaginatedParams extends RangeParams {
  page?: number;
  limit?: number;
}

export const financeApi = {
  getKpis: (params: RangeParams) =>
    baseService
      .get<ApiEnvelope<FinanceKpisApi>>(API_ENDPOINTS.finance.kpis, { params })
      .then((r) => r.data.data),

  getRevenueBreakdown: (params: RangeParams & { group_by: 'day' | 'week' | 'month' }) =>
    baseService
      .get<ApiEnvelope<RevenueBreakdownComparisonApi>>(API_ENDPOINTS.finance.revenueBreakdown, {
        params,
      })
      .then((r) => r.data.data),

  getSalesBreakdown: (params: RangeParams) =>
    baseService
      .get<ApiEnvelope<SalesBreakdownApi>>(API_ENDPOINTS.finance.salesBreakdown, { params })
      .then((r) => r.data.data),

  getPaymentMethodSplit: (params: RangeParams) =>
    baseService
      .get<ApiEnvelope<PaymentMethodSplitApi>>(API_ENDPOINTS.finance.paymentMethodSplit, {
        params,
      })
      .then((r) => r.data.data),

  getSalesByChannel: (params: RangeParams) =>
    baseService
      .get<ApiEnvelope<SalesByChannelApi>>(API_ENDPOINTS.finance.salesByChannel, { params })
      .then((r) => r.data.data),

  getSalesByProduct: (params: RangeParams & { limit?: number }) =>
    baseService
      .get<ApiEnvelope<SalesByProductApi>>(API_ENDPOINTS.finance.salesByProduct, { params })
      .then((r) => r.data.data),

  listRefunds: (params: PaginatedParams & { reason?: string }) =>
    baseService
      .get<ApiEnvelope<RefundRowApi[]>>(API_ENDPOINTS.finance.refunds, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),

  getRefundsSummary: (params: RangeParams) =>
    baseService
      .get<ApiEnvelope<RefundsSummaryApi>>(API_ENDPOINTS.finance.refundsSummary, { params })
      .then((r) => r.data.data),

  listTransactions: (params: PaginatedParams & { gateway?: string; kind?: string }) =>
    baseService
      .get<ApiEnvelope<TxRowApi[]>>(API_ENDPOINTS.finance.transactions, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),

  /**
   * Convenience: fetch all overview data in parallel for the finance dashboard.
   */
  fetchOverview: async (params: RangeParams) => {
    const [
      kpis, breakdown, paymentSplit, refundsSummary, salesBreakdown,
      salesByChannel, salesByProduct,
    ] = await Promise.all([
      financeApi.getKpis(params),
      financeApi.getRevenueBreakdown({ ...params, group_by: 'day' }),
      financeApi.getPaymentMethodSplit(params),
      financeApi.getRefundsSummary(params),
      financeApi.getSalesBreakdown(params),
      financeApi.getSalesByChannel(params),
      financeApi.getSalesByProduct({ ...params, limit: 5 }),
    ]);
    return {
      kpis, breakdown, paymentSplit, refundsSummary, salesBreakdown,
      salesByChannel, salesByProduct,
    };
  },
};
