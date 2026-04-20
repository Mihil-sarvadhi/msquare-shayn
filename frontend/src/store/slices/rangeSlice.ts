import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type RangePreset = '7d' | '30d' | 'all' | 'custom';

export interface RangeState {
  preset: RangePreset;
  startDate: string;
  endDate: string;
}

const initialState: RangeState = { preset: '30d', startDate: '', endDate: '' };

const rangeSlice = createSlice({
  name: 'range',
  initialState,
  reducers: {
    setPreset(state, action: PayloadAction<Exclude<RangePreset, 'custom'>>) {
      state.preset = action.payload;
      state.startDate = '';
      state.endDate = '';
    },
    setCustomRange(state, action: PayloadAction<{ startDate: string; endDate: string }>) {
      state.preset = 'custom';
      state.startDate = action.payload.startDate;
      state.endDate = action.payload.endDate;
    },
  },
});

export const { setPreset, setCustomRange } = rangeSlice.actions;
export default rangeSlice.reducer;
