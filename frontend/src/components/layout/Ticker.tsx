import { useMemo } from 'react';
import { useAppSelector } from '@store/hooks';
import { formatINR, formatNum } from '@utils/formatters';
import { cn } from '@/lib/utils';

type Direction = 'up' | 'down' | 'flat';

interface TickerItem {
  label: string;
  value: string;
  delta?: { dir: Direction; text: string };
  /** Lift this item with a soft-gold backdrop + pulsing dot (lead metric). */
  highlight?: boolean;
}

function pct(
  curr: number | null | undefined,
  prev: number | null | undefined,
  opts: { invert?: boolean } = {},
): { dir: Direction; text: string } | undefined {
  const c = Number(curr ?? 0);
  const p = Number(prev ?? 0);
  if (!p) return undefined;
  const change = ((c - p) / p) * 100;
  const positive = opts.invert ? change <= -0.05 : change >= 0.05;
  const negative = opts.invert ? change >= 0.05 : change <= -0.05;
  return {
    dir:  positive ? 'up' : negative ? 'down' : 'flat',
    text: `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%`,
  };
}

/** Integer-count diff (+/- N). Use for orders, customers, NDR — values where
 *  the absolute difference itself is meaningful. */
function countDiff(
  curr: number | null | undefined,
  prev: number | null | undefined,
  opts: { invert?: boolean } = {},
): { dir: Direction; text: string } | undefined {
  const c = Number(curr ?? 0);
  const p = Number(prev ?? 0);
  if (!p && !c) return undefined;
  const d = c - p;
  if (Math.abs(d) < 1) return { dir: 'flat', text: '— flat' };
  const positive = opts.invert ? d < 0 : d > 0;
  return {
    dir:  positive ? 'up' : 'down',
    text: `${d > 0 ? '+' : '−'}${formatNum(Math.abs(d))}`,
  };
}

/** Fixed-decimal ratio diff (e.g. ROAS 1.45× → 1.20×). Reports as % change for
 *  meaning, not raw integer (which rounds sub-1 deltas to 0). */
function ratioDiff(
  curr: number | null | undefined,
  prev: number | null | undefined,
): { dir: Direction; text: string } | undefined {
  return pct(curr, prev);
}

function ppDiff(
  curr: number | null | undefined,
  prev: number | null | undefined,
  opts: { invert?: boolean } = {},
): { dir: Direction; text: string } | undefined {
  const c = Number(curr ?? 0);
  const p = Number(prev ?? 0);
  if (!p && !c) return undefined;
  const d = c - p;
  if (Math.abs(d) < 0.05) return { dir: 'flat', text: '— flat' };
  /* For "lower-is-better" metrics like RTO, invert the colour: arrow still
   *  reflects raw direction, but the dir (which drives green/red) flips. */
  const positive = opts.invert ? d < 0 : d > 0;
  return {
    dir:  positive ? 'up' : 'down',
    text: `${d > 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(1)}pp`,
  };
}

function compactINR(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return formatINR(n);
}

interface TickerTrackProps {
  items: TickerItem[];
  ariaHidden?: boolean;
}

