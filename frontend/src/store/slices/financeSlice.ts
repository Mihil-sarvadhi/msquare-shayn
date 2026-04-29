import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { financeApi } from '@services/finance/finance.api';
import { buildFinanceRangeParams } from '@utils/common-functions/buildFinanceRangeParams';
import type { RangeState } from './rangeSlice';
import type {
  FinanceKpisApi,
  PaymentMethodSplitApi,
  RefundsSummaryApi,
  RevenueBreakdownComparisonApi,
  SalesBreakdownApi,
  SalesByChannelApi,
  SalesByProductApi,
} from '@app/types/finance-api';

export interface FinanceState {
  kpis: FinanceKpisApi | null;
  breakdown: RevenueBreakdownComparisonApi | null;
  paymentSplit: PaymentMethodSplitApi | null;
  refundsSummary: RefundsSummaryApi | null;
  salesBreakdown: SalesBreakdownApi | null;
  salesByChannel: SalesByChannelApi | null;
  salesByProduct: SalesByProductApi | null;
  loading: boolean;
  error: string | null;
}

const initialState: FinanceState = {
  kpis: null,
  breakdown: null,
  paymentSplit: null,
  refundsSummary: null,
  salesBreakdown: null,
  salesByChannel: null,
  salesByProduct: null,
  loading: false,
  error: null,
};

export const fetchFinanceOverview = createAsyncThunk(
  'finance/fetchOverview',
  async (range: RangeState) => {
    const params = buildFinanceRangeParams(range);
    return financeApi.fetchOverview(params);
  },
);

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinanceOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinanceOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.kpis = action.payload.kpis;
        state.breakdown = action.payload.breakdown;
        state.paymentSplit = action.payload.paymentSplit;
        state.refundsSummary = action.payload.refundsSummary;
        state.salesBreakdown = action.payload.salesBreakdown;
        state.salesByChannel = action.payload.salesByChannel;
        state.salesByProduct = action.payload.salesByProduct;
      })
      .addCase(fetchFinanceOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load finance overview';
      });
  },
});

export default financeSlice.reducer;
