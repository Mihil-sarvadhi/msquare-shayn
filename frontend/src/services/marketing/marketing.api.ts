import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type {
  CodePerformanceApi,
  DiscountCodeRowApi,
  DisputeRowApi,
  GiftCardRowApi,
  MarketingKpisApi,
  PriceRuleRowApi,
  RiskKpisApi,
} from '@app/types/marketing-api';
import type { PaginationApi } from '@app/types/finance-api';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  pagination?: PaginationApi;
  message?: string;
}

interface PageParams {
  page?: number;
  limit?: number;
}

export const marketingApi = {
  getKpis: () =>
    baseService
      .get<ApiEnvelope<MarketingKpisApi>>(API_ENDPOINTS.marketing.kpis)
      .then((r) => r.data.data),

  listDiscountCodes: (params: PageParams) =>
    baseService
      .get<ApiEnvelope<DiscountCodeRowApi[]>>(API_ENDPOINTS.marketing.discountCodes, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),

  getCodePerformance: (code: string) =>
    baseService
      .get<ApiEnvelope<CodePerformanceApi>>(API_ENDPOINTS.marketing.codePerformance(code))
      .then((r) => r.data.data),

  listPriceRules: (params: PageParams) =>
    baseService
      .get<ApiEnvelope<PriceRuleRowApi[]>>(API_ENDPOINTS.marketing.priceRules, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),

  listGiftCards: (params: PageParams) =>
    baseService
      .get<ApiEnvelope<GiftCardRowApi[]>>(API_ENDPOINTS.marketing.giftCards, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),
};

export const riskApi = {
  getKpis: () =>
    baseService.get<ApiEnvelope<RiskKpisApi>>(API_ENDPOINTS.risk.kpis).then((r) => r.data.data),

  getActiveDisputes: () =>
    baseService
      .get<ApiEnvelope<DisputeRowApi[]>>(API_ENDPOINTS.risk.activeDisputes)
      .then((r) => r.data.data),

  listDisputes: (params: PageParams & { status?: string }) =>
    baseService
      .get<ApiEnvelope<DisputeRowApi[]>>(API_ENDPOINTS.risk.disputes, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),
};
