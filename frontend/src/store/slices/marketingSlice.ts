import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { marketingApi } from '@services/marketing/marketing.api';
import type {
  DiscountCodeRowApi,
  GiftCardRowApi,
  MarketingKpisApi,
  PriceRuleRowApi,
} from '@app/types/marketing-api';
import type { PaginationApi } from '@app/types/finance-api';

export interface MarketingState {
  kpis: MarketingKpisApi | null;
  discountCodes: DiscountCodeRowApi[];
  discountCodesPagination: PaginationApi | null;
  priceRules: PriceRuleRowApi[];
  priceRulesPagination: PaginationApi | null;
  giftCards: GiftCardRowApi[];
  giftCardsPagination: PaginationApi | null;
  loading: boolean;
  error: string | null;
}

const initialState: MarketingState = {
  kpis: null,
  discountCodes: [],
  discountCodesPagination: null,
  priceRules: [],
  priceRulesPagination: null,
  giftCards: [],
  giftCardsPagination: null,
  loading: false,
  error: null,
};

export const fetchMarketingOverview = createAsyncThunk(
  'marketing/fetchOverview',
  async () => {
    const [kpis, discountCodes, priceRules, giftCards] = await Promise.all([
      marketingApi.getKpis(),
      marketingApi.listDiscountCodes({ page: 1, limit: 50 }),
      marketingApi.listPriceRules({ page: 1, limit: 50 }),
      marketingApi.listGiftCards({ page: 1, limit: 50 }),
    ]);
    return { kpis, discountCodes, priceRules, giftCards };
  },
);

const marketingSlice = createSlice({
  name: 'marketing',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMarketingOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMarketingOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.kpis = action.payload.kpis;
        state.discountCodes = action.payload.discountCodes.rows;
        state.discountCodesPagination = action.payload.discountCodes.pagination ?? null;
        state.priceRules = action.payload.priceRules.rows;
        state.priceRulesPagination = action.payload.priceRules.pagination ?? null;
        state.giftCards = action.payload.giftCards.rows;
        state.giftCardsPagination = action.payload.giftCards.pagination ?? null;
      })
      .addCase(fetchMarketingOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load marketing overview';
      });
  },
});

export default marketingSlice.reducer;
