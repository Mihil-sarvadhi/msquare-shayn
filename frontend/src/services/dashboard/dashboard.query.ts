import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchDashboard } from '@store/slices/dashboardSlice';
import baseService from '@services/configs/baseService';

function useRefetchDashboard() {
  const dispatch = useAppDispatch();
  const range = useAppSelector((s) => s.range);
  return useCallback(() => { dispatch(fetchDashboard(range)); }, [dispatch, range]);
}

function triggerSync(connector: string) {
  return baseService.post(`/sync/${connector}`).then((r) => r.data);
}

export function useSyncShopify() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('shopify'),
    onSuccess: () => { refetch(); },
    onError:   () => {},
  });
}

export function useSyncMeta() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('meta'),
    onSuccess: () => { refetch(); },
    onError:   () => {},
  });
}

export function useSyncIthink() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('ithink'),
    onSuccess: () => { refetch(); },
    onError:   () => {},
  });
}

export function useSyncJudgeme() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('judgeme'),
    onSuccess: () => { refetch(); },
    onError:   () => {},
  });
}

export function useSyncGA4() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('ga4'),
    onSuccess: () => { refetch(); },
    onError:   () => {},
  });
}

export function useSyncAll() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('all'),
    onSuccess: () => {
      refetch();
      setTimeout(refetch, 60_000);
    },
    onError: () => {},
  });
}
