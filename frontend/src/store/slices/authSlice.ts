import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import baseService from '@services/configs/baseService';
import { tokenStore } from '@lib/tokenStore';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  initialized: false,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await baseService.post<{ data: { user: AuthUser; token: string } }>(
        '/auth/login',
        credentials,
      );
      const { user, token } = res.data.data;
      tokenStore.set(token);
      return user;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid email or password';
      return rejectWithValue(message);
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await baseService.post('/auth/logout');
  tokenStore.clear();
});

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await baseService.get<{ data: { user: AuthUser; token: string } }>('/auth/me');
      const { user, token } = res.data.data;
      if (token) tokenStore.set(token);
      return user;
    } catch {
      return rejectWithValue('Not authenticated');
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    clearAuth(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(login.pending,    (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled,  (state, action: PayloadAction<AuthUser>) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.initialized = true;
      })
      .addCase(login.rejected,   (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.initialized = true;
      })
      // fetchMe
      .addCase(fetchMe.pending,   (state) => { state.loading = true; })
      .addCase(fetchMe.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.initialized = true;
      })
      .addCase(fetchMe.rejected,  (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.initialized = true;
      });
  },
});

export const { clearError, clearAuth } = authSlice.actions;
export default authSlice.reducer;
