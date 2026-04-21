import { cn } from '@/lib/utils';

interface StatusItem { status: string; count: number; }
interface Props { data: StatusItem[] | null; loading: boolean; }

const STATUS_COLOR: Record<string, string> = {
  'Delivered':       '#2D7D46',
  'RTO Delivered':   '#9B2235',
  'RTO In Transit':  '#B45309',
  'In Transit':      '#B8860B',
  'Out For Delivery':'#5A9478',
  'Lost':            '#1A1208',
  'Cancelled':       '#8C7B64',
  'Undelivered':     '#C17A7A',
  'RTO Undelivered': '#C9973A',
  'Picked Up':       '#6B9E7A',
};

function colorFor(status: string): string {
  return STATUS_COLOR[status] ?? '#8C7B64';
}

export function LogisticsCostDonut({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;

  const rows = (data ?? []).slice(0, 6);
  if (!rows.length) return (
    <p className="text-sm text-center py-12" style={{ color: '#8C7B64' }}>No shipment data</p>
  );

  const total = (data ?? []).reduce((s, r) => s + Number(r.count), 0);

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((Number(r.count) / total) * 100) : 0;
        const color = colorFor(r.status);
        return (
          <div key={r.status}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] text-[#1A1208] font-medium">{r.status}</span>
              <span className="text-[11px] text-[#8C7B64]">{r.count} <span className="text-[#C4B49E]">({pct}%)</span></span>
            </div>
            <div className="h-1.5 bg-[#F0EBE0] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500')}
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-[#8C7B64] text-right pt-1">Total: {total} shipments</p>
    </div>
  );
}
