import { combineReducers } from '@reduxjs/toolkit';
import authReducer      from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import analyticsReducer from './slices/analyticsSlice';
import ga4Reducer       from './slices/ga4Slice';
import rangeReducer     from './slices/rangeSlice';

const rootReducer = combineReducers({
  auth:      authReducer,
  dashboard: dashboardReducer,
  analytics: analyticsReducer,
  ga4:       ga4Reducer,
  range:     rangeReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
