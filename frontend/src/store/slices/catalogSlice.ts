import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { catalogApi } from '@services/catalog/catalog.api';
import { buildFinanceRangeParams } from '@utils/common-functions/buildFinanceRangeParams';
import type { RangeState } from './rangeSlice';
import type {
  BestSellerRowApi,
  CatalogKpisApi,
  InventoryRowApi,
  MarginRowApi,
  ProductRowApi,
  SlowMoverRowApi,
} from '@app/types/catalog-api';
import type { PaginationApi } from '@app/types/finance-api';

export interface CatalogState {
  kpis: CatalogKpisApi | null;
  products: ProductRowApi[];
  productsPagination: PaginationApi | null;
  bestSellers: BestSellerRowApi[];
  slowMovers: SlowMoverRowApi[];
  inventory: InventoryRowApi[];
  inventoryPagination: PaginationApi | null;
  margin: MarginRowApi[];
  loading: boolean;
  loadingProducts: boolean;
  loadingInventory: boolean;
  error: string | null;
  productsPage: number;
  productsLimit: number;
  productsSearch: string;
  inventoryPage: number;
  inventoryLimit: number;
  inventorySearch: string;
  inventoryThreshold: number | null;
}

const initialState: CatalogState = {
  kpis: null,
  products: [],
  productsPagination: null,
  bestSellers: [],
  slowMovers: [],
  inventory: [],
  inventoryPagination: null,
  margin: [],
  loading: false,
  loadingProducts: false,
  loadingInventory: false,
  error: null,
  productsPage: 1,
  productsLimit: 25,
  productsSearch: '',
  inventoryPage: 1,
  inventoryLimit: 50,
  inventorySearch: '',
  inventoryThreshold: null,
};

export const fetchCatalogOverview = createAsyncThunk(
  'catalog/fetchOverview',
  async (range: RangeState) => {
    const params = buildFinanceRangeParams(range);
    const [kpis, bestSellers, slowMovers, margin] = await Promise.all([
      catalogApi.getKpis(),
      catalogApi.getBestSellers(params),
      catalogApi.getSlowMovers(params),
      catalogApi.getMargin(),
    ]);
    return { kpis, bestSellers, slowMovers, margin };
  },
);

export const fetchProducts = createAsyncThunk(
  'catalog/fetchProducts',
  async (args: { page: number; limit: number; search?: string }) =>
    catalogApi.listProducts(args),
);

export const fetchInventory = createAsyncThunk(
  'catalog/fetchInventory',
  async (args: { page: number; limit: number; search?: string; threshold?: number }) =>
    catalogApi.listInventory(args),
);

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    setProductsPage(state, action: { payload: number }) {
      state.productsPage = action.payload;
    },
    setProductsSearch(state, action: { payload: string }) {
      state.productsSearch = action.payload;
      state.productsPage = 1;
    },
    setInventoryPage(state, action: { payload: number }) {
      state.inventoryPage = action.payload;
    },
    setInventorySearch(state, action: { payload: string }) {
      state.inventorySearch = action.payload;
      state.inventoryPage = 1;
    },
    setInventoryThreshold(state, action: { payload: number | null }) {
      state.inventoryThreshold = action.payload;
      state.inventoryPage = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalogOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCatalogOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.kpis = action.payload.kpis;
        state.bestSellers = action.payload.bestSellers;
        state.slowMovers = action.payload.slowMovers;
        state.margin = action.payload.margin;
      })
      .addCase(fetchCatalogOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load catalog overview';
      })
      .addCase(fetchProducts.pending, (state) => {
        state.loadingProducts = true;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loadingProducts = false;
        state.products = action.payload.rows;
        state.productsPagination = action.payload.pagination ?? null;
      })
      .addCase(fetchProducts.rejected, (state) => {
        state.loadingProducts = false;
      })
      .addCase(fetchInventory.pending, (state) => {
        state.loadingInventory = true;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loadingInventory = false;
        state.inventory = action.payload.rows;
        state.inventoryPagination = action.payload.pagination ?? null;
      })
      .addCase(fetchInventory.rejected, (state) => {
        state.loadingInventory = false;
      });
  },
});

export const {
  setProductsPage,
  setProductsSearch,
  setInventoryPage,
  setInventorySearch,
  setInventoryThreshold,
} = catalogSlice.actions;
export default catalogSlice.reducer;
