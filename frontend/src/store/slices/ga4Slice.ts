import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchGA4, fetchGA4Realtime, fetchGA4RealtimeWidget } from '@services/ga4/ga4.api';
import type { RangeState } from './rangeSlice';
import type {
  GA4Summary, GA4TrafficDaily, GA4Channel, GA4EcommerceDaily,
  GA4Product, GA4Realtime, GA4RealtimeWidget, GA4PageScreen, GA4SummaryInsights, GA4CountryActiveUsers,
} from '@app/types/ga4';

interface GA4State {
  summary:   GA4Summary | null;
  summaryInsights: GA4SummaryInsights | null;
  overview:  GA4TrafficDaily[];
  channels:  GA4Channel[];
  ecommerce: GA4EcommerceDaily[];
  products:  GA4Product[];
  realtime:  GA4Realtime[];
  countryActiveUsers: GA4CountryActiveUsers[];
  realtimeWidget: GA4RealtimeWidget | null;
  pagesScreens: GA4PageScreen[];
  realtimeWidgetLoading: boolean;
  loading:   boolean;
  error:     string | null;
}

const initialState: GA4State = {
  summary:   null,
  summaryInsights: null,
  overview:  [],
  channels:  [],
  ecommerce: [],
  products:  [],
  realtime:  [],
  countryActiveUsers: [],
  realtimeWidget: null,
  pagesScreens: [],
  realtimeWidgetLoading: false,
  loading:   false,
  error:     null,
};

export const fetchGA4Data = createAsyncThunk(
  'ga4/fetchAll',
  async (range: RangeState) => fetchGA4(range),
);

export const refreshGA4Realtime = createAsyncThunk(
  'ga4/refreshRealtime',
  async () => fetchGA4Realtime(),
);

export const fetchGA4RealtimeWidgetData = createAsyncThunk(
  'ga4/fetchRealtimeWidget',
  async (query: { location: 'country' | 'city'; metric: 'activeUsers' | 'newUsers' }) =>
    fetchGA4RealtimeWidget(query.location, query.metric),
);

const ga4Slice = createSlice({
  name: 'ga4',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGA4Data.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchGA4Data.fulfilled, (s, a) => {
        Object.assign(s, a.payload);
        s.loading = false;
      })
      .addCase(fetchGA4Data.rejected,  (s, a) => {
        s.loading = false;
        s.error = a.error.message ?? 'Failed to fetch GA4 data';
      })
      .addCase(refreshGA4Realtime.fulfilled, (s, a) => { s.realtime = a.payload; })
      .addCase(fetchGA4RealtimeWidgetData.pending, (s) => {
        s.realtimeWidgetLoading = true;
      })
      .addCase(fetchGA4RealtimeWidgetData.fulfilled, (s, a) => {
        s.realtimeWidget = a.payload;
        s.realtimeWidgetLoading = false;
      })
      .addCase(fetchGA4RealtimeWidgetData.rejected, (s) => {
        s.realtimeWidgetLoading = false;
      });
  },
});

export default ga4Slice.reducer;
