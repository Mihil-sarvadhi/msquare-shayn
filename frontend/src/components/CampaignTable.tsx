import React, { useState } from 'react';
import { Campaign } from '../hooks/useDashboard';
import { formatINR, formatNum } from '../utils/formatters';

interface CampaignTableProps {
  campaigns: Campaign[];
  loading: boolean;
}

export default function CampaignTable({ campaigns, loading }: CampaignTableProps) {
  const [sortBy, setSortBy] = useState<keyof Campaign>('spend');

  if (loading) return <div className="h-32 bg-parch animate-pulse rounded-lg" />;
  if (!campaigns.length) return <p className="text-muted text-sm text-center py-8">No campaign data</p>;

  const sorted = [...campaigns].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]));

  const cols: Array<{ key: keyof Campaign; label: string; fmt: (v: number) => string; color?: string }> = [
    { key: 'spend',       label: 'Spend',       fmt: formatINR },
    { key: 'impressions', label: 'Impr.',        fmt: formatNum },
    { key: 'clicks',      label: 'Clicks',       fmt: formatNum },
    { key: 'purchases',   label: 'Conv.',        fmt: formatNum },
    { key: 'roas',        label: 'ROAS',         fmt: (v) => `${parseFloat(String(v)).toFixed(2)}x` },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Sticky header */}
      <div className="grid gap-2 sticky top-0 bg-white pb-1 mb-1 border-b border-parch z-10"
        style={{ gridTemplateColumns: '1fr repeat(5, auto)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Campaign</span>
        {cols.map((c) => (
          <button key={c.key} onClick={() => setSortBy(c.key)}
            className={`text-[10px] font-semibold uppercase tracking-wide text-right transition-colors ${sortBy === c.key ? 'text-gold' : 'text-muted hover:text-ink'}`}>
            {c.label} {sortBy === c.key ? '↓' : ''}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-0">
        {sorted.map((camp) => (
          <div key={camp.campaign_id}
            className="grid gap-2 items-center py-2 border-b border-parch last:border-0 hover:bg-ivory/60 transition-colors rounded"
            style={{ gridTemplateColumns: '1fr repeat(5, auto)' }}>
            {/* Name */}
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium text-ink truncate">{camp.campaign_name}</p>
              <p className="text-[10px] text-muted">{camp.objective?.replace('OUTCOME_', '')}</p>
            </div>
            {/* Metrics */}
            <span className="text-xs text-right font-medium text-ink tabular-nums border-l border-parch pl-2">{formatINR(camp.spend)}</span>
            <span className="text-xs text-right text-muted tabular-nums border-l border-parch pl-2">{formatNum(camp.impressions)}</span>
            <span className="text-xs text-right text-muted tabular-nums border-l border-parch pl-2">{formatNum(camp.clicks)}</span>
            <span className="text-xs text-right text-muted tabular-nums border-l border-parch pl-2">{formatNum(camp.purchases)}</span>
            <span className={`text-xs text-right font-bold tabular-nums border-l border-parch pl-2 ${parseFloat(String(camp.roas)) >= 2 ? 'text-emerald' : parseFloat(String(camp.roas)) >= 1 ? 'text-gold' : 'text-ruby'}`}>
              {parseFloat(String(camp.roas)).toFixed(2)}x
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
