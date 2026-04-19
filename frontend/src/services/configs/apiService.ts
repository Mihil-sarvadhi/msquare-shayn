import baseService from './baseService';

const apiService = {
  get: <T>(url: string, params?: Record<string, string>) =>
    baseService.get<{ data: T }>(url, { params }).then((r) => r.data.data),
  post: <T>(url: string, data?: unknown) =>
    baseService.post<{ data: T }>(url, data).then((r) => r.data.data),
  put: <T>(url: string, data?: unknown) =>
    baseService.put<{ data: T }>(url, data).then((r) => r.data.data),
  delete: <T>(url: string) =>
    baseService.delete<{ data: T }>(url).then((r) => r.data.data),
};

export default apiService;
