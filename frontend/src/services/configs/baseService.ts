import axios from 'axios';
import { tokenStore } from '@lib/tokenStore';

const baseService = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 15000,
  withCredentials: true,
});

// Attach Bearer token on every request if available in memory
baseService.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

baseService.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 && window.location.pathname !== '/login') {
      tokenStore.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default baseService;
