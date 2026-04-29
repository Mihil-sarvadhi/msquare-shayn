import { useMemo } from 'react';
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
  trend?: number[];
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

  // Hooks must run on every render — derive sparklines first, gate render last.
  const grossSpark = useMemo(
    () => breakdown?.current.daily.map((d) => Number(d.gross_sales ?? 0)) ?? [],
    [breakdown],
  );

  if (!kpis || !breakdown) return null;

  const grossPair: KpiPair = {
    value: breakdown.current.totals.gross_sales,
    previous: breakdown.previous.totals.gross_sales,
  };

  // SalesBreakdownDailyPointApi doesn't carry order_count, so the orders tile
  // stays sparkline-less for now (would need a backend daily series to add).
  const ordersSpark: number[] | undefined = undefined;

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
      trend: grossSpark,
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
      trend: ordersSpark,
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
          sub="vs prev"
          trend={t.trend}
        />
      ))}
    </div>
  );
}
