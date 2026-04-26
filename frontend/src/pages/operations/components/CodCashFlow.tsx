import type { CodCashFlow as CodCashFlowType } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';

interface Props { data: CodCashFlowType | null; loading: boolean; }

export function CodCashFlow({ data, loading }: Props) {
  if (loading || !data) return <div className="h-24 bg-parch animate-pulse rounded-lg" />;

  const items = [
    { label: 'COD Generated', value: formatINR(data.cod_generated), color: '#2D7D46' },
    { label: 'COD Remitted',  value: formatINR(data.cod_remitted),  color: '#B8860B' },
    { label: 'Pending',       value: formatINR(data.pending),       color: '#9B2235' },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-parch">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3 text-center">
          <p className="text-xs text-muted mb-1.5">{item.label}</p>
          <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
