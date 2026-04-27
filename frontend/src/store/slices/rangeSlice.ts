import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type RangePreset = '7d' | '30d' | 'fytd' | 'fqtd' | 'all' | 'custom';

export interface RangeState {
  preset: RangePreset;
  startDate: string;
  endDate: string;
  label?: string;
  /** Picker preset key (e.g. 'last_30d', 'last_365d', 'fq2_2025'). null = custom range. */
  presetKey?: string | null;
}

const initialState: RangeState = {
  preset: '30d',
  startDate: '',
  endDate: '',
  presetKey: 'last_30d',
};

const rangeSlice = createSlice({
  name: 'range',
  initialState,
  reducers: {
    setPreset(state, action: PayloadAction<Exclude<RangePreset, 'custom'>>) {
      state.preset = action.payload;
      state.startDate = '';
      state.endDate = '';
      state.label = undefined;
      state.presetKey = null;
    },
    setCustomRange(
      state,
      action: PayloadAction<{
        startDate: string;
        endDate: string;
        label?: string;
        presetKey?: string | null;
      }>,
    ) {
      state.preset = 'custom';
      state.startDate = action.payload.startDate;
      state.endDate = action.payload.endDate;
      state.label = action.payload.label;
      state.presetKey = action.payload.presetKey ?? null;
    },
  },
});

export const { setPreset, setCustomRange } = rangeSlice.actions;
export default rangeSlice.reducer;
