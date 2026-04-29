import { Activity, IndianRupee, UserCheck, ShoppingBag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppSelector } from '@store/hooks';
import { KpiCard } from '@components/shared/KpiCard';
import { formatINRFull, formatNum } from '@utils/formatters';

interface KpiPair {
  value: number;
  previous: number;
}

function pctDelta(p: KpiPair): number | undefined {
  if (p.previous === 0) return p.value === 0 ? 0 : undefined;
  return ((p.value - p.previous) / Math.abs(p.previous)) * 100;
}

interface Tile {
  label: string;
  pair: KpiPair;
  format: (n: number) => string;
  icon: LucideIcon;
}

/**
 * Four-tile strip mirroring Shopify Admin's Overview KPIs:
 * Sessions · Gross sales · Returning customer rate · Orders.
 *
 * Sessions come from `shopify_analytics_daily` (Shopify Analytics
 * `shopifyqlQuery`). Gross sales reuses `buildBreakdown.totals.gross_sales`
 * per project memory — no recomputation. The other two are derived from
 * `shopify_orders`.
 *
 * Renders nothing until both `kpis` and `salesBreakdown` are populated, so it
 * piggybacks on the existing `fetchFinanceOverview` effect — no new dispatch.
 */
export function StorefrontKpiStrip() {
  const kpis = useAppSelector((s) => s.finance.kpis);
  const breakdown = useAppSelector((s) => s.finance.salesBreakdown);
  if (!kpis || !breakdown) return null;

  const grossPair: KpiPair = {
    value: breakdown.current.totals.gross_sales,
    previous: breakdown.previous.totals.gross_sales,
  };

  const tiles: Tile[] = [
    {
      label: 'Sessions',
      pair: kpis.sessions,
      format: (n) => formatNum(n),
      icon: Activity,
    },
    {
      label: 'Gross sales',
      pair: grossPair,
      format: (n) => formatINRFull(n),
      icon: IndianRupee,
    },
    {
      label: 'Returning customer rate',
      pair: kpis.returning_customer_rate,
      format: (n) => `${n.toFixed(2)}%`,
      icon: UserCheck,
    },
    {
      label: 'Orders',
      pair: kpis.orders,
      format: (n) => formatNum(n),
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <KpiCard
          key={t.label}
          label={t.label}
          value={t.format(t.pair.value)}
          delta={pctDelta(t.pair)}
          icon={t.icon}
        />
      ))}
    </div>
  );
}
