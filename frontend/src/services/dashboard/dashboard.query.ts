import { useMutation } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchDashboard } from '@store/slices/dashboardSlice';
import baseService from '@services/configs/baseService';
import { toast } from '@/components/ui/toast';

function useRefetchDashboard() {
  const dispatch = useAppDispatch();
  const range = useAppSelector((s) => s.dashboard.range);
  return () => { dispatch(fetchDashboard(range)); };
}

function triggerSync(connector: string) {
  return baseService.post(`/sync/${connector}`).then((r) => r.data);
}

export function useSyncShopify() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('shopify'),
    onSuccess: () => { toast.success('Shopify sync triggered'); refetch(); },
    onError: () => { toast.error('Failed to trigger Shopify sync'); },
  });
}

export function useSyncMeta() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('meta'),
    onSuccess: () => { toast.success('Meta sync triggered'); refetch(); },
    onError: () => { toast.error('Failed to trigger Meta sync'); },
  });
}

export function useSyncIthink() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('ithink'),
    onSuccess: () => { toast.success('iThink sync triggered'); refetch(); },
    onError: () => { toast.error('Failed to trigger iThink sync'); },
  });
}
