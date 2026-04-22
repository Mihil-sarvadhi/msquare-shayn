import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchGA4, fetchGA4Realtime } from '@services/ga4/ga4.api';
import type { RangeState } from './rangeSlice';
import type {
  GA4Summary, GA4TrafficDaily, GA4Channel, GA4EcommerceDaily,
  GA4Product, GA4Device, GA4Geography, GA4Realtime,
} from '@app/types/ga4';

interface GA4State {
  summary:   GA4Summary | null;
  overview:  GA4TrafficDaily[];
  channels:  GA4Channel[];
  ecommerce: GA4EcommerceDaily[];
  products:  GA4Product[];
  devices:   GA4Device[];
  geography: GA4Geography[];
  realtime:  GA4Realtime[];
  loading:   boolean;
  error:     string | null;
}

const initialState: GA4State = {
  summary:   null,
  overview:  [],
  channels:  [],
  ecommerce: [],
  products:  [],
  devices:   [],
  geography: [],
  realtime:  [],
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
      .addCase(refreshGA4Realtime.fulfilled, (s, a) => { s.realtime = a.payload; });
  },
});

export default ga4Slice.reducer;
