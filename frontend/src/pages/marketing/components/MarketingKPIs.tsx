import type { MarketingTrendItem, AttributionGap } from '@app/types/analytics';
import { formatINR, formatNum, formatPct } from '@utils/formatters';
import { DollarSign, ShoppingBag, Target, Link } from 'lucide-react';
import { KpiCard } from '@components/shared/KpiCard';

interface Props {
  trend: MarketingTrendItem[];
  attribution: AttributionGap | null;
  loading: boolean;
}

export function MarketingKPIs({ trend, attribution, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <KpiCard key={i} label="" value="" loading />)}
      </div>
    );
  }

  const totalSpend     = trend.reduce((s, r) => s + Number(r.spend), 0);
  const totalPurchases = trend.reduce((s, r) => s + Number(r.purchases), 0);
  const cpp            = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const attrRate       = attribution?.attribution_rate ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard label="Total Ad Spend"    value={formatINR(totalSpend)}     icon={DollarSign}  />
      <KpiCard label="Meta Purchases"    value={formatNum(totalPurchases)} icon={ShoppingBag} />
      <KpiCard label="Cost Per Purchase" value={formatINR(cpp)}            icon={Target}      />
      <KpiCard label="Attribution Rate"  value={formatPct(attrRate)}       icon={Link}        />
    </div>
  );
}
