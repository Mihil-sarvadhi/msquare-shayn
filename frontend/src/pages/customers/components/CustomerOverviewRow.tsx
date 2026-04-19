import type { CustomerOverview } from '@app/types/analytics';
import { formatNum, formatPct } from '@utils/formatters';
import { Users, UserPlus, RefreshCw, Repeat2 } from 'lucide-react';

interface Props { data: CustomerOverview | null; loading: boolean; }

export function CustomerOverviewRow({ data, loading }: Props) {
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
    { label: 'Total Customers',     value: formatNum(data.total_customers),     accent: '#B8860B', icon: Users,     bg: '#B8860B18' },
    { label: 'New Customers',       value: formatNum(data.new_customers),       accent: '#2D7D46', icon: UserPlus,  bg: '#2D7D4618' },
    { label: 'Returning Customers', value: formatNum(data.returning_customers), accent: '#B45309', icon: RefreshCw, bg: '#B4530918' },
    { label: 'Repeat Rate',         value: formatPct(data.repeat_rate),         accent: '#1A1208', icon: Repeat2,   bg: '#1A120815' },
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
