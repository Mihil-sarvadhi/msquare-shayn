import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchOperations, fetchCustomers, fetchMarketing } from '@services/analytics/analytics.api';
import type { AnalyticsState } from '@app/types/analytics';
import type { RangeState } from './rangeSlice';

const initialState: AnalyticsState = {
  netRevenue: null, rtoByState: [], codVsPrepaidRto: [], geoRevenue: [],
  logisticsCosts: null, codCashFlow: null,
  customerOverview: null, customerSegments: [], topCustomers: [], discountAnalysis: [],
  marketingTrend: [], attributionGap: null, topSkus: [], moneyStuck: null, channelRevenue: null,
  loadingOperations: false, loadingCustomers: false, loadingMarketing: false, error: null,
};

export const fetchOperationsData = createAsyncThunk(
  'analytics/fetchOperations',
  async (range: RangeState) => fetchOperations(range)
);

export const fetchCustomersData = createAsyncThunk(
  'analytics/fetchCustomers',
  async (range: RangeState) => fetchCustomers(range)
);

export const fetchMarketingData = createAsyncThunk(
  'analytics/fetchMarketing',
  async (range: RangeState) => fetchMarketing(range)
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOperationsData.pending,   (s) => { s.loadingOperations = true;  s.error = null; })
      .addCase(fetchOperationsData.fulfilled, (s, a) => { Object.assign(s, a.payload); s.loadingOperations = false; })
      .addCase(fetchOperationsData.rejected,  (s, a) => { s.loadingOperations = false; s.error = a.error.message ?? 'Failed'; })
      .addCase(fetchCustomersData.pending,    (s) => { s.loadingCustomers = true;   s.error = null; })
      .addCase(fetchCustomersData.fulfilled,  (s, a) => { Object.assign(s, a.payload); s.loadingCustomers = false; })
      .addCase(fetchCustomersData.rejected,   (s, a) => { s.loadingCustomers = false;  s.error = a.error.message ?? 'Failed'; })
      .addCase(fetchMarketingData.pending,    (s) => { s.loadingMarketing = true;   s.error = null; })
      .addCase(fetchMarketingData.fulfilled,  (s, a) => { Object.assign(s, a.payload); s.loadingMarketing = false; })
      .addCase(fetchMarketingData.rejected,   (s, a) => { s.loadingMarketing = false;  s.error = a.error.message ?? 'Failed'; });
  },
});

export default analyticsSlice.reducer;
