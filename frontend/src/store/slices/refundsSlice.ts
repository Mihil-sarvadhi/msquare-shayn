import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { financeApi } from '@services/finance/finance.api';
import { buildFinanceRangeParams } from '@utils/common-functions/buildFinanceRangeParams';
import type { RangeState } from './rangeSlice';
import type { PaginationApi, RefundRowApi } from '@app/types/finance-api';

export interface RefundsState {
  rows: RefundRowApi[];
  pagination: PaginationApi | null;
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  reason: string;
}

const initialState: RefundsState = {
  rows: [],
  pagination: null,
  loading: false,
  error: null,
  page: 1,
  limit: 25,
  reason: '',
};

export const fetchRefunds = createAsyncThunk(
  'refunds/fetch',
  async (args: { range: RangeState; page: number; limit: number; reason?: string }) => {
    const { from, to } = buildFinanceRangeParams(args.range);
    return financeApi.listRefunds({
      from,
      to,
      page: args.page,
      limit: args.limit,
      reason: args.reason || undefined,
    });
  },
);

const refundsSlice = createSlice({
  name: 'refunds',
  initialState,
  reducers: {
    setRefundsPage(state, action: { payload: number }) {
      state.page = action.payload;
    },
    setRefundsReason(state, action: { payload: string }) {
      state.reason = action.payload;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRefunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRefunds.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload.rows;
        state.pagination = action.payload.pagination ?? null;
      })
      .addCase(fetchRefunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load refunds';
      });
  },
});

export const { setRefundsPage, setRefundsReason } = refundsSlice.actions;
export default refundsSlice.reducer;
