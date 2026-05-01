import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchMarquee } from '@services/marquee/marquee.api';
import type { MarqueePayload } from '@app/types/marquee';
import type { RangeState } from './rangeSlice';

interface MarqueeState {
  data: MarqueePayload | null;
  loading: boolean;
  error: string | null;
}

const initialState: MarqueeState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchMarqueeData = createAsyncThunk('marquee/fetch', async (range: RangeState) =>
  fetchMarquee(range),
);

const marqueeSlice = createSlice({
  name: 'marquee',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMarqueeData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMarqueeData.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(fetchMarqueeData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load marquee';
      });
  },
});

export default marqueeSlice.reducer;
