import { useState } from 'react';
import { Campaign } from '@app/types/dashboard';
import { formatINR, formatNum } from '@utils/formatters';
import { cn } from '@/lib/utils';

interface CampaignTableProps {
  campaigns: Campaign[];
  loading: boolean;
}

export default function CampaignTable({ campaigns, loading }: CampaignTableProps) {
  const [sortBy, setSortBy] = useState<keyof Campaign>('spend');

  if (loading) return <div className="h-32 bg-[var(--bg-2)] animate-pulse rounded-lg" />;
  if (!campaigns.length) return <p className="text-[var(--muted)] text-sm text-center py-8">No campaign data</p>;

  const sorted = [...campaigns].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]));

  const cols: Array<{ key: keyof Campaign; label: string; fmt: (v: number) => string; color?: string }> = [
    { key: 'spend',       label: 'Spend',       fmt: formatINR },
    { key: 'impressions', label: 'Impr.',        fmt: formatNum },
    { key: 'clicks',      label: 'Clicks',       fmt: formatNum },
    { key: 'purchases',   label: 'Conv.',        fmt: formatNum },
    { key: 'roas',        label: 'ROAS',         fmt: (v) => `${parseFloat(String(v)).toFixed(2)}x` },
  ];

  const COLS = '1fr 76px 88px 68px 56px 60px';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Sticky header */}
      <div
        className="grid sticky top-0 bg-[var(--surface)] pb-1 mb-1 border-b border-[var(--line)] z-10"
        style={{ gridTemplateColumns: COLS }}
      >
        <span className="text-[10px] font-medium uppercase tracking-widish text-[var(--muted)]">Campaign</span>
        {cols.map((c) => (
          <button
            key={c.key}
            onClick={() => setSortBy(c.key)}
            className={cn(
              'text-[10px] font-medium uppercase tracking-widish text-right pl-2 transition-colors',
              sortBy === c.key ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--ink)]',
            )}
          >
            {c.label} {sortBy === c.key ? '↓' : ''}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-0">
        {sorted.map((camp) => (
          <div
            key={camp.campaign_id}
            className="grid items-center py-2 border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] transition-colors rounded"
            style={{ gridTemplateColumns: COLS }}
          >
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium text-[var(--ink)] truncate">{camp.campaign_name}</p>
              <p className="text-[10px] text-[var(--muted)]">{camp.objective?.replace('OUTCOME_', '')}</p>
            </div>
            <span className="text-xs text-right font-medium text-[var(--ink)] tabular-nums pl-2 font-mono">{formatINR(camp.spend)}</span>
            <span className="text-xs text-right text-[var(--muted)] tabular-nums pl-2 font-mono">{formatNum(camp.impressions)}</span>
            <span className="text-xs text-right text-[var(--muted)] tabular-nums pl-2 font-mono">{formatNum(camp.clicks)}</span>
            <span className="text-xs text-right text-[var(--muted)] tabular-nums pl-2 font-mono">{formatNum(camp.purchases)}</span>
            <span className={cn(
              'text-xs text-right font-medium tabular-nums pl-2 font-mono',
              parseFloat(String(camp.roas)) >= 2
                ? 'text-[var(--green)]'
                : parseFloat(String(camp.roas)) >= 1
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--red)]',
            )}>
              {parseFloat(String(camp.roas)).toFixed(2)}x
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
