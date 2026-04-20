import type { KPIs } from '@app/types/dashboard';
import { formatNum, formatPct } from '@utils/formatters';

interface Props {
  kpis: KPIs | null;
  loading: boolean;
}

export default function LogisticsSummary({ kpis, loading }: Props) {
  if (loading) return <div className="h-16 bg-parch animate-pulse rounded-lg" />;
  if (!kpis) return null;

  const inTransit = kpis.totalShipments - kpis.delivered - kpis.rto;

  const stats = [
    { label: 'Delivered', value: kpis.delivered, color: 'text-emerald', dot: 'bg-emerald' },
    { label: 'In Transit', value: inTransit,      color: 'text-ink',    dot: 'bg-muted'   },
    { label: 'OFD',        value: kpis.ofd,       color: 'text-amber',  dot: 'bg-amber'   },
    { label: 'RTO',        value: kpis.rto,       color: 'text-ruby',   dot: 'bg-ruby'    },
    { label: 'NDR',        value: kpis.ndr,       color: 'text-ruby',   dot: 'bg-ruby'    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center">
            <span className={`text-xl font-bold ${s.color}`}>{formatNum(s.value)}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
              <span className="text-[11px] text-muted whitespace-nowrap">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="h-px bg-parch" />

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Total Shipments</span>
        <span className="font-medium text-ink">{formatNum(kpis.totalShipments)}</span>
        <span className="text-muted">RTO Rate</span>
        <span className={`font-bold ${kpis.rtoRate > 20 ? 'text-ruby' : 'text-emerald'}`}>
          {formatPct(kpis.rtoRate)}
        </span>
      </div>
    </div>
  );
}
