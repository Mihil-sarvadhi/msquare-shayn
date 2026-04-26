import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { financeApi } from '@services/finance/finance.api';
import { buildFinanceRangeParams } from '@utils/common-functions/buildFinanceRangeParams';
import type { RangeState } from './rangeSlice';
import type {
  PaginationApi,
  PayoutDetailApi,
  PayoutSummaryApi,
} from '@app/types/finance-api';

export interface PayoutsState {
  rows: PayoutSummaryApi[];
  pagination: PaginationApi | null;
  detail: PayoutDetailApi | null;
  loading: boolean;
  loadingDetail: boolean;
  error: string | null;
  page: number;
  limit: number;
  status: string;
}

const initialState: PayoutsState = {
  rows: [],
  pagination: null,
  detail: null,
  loading: false,
  loadingDetail: false,
  error: null,
  page: 1,
  limit: 25,
  status: '',
};

export const fetchPayouts = createAsyncThunk(
  'payouts/fetch',
  async (args: { range: RangeState; page: number; limit: number; status?: string }) => {
    const { from, to } = buildFinanceRangeParams(args.range);
    return financeApi.listPayouts({
      from,
      to,
      page: args.page,
      limit: args.limit,
      status: args.status || undefined,
    });
  },
);

export const fetchPayoutDetail = createAsyncThunk(
  'payouts/fetchDetail',
  async (id: number) => financeApi.getPayoutDetail(id),
);

const payoutsSlice = createSlice({
  name: 'payouts',
  initialState,
  reducers: {
    setPage(state, action: { payload: number }) {
      state.page = action.payload;
    },
    setStatusFilter(state, action: { payload: string }) {
      state.status = action.payload;
      state.page = 1;
    },
    closeDetail(state) {
      state.detail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayouts.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload.rows;
        state.pagination = action.payload.pagination ?? null;
      })
      .addCase(fetchPayouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load payouts';
      })
      .addCase(fetchPayoutDetail.pending, (state) => {
        state.loadingDetail = true;
      })
      .addCase(fetchPayoutDetail.fulfilled, (state, action) => {
        state.loadingDetail = false;
        state.detail = action.payload;
      })
      .addCase(fetchPayoutDetail.rejected, (state) => {
        state.loadingDetail = false;
      });
  },
});

export const { setPage, setStatusFilter, closeDetail } = payoutsSlice.actions;
export default payoutsSlice.reducer;
