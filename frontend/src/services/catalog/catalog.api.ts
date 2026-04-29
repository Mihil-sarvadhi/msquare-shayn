import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type {
  BestSellerRowApi,
  CatalogKpisApi,
  InventoryRowApi,
  MarginRowApi,
  ProductDetailApi,
  ProductRowApi,
  SlowMoverRowApi,
} from '@app/types/catalog-api';
import type { PaginationApi } from '@app/types/finance-api';

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

interface ProductsListParams {
  page?: number;
  limit?: number;
  status?: string;
  product_type?: string;
  vendor?: string;
  search?: string;
}

interface InventoryListParams {
  page?: number;
  limit?: number;
  threshold?: number;
  search?: string;
}

export const catalogApi = {
  getKpis: (params?: { from: string; to: string }) =>
    baseService
      .get<ApiEnvelope<CatalogKpisApi>>(API_ENDPOINTS.catalog.kpis, { params })
      .then((r) => r.data.data),

  listProducts: (params: ProductsListParams) =>
    baseService
      .get<ApiEnvelope<ProductRowApi[]>>(API_ENDPOINTS.catalog.products, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),

  getProductDetail: (id: number) =>
    baseService
      .get<ApiEnvelope<ProductDetailApi>>(API_ENDPOINTS.catalog.productDetail(id))
      .then((r) => r.data.data),

  getBestSellers: (params: RangeParams) =>
    baseService
      .get<ApiEnvelope<BestSellerRowApi[]>>(API_ENDPOINTS.catalog.bestSellers, { params })
      .then((r) => r.data.data),

  getSlowMovers: (params: RangeParams & { days_inactive?: number }) =>
    baseService
      .get<ApiEnvelope<SlowMoverRowApi[]>>(API_ENDPOINTS.catalog.slowMovers, { params })
      .then((r) => r.data.data),

  listInventory: (params: InventoryListParams) =>
    baseService
      .get<ApiEnvelope<InventoryRowApi[]>>(API_ENDPOINTS.catalog.inventory, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),

  getStockouts: (threshold = 0) =>
    baseService
      .get<ApiEnvelope<InventoryRowApi[]>>(API_ENDPOINTS.catalog.stockouts, {
        params: { threshold },
      })
      .then((r) => r.data.data),

  getMargin: () =>
    baseService
      .get<ApiEnvelope<MarginRowApi[]>>(API_ENDPOINTS.catalog.margin)
      .then((r) => r.data.data),
};
