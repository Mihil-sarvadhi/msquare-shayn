import type { ConnectorStatus } from '@utils/constants/master.constant';

interface StatusStyle {
  dot: string;
  badge: string;
  label: string;
}

const STATUS_STYLES: Record<ConnectorStatus, StatusStyle> = {
  healthy: { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200', label: 'Healthy' },
  degraded: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Degraded' },
  down: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200', label: 'Down' },
  unknown: { dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200', label: 'Unknown' },
};

export function getStatusStyle(status: string): StatusStyle {
  return STATUS_STYLES[status as ConnectorStatus] ?? STATUS_STYLES.unknown;
}
