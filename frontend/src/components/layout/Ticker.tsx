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

function pct(curr: number | null | undefined, prev: number | null | undefined): { dir: Direction; text: string } | undefined {
  const c = Number(curr ?? 0);
  const p = Number(prev ?? 0);
  if (!p) return undefined;
  const change = ((c - p) / p) * 100;
  return {
    dir:  change >= 0.05 ? 'up' : change <= -0.05 ? 'down' : 'flat',
    text: `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%`,
  };
}

function diff(curr: number | null | undefined, prev: number | null | undefined): { dir: Direction; text: string } | undefined {
  const c = Number(curr ?? 0);
  const p = Number(prev ?? 0);
  if (!p) return undefined;
  const d = c - p;
  return {
    dir:  d >= 1 ? 'up' : d <= -1 ? 'down' : 'flat',
    text: `${d >= 0 ? '↑' : '↓'} ${formatNum(Math.abs(d))}`,
  };
}

function ppDiff(curr: number | null | undefined, prev: number | null | undefined): { dir: Direction; text: string } | undefined {
  const c = Number(curr ?? 0);
  const p = Number(prev ?? 0);
  if (!p) return undefined;
  const d = c - p;
  /* Lower RTO is better — flip direction so down = green */
  return {
    dir:  d <= -0.05 ? 'up' : d >= 0.05 ? 'down' : 'flat',
    text: `${d >= 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(1)}pp`,
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

  const items = useMemo<TickerItem[]>(() => [
    { label: 'Today',     value: compactINR(kpis?.revenue),               delta: pct(kpis?.revenue,   prevKpis?.revenue),   highlight: true },
    { label: 'Orders',    value: formatNum(kpis?.orders ?? 0),            delta: diff(kpis?.orders,   prevKpis?.orders)    },
    { label: 'AOV',       value: formatINR(kpis?.aov ?? 0),               delta: pct(kpis?.aov,       prevKpis?.aov)       },
    { label: 'ROAS',      value: `${(kpis?.roas ?? 0).toFixed(2)}×`,      delta: diff(kpis?.roas,     prevKpis?.roas)      },
    { label: 'RTO',       value: `${(kpis?.rtoRate ?? 0).toFixed(1)}%`,   delta: ppDiff(kpis?.rtoRate, prevKpis?.rtoRate)  },
    { label: 'Carts',     value: formatNum(abandonedCarts?.count ?? 0)                                                      },
    { label: 'Customers', value: formatNum(kpis?.customers ?? 0),         delta: diff(kpis?.customers, prevKpis?.customers) },
    { label: 'Ad spend',  value: compactINR(kpis?.adSpend),               delta: pct(kpis?.adSpend,    prevKpis?.adSpend)   },
  ], [kpis, prevKpis, abandonedCarts]);

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
