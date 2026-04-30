import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { unicommerceApi, type UnicommerceParams } from '@services/unicommerce/unicommerce.api';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import type { RangeState } from './rangeSlice';
import type {
  CategoryRow,
  ChannelComparisonRow,
  ChannelReturnsRow,
  ChannelSummaryRow,
  OrderStatusRow,
  ProductByChannelRow,
  RecentOrderRow,
  ReturnsRow,
  RevenueTrendRow,
  TodaySnapshot,
  TopProductRow,
  TopProductWithPctRow,
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
  topCategories: CategoryRow[];
  topProductsPct: TopProductWithPctRow[];
  topProductsByChannel: ProductByChannelRow[];
  channelReturns: ChannelReturnsRow[];
  todaySnapshot: TodaySnapshot | null;
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
  topCategories: [],
  topProductsPct: [],
  topProductsByChannel: [],
  channelReturns: [],
  todaySnapshot: null,
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

export const fetchUnicommerceTodaySnapshot = createAsyncThunk(
  'unicommerce/fetchTodaySnapshot',
  async () => unicommerceApi.getTodaySnapshot(),
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
        state.topCategories = action.payload.topCategories;
        state.topProductsPct = action.payload.topProductsPct;
        state.topProductsByChannel = action.payload.topProductsByChannel;
        state.channelReturns = action.payload.channelReturns;
      })
      .addCase(fetchUnicommerceOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load marketplace data';
      })
      .addCase(fetchUnicommerceTodaySnapshot.fulfilled, (state, action) => {
        state.todaySnapshot = action.payload;
      });
  },
});

export const { setSelectedChannel } = unicommerceSlice.actions;
export default unicommerceSlice.reducer;
