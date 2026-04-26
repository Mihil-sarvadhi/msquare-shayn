import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type {
  FinanceKpisApi,
  PaginationApi,
  PaymentMethodSplitApi,
  PayoutDetailApi,
  PayoutSummaryApi,
  RefundRowApi,
  RefundsSummaryApi,
  RevenueBreakdownPointApi,
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
      .get<ApiEnvelope<RevenueBreakdownPointApi[]>>(API_ENDPOINTS.finance.revenueBreakdown, {
        params,
      })
      .then((r) => r.data.data),

  getPaymentMethodSplit: (params: RangeParams) =>
    baseService
      .get<ApiEnvelope<PaymentMethodSplitApi>>(API_ENDPOINTS.finance.paymentMethodSplit, {
        params,
      })
      .then((r) => r.data.data),

  listPayouts: (params: PaginatedParams & { status?: string }) =>
    baseService
      .get<ApiEnvelope<PayoutSummaryApi[]>>(API_ENDPOINTS.finance.payouts, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),

  getPayoutDetail: (id: number) =>
    baseService
      .get<ApiEnvelope<PayoutDetailApi>>(API_ENDPOINTS.finance.payoutDetail(id))
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
    const [kpis, breakdown, paymentSplit, refundsSummary] = await Promise.all([
      financeApi.getKpis(params),
      financeApi.getRevenueBreakdown({ ...params, group_by: 'day' }),
      financeApi.getPaymentMethodSplit(params),
      financeApi.getRefundsSummary(params),
    ]);
    return { kpis, breakdown, paymentSplit, refundsSummary };
  },
};
