import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchAllDashboard } from '@services/dashboard/dashboard.api';
import type { DashboardState } from '@app/types/dashboard';
import type { RangeState } from './rangeSlice';

const initialState: DashboardState = {
  kpis: null, prevKpis: null, revenueTrend: [], metaFunnel: null, campaigns: [],
  topProducts: [], logistics: [], abandonedCarts: null, health: [],
  reviewsSummary: null, topRatedProducts: [], recentReviews: [],
  recentOrders: [], reviewsTrend: [], revenueVsSpend: [], netRevenue: null,
  loading: false, error: null,
};

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchAll',
  async (range: RangeState) => fetchAllDashboard(range)
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDashboard.fulfilled, (state, action) => { Object.assign(state, action.payload); state.loading = false; })
      .addCase(fetchDashboard.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Failed to load dashboard'; });
  },
});

export default dashboardSlice.reducer;
