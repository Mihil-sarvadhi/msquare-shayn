import { combineReducers } from '@reduxjs/toolkit';
import authReducer      from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import analyticsReducer from './slices/analyticsSlice';
import rangeReducer     from './slices/rangeSlice';

const rootReducer = combineReducers({
  auth:      authReducer,
  dashboard: dashboardReducer,
  analytics: analyticsReducer,
  range:     rangeReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
