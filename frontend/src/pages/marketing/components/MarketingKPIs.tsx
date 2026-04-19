import type { MarketingTrendItem, AttributionGap } from '@app/types/analytics';
import { formatINR, formatNum, formatPct } from '@utils/formatters';
import { DollarSign, ShoppingBag, Target, Link } from 'lucide-react';

interface Props {
  trend: MarketingTrendItem[];
  attribution: AttributionGap | null;
  loading: boolean;
}

export function MarketingKPIs({ trend, attribution, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-parch" />
        ))}
      </div>
    );
  }

  const totalSpend     = trend.reduce((s, r) => s + Number(r.spend), 0);
  const totalPurchases = trend.reduce((s, r) => s + Number(r.purchases), 0);
  const cpp            = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const attrRate       = attribution?.attribution_rate ?? 0;

  const cards = [
    { label: 'Total Ad Spend',    value: formatINR(totalSpend),     accent: '#9B2235', icon: DollarSign,  bg: '#9B223518' },
    { label: 'Meta Purchases',    value: formatNum(totalPurchases), accent: '#2D7D46', icon: ShoppingBag, bg: '#2D7D4618' },
    { label: 'Cost Per Purchase', value: formatINR(cpp),            accent: '#B45309', icon: Target,      bg: '#B4530918' },
    { label: 'Attribution Rate',  value: formatPct(attrRate),       accent: '#B8860B', icon: Link,        bg: '#B8860B18' },
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
