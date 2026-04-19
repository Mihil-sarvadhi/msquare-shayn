import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchAllDashboard } from '@services/dashboard.api';
import type { DashboardState } from '@app/types/dashboard';

const initialState: DashboardState = {
  range: '30d',
  kpis: null, revenueTrend: [], metaFunnel: null, campaigns: [],
  topProducts: [], logistics: [], abandonedCarts: null, health: [],
  reviewsSummary: null, topRatedProducts: [], recentReviews: [],
  loading: false, error: null,
};

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchAll',
  async (range: string) => fetchAllDashboard(range)
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setRange(state, action: PayloadAction<string>) {
      state.range = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
        state.loading = false;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load dashboard';
      });
  },
});

export const { setRange } = dashboardSlice.actions;
export default dashboardSlice.reducer;
