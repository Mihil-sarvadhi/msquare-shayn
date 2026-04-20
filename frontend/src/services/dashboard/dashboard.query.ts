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

export function useSyncJudgeme() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('judgeme'),
    onSuccess: () => { toast.success('Judge.me sync triggered'); refetch(); },
    onError: () => { toast.error('Failed to trigger Judge.me sync'); },
  });
}

export function useSyncAll() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('all'),
    onSuccess: (res: unknown) => {
      const data = res as { results?: Record<string, string> } | undefined;
      const failed = Object.values(data?.results ?? {}).filter((v) => v !== 'ok').length;
      if (failed === 0) {
        toast.success('All connectors synced successfully');
      } else {
        toast.warning(`Sync done — ${failed} connector(s) had errors`);
      }
      refetch();
    },
    onError: () => { toast.error('Full sync failed'); },
  });
}
