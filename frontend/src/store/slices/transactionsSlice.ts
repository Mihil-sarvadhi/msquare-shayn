import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { financeApi } from '@services/finance/finance.api';
import { buildFinanceRangeParams } from '@utils/common-functions/buildFinanceRangeParams';
import type { RangeState } from './rangeSlice';
import type { PaginationApi, TxRowApi } from '@app/types/finance-api';

export interface TransactionsState {
  rows: TxRowApi[];
  pagination: PaginationApi | null;
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  gateway: string;
  kind: string;
}

const initialState: TransactionsState = {
  rows: [],
  pagination: null,
  loading: false,
  error: null,
  page: 1,
  limit: 25,
  gateway: '',
  kind: '',
};

export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async (args: {
    range: RangeState;
    page: number;
    limit: number;
    gateway?: string;
    kind?: string;
  }) => {
    const { from, to } = buildFinanceRangeParams(args.range);
    return financeApi.listTransactions({
      from,
      to,
      page: args.page,
      limit: args.limit,
      gateway: args.gateway || undefined,
      kind: args.kind || undefined,
    });
  },
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setTxPage(state, action: { payload: number }) {
      state.page = action.payload;
    },
    setTxGateway(state, action: { payload: string }) {
      state.gateway = action.payload;
      state.page = 1;
    },
    setTxKind(state, action: { payload: string }) {
      state.kind = action.payload;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload.rows;
        state.pagination = action.payload.pagination ?? null;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load transactions';
      });
  },
});

export const { setTxPage, setTxGateway, setTxKind } = transactionsSlice.actions;
export default transactionsSlice.reducer;
