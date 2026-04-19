import type { NetRevenue } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';
import { IndianRupee, Truck, TrendingUp, PackageX } from 'lucide-react';

interface Props { data: NetRevenue | null; loading: boolean; }

export function NetRevenueRow({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-parch" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Gross Revenue',  value: formatINR(data.gross_revenue),  accent: '#2D7D46', icon: IndianRupee, bg: '#2D7D4618' },
    { label: 'Logistics Cost', value: formatINR(data.logistics_cost), accent: '#B45309', icon: Truck,       bg: '#B4530918' },
    { label: 'Net Revenue',    value: formatINR(data.net_revenue),    accent: '#B8860B', icon: TrendingUp,  bg: '#B8860B18' },
    { label: 'RTO Waste',      value: formatINR(data.rto_waste),      accent: '#9B2235', icon: PackageX,    bg: '#9B223518' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-parch shadow-card overflow-hidden">
          <div className="h-1 w-full" style={{ backgroundColor: c.accent }} />
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
              <div className="rounded-lg p-1.5" style={{ backgroundColor: c.bg }}>
                <c.icon size={13} strokeWidth={1.5} style={{ color: c.accent }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