function TickerTrack({ items, ariaHidden }: TickerTrackProps) {
  return (
    <div
      data-ticker-track
      aria-hidden={ariaHidden}
      className="flex shrink-0 items-center gap-12 px-6 py-2 whitespace-nowrap"
      style={{ animation: 'tickerScroll 60s linear infinite' }}
    >
      {items.map((item, i) => (
        <span
          key={`${item.label}-${i}`}
          className={cn(
            'inline-flex items-center gap-2 text-[12px]',
            /* Subtle goldy lift on the lead metric — works in both themes */
            item.highlight &&
              'pl-2 pr-2.5 py-[3px] rounded-full bg-[var(--accent-soft)] ring-1 ring-[var(--accent-soft-2)] shadow-[inset_0_0_0_1px_rgba(184,137,62,0.08)]',
          )}
        >
          {!item.highlight && i > 0 && (
            <span aria-hidden className="w-1 h-1 rounded-full bg-[rgba(184,137,62,0.6)]" />
          )}
          {item.highlight && (
            <span aria-hidden className="relative flex h-[6px] w-[6px] mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-60" />
              <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-[var(--accent)]" />
            </span>
          )}
          <span
            className={cn(
              'text-[10.5px] uppercase tracking-widish font-medium',
              item.highlight ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
            )}
          >
            {item.label}
          </span>
          <span className="font-mono font-medium text-[var(--ink)] tabular-nums">{item.value}</span>
          {item.delta && (
            <span
              className={cn(
                'font-mono tabular-nums',
                item.delta.dir === 'up'   && 'text-[var(--green)]',
                item.delta.dir === 'down' && 'text-[var(--red)]',
                item.delta.dir === 'flat' && 'text-[var(--muted)]',
              )}
            >
              {item.delta.text}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

export function Ticker() {
  const kpis           = useAppSelector((s) => s.dashboard.kpis);
  const prevKpis       = useAppSelector((s) => s.dashboard.prevKpis);
  const abandonedCarts = useAppSelector((s) => s.dashboard.abandonedCarts);
  const netRevenue     = useAppSelector((s) => s.dashboard.netRevenue);
  const range          = useAppSelector((s) => s.range);

  // Lead-tile label reflects the actual range, not always "Today".
  const leadLabel = useMemo(() => {
    if (range.presetKey === 'today')        return 'Today';
    if (range.presetKey === 'yesterday')    return 'Yesterday';
    if (range.presetKey === 'last_7d')      return 'Revenue · 7d';
    if (range.presetKey === 'last_30d')     return 'Revenue · 30d';
    if (range.presetKey === 'last_90d')     return 'Revenue · 90d';
    if (range.presetKey === 'last_365d')    return 'Revenue · 12mo';
    if (range.presetKey === 'mtd')          return 'Revenue · MTD';
    if (range.presetKey === 'qtd')          return 'Revenue · QTD';
    if (range.presetKey === 'ytd')          return 'Revenue · YTD';
    return 'Revenue';
  }, [range.presetKey]);

  // Net revenue = gross revenue − refunds − logistics cost − RTO waste
  // (already computed by backend, exposed as `dashboard.netRevenue`).
  const netRev = netRevenue?.net_revenue;

  // Fulfillment % (delivered / total shipments) — operational health.
  const fulfilled    = (kpis?.totalShipments ?? 0) > 0
    ? ((kpis?.delivered ?? 0) / (kpis?.totalShipments ?? 1)) * 100
    : 0;
  const prevFulfilled = (prevKpis?.totalShipments ?? 0) > 0
    ? ((prevKpis?.delivered ?? 0) / (prevKpis?.totalShipments ?? 1)) * 100
    : 0;

  const items = useMemo<TickerItem[]>(() => [
    { label: leadLabel, value: compactINR(kpis?.revenue),                   delta: pct(kpis?.revenue,        prevKpis?.revenue),         highlight: true },
    { label: 'Net Rev', value: compactINR(netRev),                                                                                                          },
    { label: 'Orders',  value: formatNum(kpis?.orders ?? 0),                delta: countDiff(kpis?.orders,   prevKpis?.orders)            },
    { label: 'AOV',     value: formatINR(kpis?.aov ?? 0),                   delta: pct(kpis?.aov,            prevKpis?.aov)               },
    { label: 'ROAS',    value: `${(kpis?.roas ?? 0).toFixed(2)}×`,          delta: ratioDiff(kpis?.roas,     prevKpis?.roas)              },
    { label: 'RTO',     value: `${(kpis?.rtoRate ?? 0).toFixed(1)}%`,       delta: ppDiff(kpis?.rtoRate,     prevKpis?.rtoRate, { invert: true }) },
    { label: 'NDR',     value: formatNum(kpis?.ndr ?? 0),                   delta: countDiff(kpis?.ndr,      prevKpis?.ndr,     { invert: true }) },
    { label: 'Fulfilled', value: `${fulfilled.toFixed(0)}%`,                delta: ppDiff(fulfilled,         prevFulfilled)                },
    { label: 'Customers', value: formatNum(kpis?.customers ?? 0),           delta: countDiff(kpis?.customers, prevKpis?.customers)         },
    { label: 'Carts',   value: formatNum(abandonedCarts?.count ?? 0)                                                                       },
    { label: 'Ad spend', value: compactINR(kpis?.adSpend),                  delta: pct(kpis?.adSpend,        prevKpis?.adSpend)            },
  ], [leadLabel, kpis, prevKpis, abandonedCarts, netRev, fulfilled, prevFulfilled]);

  return (
    <div
      role="region"
      aria-label="KPI ticker"
      className="group relative overflow-hidden bg-[var(--surface)] border-b border-[var(--line)]
                 [&:hover_[data-ticker-track]]:[animation-play-state:paused]"
    >
      <div className="flex overflow-hidden">
        <TickerTrack items={items} />
        <TickerTrack items={items} ariaHidden />
      </div>
    </div>
  );
}
