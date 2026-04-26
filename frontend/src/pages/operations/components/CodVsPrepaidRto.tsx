import type { CodVsPrepaidItem } from '@app/types/analytics';
import { formatNum, formatPct } from '@utils/formatters';

interface Props { data: CodVsPrepaidItem[]; loading: boolean; }

export function CodVsPrepaidRto({ data, loading }: Props) {
  if (loading) return <div className="h-40 bg-parch animate-pulse rounded-lg" />;

  const cod     = data.find((d) => d.payment_mode === 'COD');
  const prepaid = data.find((d) => d.payment_mode === 'Prepaid');

  const statCard = (label: string, item: CodVsPrepaidItem | undefined, accent: string) => (
    <div className="flex-1 rounded-xl border border-parch p-4" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: accent }}>{label}</p>
      <div className="space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Total Shipments</span>
          <span className="font-medium text-ink">{formatNum(item?.total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">RTOs</span>
          <span className="font-medium text-ink">{formatNum(item?.rto_count)}</span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-muted">RTO Rate</span>
          <span className="font-bold text-xl" style={{ color: accent }}>{formatPct(item?.rto_rate)}</span>
        </div>
      </div>
    </div>
  );

  const codRate     = Number(cod?.rto_rate ?? 0);
  const prepaidRate = Number(prepaid?.rto_rate ?? 0);
  const multiplier  = prepaidRate > 0 ? (codRate / prepaidRate).toFixed(1) : null;

  return (
    <div>
      <div className="flex gap-3">
        {statCard('COD', cod, '#9B2235')}
        {statCard('Prepaid', prepaid, '#2D7D46')}
      </div>
      {multiplier && (
        <p className="text-xs text-muted text-center mt-4">
          COD returns at{' '}
          <span className="font-semibold text-[#9B2235]">{multiplier}×</span>{' '}
          the rate of Prepaid
        </p>
      )}
    </div>
  );
}
