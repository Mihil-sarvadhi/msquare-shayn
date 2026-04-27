import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { riskApi } from '@services/marketing/marketing.api';
import type { DisputeRowApi, RiskKpisApi } from '@app/types/marketing-api';
import type { PaginationApi } from '@app/types/finance-api';

export interface RiskState {
  kpis: RiskKpisApi | null;
  activeDisputes: DisputeRowApi[];
  allDisputes: DisputeRowApi[];
  allDisputesPagination: PaginationApi | null;
  loading: boolean;
  error: string | null;
}

const initialState: RiskState = {
  kpis: null,
  activeDisputes: [],
  allDisputes: [],
  allDisputesPagination: null,
  loading: false,
  error: null,
};

export const fetchRiskOverview = createAsyncThunk('risk/fetchOverview', async () => {
  const [kpis, activeDisputes, allDisputes] = await Promise.all([
    riskApi.getKpis(),
    riskApi.getActiveDisputes(),
    riskApi.listDisputes({ page: 1, limit: 100 }),
  ]);
  return { kpis, activeDisputes, allDisputes };
});

const riskSlice = createSlice({
  name: 'risk',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRiskOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRiskOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.kpis = action.payload.kpis;
        state.activeDisputes = action.payload.activeDisputes;
        state.allDisputes = action.payload.allDisputes.rows;
        state.allDisputesPagination = action.payload.allDisputes.pagination ?? null;
      })
      .addCase(fetchRiskOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load risk overview';
      });
  },
});

export default riskSlice.reducer;
