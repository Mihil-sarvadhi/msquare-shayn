import { combineReducers } from '@reduxjs/toolkit';
import dashboardReducer from './slices/dashboardSlice';
import analyticsReducer from './slices/analyticsSlice';

const rootReducer = combineReducers({
  dashboard: dashboardReducer,
  analytics: analyticsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
