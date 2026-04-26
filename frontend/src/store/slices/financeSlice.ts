import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { financeApi } from '@services/finance/finance.api';
import { buildFinanceRangeParams } from '@utils/common-functions/buildFinanceRangeParams';
import type { RangeState } from './rangeSlice';
import type {
  FinanceKpisApi,
  PaymentMethodSplitApi,
  RefundsSummaryApi,
  RevenueBreakdownPointApi,
} from '@app/types/finance-api';

export interface FinanceState {
  kpis: FinanceKpisApi | null;
  breakdown: RevenueBreakdownPointApi[];
  paymentSplit: PaymentMethodSplitApi | null;
  refundsSummary: RefundsSummaryApi | null;
  loading: boolean;
  error: string | null;
}

const initialState: FinanceState = {
  kpis: null,
  breakdown: [],
  paymentSplit: null,
  refundsSummary: null,
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
      })
      .addCase(fetchFinanceOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load finance overview';
      });
  },
});

export default financeSlice.reducer;
