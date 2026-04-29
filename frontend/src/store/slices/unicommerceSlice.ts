import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { unicommerceApi, type UnicommerceParams } from '@services/unicommerce/unicommerce.api';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import type { RangeState } from './rangeSlice';
import type {
  ChannelComparisonRow,
  ChannelSummaryRow,
  OrderStatusRow,
  RecentOrderRow,
  ReturnsRow,
  RevenueTrendRow,
  TopProductRow,
  UnicommerceChannel,
} from '@app/types/unicommerce-api';

export type ChannelTab = UnicommerceChannel | 'ALL';

export interface UnicommerceState {
  summary: ChannelSummaryRow[];
  revenueTrend: RevenueTrendRow[];
  topProducts: TopProductRow[];
  orderStatus: OrderStatusRow[];
  channelComparison: ChannelComparisonRow[];
  returns: ReturnsRow[];
  recentOrders: RecentOrderRow[];
  selectedChannel: ChannelTab;
  loading: boolean;
  error: string | null;
}

const initialState: UnicommerceState = {
  summary: [],
  revenueTrend: [],
  topProducts: [],
  orderStatus: [],
  channelComparison: [],
  returns: [],
  recentOrders: [],
  selectedChannel: 'ALL',
  loading: false,
  error: null,
};

interface FetchPayload {
  range: RangeState;
  channel: ChannelTab;
}

export const fetchUnicommerceOverview = createAsyncThunk(
  'unicommerce/fetchOverview',
  async ({ range, channel }: FetchPayload) => {
    const params: UnicommerceParams = buildRangeParams(range);
    if (channel !== 'ALL') params.channel = channel;
    return unicommerceApi.fetchOverview(params);
  },
);

const unicommerceSlice = createSlice({
  name: 'unicommerce',
  initialState,
  reducers: {
    setSelectedChannel(state, action: PayloadAction<ChannelTab>) {
      state.selectedChannel = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnicommerceOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUnicommerceOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload.summary;
        state.revenueTrend = action.payload.revenueTrend;
        state.topProducts = action.payload.topProducts;
        state.orderStatus = action.payload.orderStatus;
        state.channelComparison = action.payload.channelComparison;
        state.returns = action.payload.returns;
        state.recentOrders = action.payload.recentOrders;
      })
      .addCase(fetchUnicommerceOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load marketplace data';
      });
  },
});

export const { setSelectedChannel } = unicommerceSlice.actions;
export default unicommerceSlice.reducer;
