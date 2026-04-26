import { combineReducers } from '@reduxjs/toolkit';
import authReducer      from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import analyticsReducer from './slices/analyticsSlice';
import ga4Reducer       from './slices/ga4Slice';
import rangeReducer     from './slices/rangeSlice';
import financeReducer   from './slices/financeSlice';
import payoutsReducer   from './slices/payoutsSlice';
import refundsReducer   from './slices/refundsSlice';
import transactionsReducer from './slices/transactionsSlice';

const rootReducer = combineReducers({
  auth:         authReducer,
  dashboard:    dashboardReducer,
  analytics:    analyticsReducer,
  ga4:          ga4Reducer,
  range:        rangeReducer,
  finance:      financeReducer,
  payouts:      payoutsReducer,
  refunds:      refundsReducer,
  transactions: transactionsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
