import React from 'react';
import { MetaFunnel as MetaFunnelType } from '../hooks/useDashboard';
import { formatNum, formatINR } from '../utils/formatters';

interface MetaFunnelProps {
  data: MetaFunnelType | null;
  loading: boolean;
}

export default function MetaFunnel({ data, loading }: MetaFunnelProps) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data) return <p className="text-muted text-sm text-center py-12">No data</p>;

  const stats = [
    { label: 'Impressions', value: formatNum(data.impressions) },
    { label: 'Clicks', value: formatNum(data.clicks) },
    { label: 'Purchases', value: formatNum(data.purchases) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-parch rounded-lg p-3">
          <p className="text-xs text-muted mb-0.5">Total Spend</p>
          <p className="font-bold text-ink">{formatINR(data.spend)}</p>
        </div>
        <div className="bg-parch rounded-lg p-3">
          <p className="text-xs text-muted mb-0.5">ROAS</p>
          <p className="font-bold text-emerald">{parseFloat(String(data.roas || 0)).toFixed(2)}x</p>
        </div>
      </div>

      <div className="space-y-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-parch last:border-0">
            <span className="text-sm text-muted">{label}</span>
            <span className="text-sm font-semibold text-ink">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
