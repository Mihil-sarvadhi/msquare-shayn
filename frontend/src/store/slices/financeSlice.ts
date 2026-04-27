import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { financeApi } from '@services/finance/finance.api';
import { buildFinanceRangeParams } from '@utils/common-functions/buildFinanceRangeParams';
import type { RangeState } from './rangeSlice';
import type {
  FinanceKpisApi,
  PaymentMethodSplitApi,
  RefundsSummaryApi,
  RevenueBreakdownPointApi,
  SalesBreakdownApi,
} from '@app/types/finance-api';

export type SalesBreakdownMode = 'computed' | 'shopify_native';

export interface FinanceState {
  kpis: FinanceKpisApi | null;
  breakdown: RevenueBreakdownPointApi[];
  paymentSplit: PaymentMethodSplitApi | null;
  refundsSummary: RefundsSummaryApi | null;
  salesBreakdown: SalesBreakdownApi | null;
  salesBreakdownMode: SalesBreakdownMode;
  loading: boolean;
  loadingSalesBreakdown: boolean;
  error: string | null;
}

const initialState: FinanceState = {
  kpis: null,
  breakdown: [],
  paymentSplit: null,
  refundsSummary: null,
  salesBreakdown: null,
  salesBreakdownMode: 'computed',
  loading: false,
  loadingSalesBreakdown: false,
  error: null,
};

export const fetchFinanceOverview = createAsyncThunk(
  'finance/fetchOverview',
  async (
    args: RangeState | { range: RangeState; salesBreakdownMode?: SalesBreakdownMode },
  ) => {
    const range = 'preset' in args ? args : args.range;
    const mode = 'preset' in args ? 'computed' : args.salesBreakdownMode ?? 'computed';
    const params = buildFinanceRangeParams(range);
    return financeApi.fetchOverview({ ...params, salesBreakdownMode: mode });
  },
);

/** Refetch only the Sales Breakdown when the user toggles "Verified by Shopify". */
export const fetchSalesBreakdownOnly = createAsyncThunk(
  'finance/fetchSalesBreakdownOnly',
  async (args: { range: RangeState; mode: SalesBreakdownMode }) => {
    const params = buildFinanceRangeParams(args.range);
    return financeApi.getSalesBreakdown({ ...params, mode: args.mode });
  },
);

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setSalesBreakdownMode(state, action: { payload: SalesBreakdownMode }) {
      state.salesBreakdownMode = action.payload;
    },
  },
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
      })
      .addCase(fetchFinanceOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load finance overview';
      })
      .addCase(fetchSalesBreakdownOnly.pending, (state) => {
        state.loadingSalesBreakdown = true;
      })
      .addCase(fetchSalesBreakdownOnly.fulfilled, (state, action) => {
        state.loadingSalesBreakdown = false;
        state.salesBreakdown = action.payload;
      })
      .addCase(fetchSalesBreakdownOnly.rejected, (state) => {
        state.loadingSalesBreakdown = false;
      });
  },
});

export const { setSalesBreakdownMode } = financeSlice.actions;
export default financeSlice.reducer;
