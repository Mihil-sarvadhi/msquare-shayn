import { AlertTriangle, PackageX, Banknote, TrendingDown } from 'lucide-react';
import type { MoneyStuck as MoneyStuckType } from '@app/types/analytics';
import { formatINR, formatNum } from '@utils/formatters';

interface MoneyStuckProps {
  data: MoneyStuckType | null;
  loading: boolean;
}

export function MoneyStuck({ data, loading }: MoneyStuckProps) {
  if (loading) return <div className="h-28 bg-parch animate-pulse rounded-lg" />;
  if (!data) return null;

  const items = [
    {
      label: 'RTO Orders',
      sublabel: 'Shipments returned to origin',
      value: formatNum(data.rto_count),
      icon: PackageX,
      color: '#9B2235',
    },
    {
      label: 'Revenue in RTOs',
      sublabel: 'Order value locked in returns',
      value: formatINR(data.rto_order_value),
      icon: TrendingDown,
      color: '#9B2235',
    },
    {
      label: 'COD Pending',
      sublabel: 'Remittance not yet settled',
      value: formatINR(data.cod_pending),
      icon: Banknote,
      color: '#B45309',
    },
    {
      label: 'Total at Risk',
      sublabel: 'Money not yet recovered',
      value: formatINR(data.total_stuck),
      icon: AlertTriangle,
      color: '#9B2235',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map(({ label, sublabel, value, icon: Icon, color }) => (
        <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-parch/50">
          <div className="mt-0.5 p-1.5 rounded-md" style={{ backgroundColor: `${color}18` }}>
            <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs text-muted leading-tight mb-0.5">{label}</p>
            <p className="font-bold text-ink text-sm">{value}</p>
            <p className="text-xs text-muted mt-0.5">{sublabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
