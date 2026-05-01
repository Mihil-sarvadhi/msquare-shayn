import { Fragment, useMemo } from 'react';
import { useAppSelector } from '@store/hooks';
import { formatINR, formatNum } from '@utils/formatters';
import { cn } from '@/lib/utils';
import type {
  MarqueePayload,
  MarqueeFinance,
  MarqueeSales,
  MarqueeMarketing,
  MarqueeOperations,
  MarqueeCustomers,
  MarqueeReviews,
} from '@app/types/marquee';

/* ─── Delta helpers (shared with the old ticker logic) ─────────────────── */

type Direction = 'up' | 'down' | 'flat';

interface Delta {
  dir: Direction;
  text: string;
}

function pct(curr: number | null | undefined, prev: number | null | undefined, opts: { invert?: boolean } = {}): Delta | undefined {
  const c = Number(curr ?? 0);
  const p = Number(prev ?? 0);
  if (!p) return undefined;
  const change = ((c - p) / p) * 100;
  const positive = opts.invert ? change <= -0.05 : change >= 0.05;
  const negative = opts.invert ? change >= 0.05 : change <= -0.05;
  return {
    dir: positive ? 'up' : negative ? 'down' : 'flat',
    text: `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%`,
  };
}

function countDiff(curr: number | null | undefined, prev: number | null | undefined, opts: { invert?: boolean } = {}): Delta | undefined {
  const c = Number(curr ?? 0);
  const p = Number(prev ?? 0);
  if (!p && !c) return undefined;
  const d = c - p;
  if (Math.abs(d) < 1) return { dir: 'flat', text: '— flat' };
  const positive = opts.invert ? d < 0 : d > 0;
  return {
    dir: positive ? 'up' : 'down',
    text: `${d > 0 ? '+' : '−'}${formatNum(Math.abs(d))}`,
  };
}

function ppDiff(curr: number | null | undefined, prev: number | null | undefined, opts: { invert?: boolean } = {}): Delta | undefined {
  const c = Number(curr ?? 0);
  const p = Number(prev ?? 0);
  if (!p && !c) return undefined;
  const d = c - p;
  if (Math.abs(d) < 0.05) return { dir: 'flat', text: '— flat' };
  const positive = opts.invert ? d < 0 : d > 0;
  return {
    dir: positive ? 'up' : 'down',
    text: `${d > 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(1)}pp`,
  };
}

function compactINR(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return formatINR(n);
}

/* ─── Item + Group rendering ──────────────────────────────────────────── */

interface MarqueeItem {
  label: string;
  value: string;
  delta?: Delta;
}

interface MarqueeGroup {
  /** Stable key used for React keys. */
  key: string;
  label: string;
  /** Tailwind tokens — kept inline so the renderer doesn't need a registry. */
  bgClass: string;
  borderClass: string;
  titleClass: string;
  items: MarqueeItem[];
}

function GroupBlock({ group }: { group: MarqueeGroup }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-3 pl-2.5 pr-3.5 py-[5px] rounded-full border',
        group.bgClass,
        group.borderClass,
      )}
    >
      <span
        className={cn(
          'text-[10px] font-semibold uppercase tracking-widish whitespace-nowrap',
          group.titleClass,
        )}
      >
        {group.label}
      </span>
      <span className="h-3 w-px bg-[var(--line-2)]" aria-hidden />
      {group.items.map((item, i) => (
        <Fragment key={`${group.key}-${item.label}-${i}`}>
          {i > 0 && <span aria-hidden className="w-1 h-1 rounded-full bg-[var(--line-3)]" />}
          <span className="inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap">
            <span className="text-[10.5px] uppercase tracking-widish font-medium text-[var(--muted)]">
              {item.label}
            </span>
            <span className="font-mono font-medium text-[var(--ink)] tabular-nums">{item.value}</span>
            {item.delta && (
              <span
                className={cn(
                  'font-mono tabular-nums text-[11px]',
                  item.delta.dir === 'up' && 'text-[var(--green)]',
                  item.delta.dir === 'down' && 'text-[var(--red)]',
                  item.delta.dir === 'flat' && 'text-[var(--muted)]',
                )}
              >
                {item.delta.text}
              </span>
            )}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

interface TickerTrackProps {
  groups: MarqueeGroup[];
  ariaHidden?: boolean;
}

function TickerTrack({ groups, ariaHidden }: TickerTrackProps) {
  return (
    <div
      data-ticker-track
      aria-hidden={ariaHidden}
      className="flex shrink-0 items-center gap-4 px-4 py-2 whitespace-nowrap"
      style={{ animation: 'tickerScroll 90s linear infinite' }}
    >
      {groups.map((group) => (
        <GroupBlock key={group.key} group={group} />
      ))}
    </div>
  );
}

/* ─── Group builders ──────────────────────────────────────────────────── */

function buildFinance(d: MarqueeFinance): MarqueeItem[] {
  return [
    { label: 'Revenue',    value: compactINR(d.revenue),       delta: pct(d.revenue,       d.prevRevenue) },
    { label: 'Net Rev',    value: compactINR(d.netRevenue),    delta: pct(d.netRevenue,    d.prevNetRevenue) },
    { label: 'AOV',        value: formatINR(d.aov),            delta: pct(d.aov,           d.prevAov) },
    { label: 'Margin',     value: `${d.netMargin.toFixed(1)}%`, delta: ppDiff(d.netMargin, d.prevNetMargin) },
    { label: 'Logistics',  value: compactINR(d.logisticsCost), delta: pct(d.logisticsCost, d.prevLogisticsCost, { invert: true }) },
  ];
}

function buildSales(d: MarqueeSales): MarqueeItem[] {
  return [
    { label: 'Orders',    value: formatNum(d.orders),          delta: countDiff(d.orders,          d.prevOrders) },
    { label: 'Cancelled', value: formatNum(d.cancelledOrders), delta: countDiff(d.cancelledOrders, d.prevCancelledOrders, { invert: true }) },
    { label: 'COD %',     value: `${d.codShare.toFixed(0)}%`,  delta: ppDiff(d.codShare,           d.prevCodShare,        { invert: true }) },
    { label: 'Prepaid',   value: formatNum(d.prepaidOrders),   delta: countDiff(d.prepaidOrders,   d.prevPrepaidOrders) },
  ];
}

function buildMarketing(d: MarqueeMarketing): MarqueeItem[] {
  return [
    { label: 'Ad Spend',    value: compactINR(d.adSpend),         delta: pct(d.adSpend,     d.prevAdSpend) },
    { label: 'ROAS',        value: `${d.roas.toFixed(2)}×`,        delta: pct(d.roas,        d.prevRoas) },
    { label: 'CTR',         value: `${d.ctr.toFixed(2)}%`,         delta: ppDiff(d.ctr,      d.prevCtr) },
    { label: 'Clicks',      value: formatNum(d.clicks),            delta: countDiff(d.clicks, d.prevClicks) },
    { label: 'Purchases',   value: formatNum(d.purchases),         delta: countDiff(d.purchases, d.prevPurchases) },
  ];
}

function buildOperations(d: MarqueeOperations): MarqueeItem[] {
  return [
    { label: 'Shipments', value: formatNum(d.totalShipments),   delta: countDiff(d.totalShipments, d.prevTotalShipments) },
    { label: 'Delivered', value: formatNum(d.delivered),         delta: countDiff(d.delivered,      d.prevDelivered) },
    { label: 'Fulfilled', value: `${d.fulfilledPct.toFixed(0)}%`, delta: ppDiff(d.fulfilledPct,    d.prevFulfilledPct) },
    { label: 'RTO',       value: `${d.rtoRate.toFixed(1)}%`,     delta: ppDiff(d.rtoRate,          d.prevRtoRate, { invert: true }) },
    { label: 'NDR',       value: formatNum(d.ndr),               delta: countDiff(d.ndr,           d.prevNdr,     { invert: true }) },
  ];
}

function buildCustomers(d: MarqueeCustomers): MarqueeItem[] {
  return [
    { label: 'Lifetime',   value: formatNum(d.lifetimeCustomers) },
    { label: 'New',        value: formatNum(d.newCustomers),       delta: countDiff(d.newCustomers,       d.prevNewCustomers) },
    { label: 'Returning',  value: formatNum(d.returningCustomers), delta: countDiff(d.returningCustomers, d.prevReturningCustomers) },
    { label: 'Repeat %',   value: `${d.repeatRate.toFixed(1)}%`,    delta: ppDiff(d.repeatRate,            d.prevRepeatRate) },
    { label: 'Carts',      value: formatNum(d.abandonedCarts),      delta: countDiff(d.abandonedCarts,    d.prevAbandonedCarts, { invert: true }) },
  ];
}

function buildReviews(d: MarqueeReviews): MarqueeItem[] {
  return [
    { label: 'Rating',  value: `${d.storeRating.toFixed(2)}★` },
    { label: 'New',     value: formatNum(d.totalReviews),     delta: countDiff(d.totalReviews, d.prevTotalReviews) },
    { label: '5★',      value: formatNum(d.fiveStarCount) },
    { label: 'Verified', value: formatNum(d.verifiedCount) },
  ];
}

function buildGroups(payload: MarqueePayload | null): MarqueeGroup[] {
  if (!payload) return [];
  return [
    {
      key: 'finance',
      label: 'Finance',
      bgClass:     'bg-[var(--accent-soft)]',
      borderClass: 'border-[var(--accent-soft-2)]',
      titleClass:  'text-[var(--accent)]',
      items: buildFinance(payload.finance),
    },
    {
      key: 'sales',
      label: 'Sales',
      bgClass:     'bg-[var(--blue-soft)]',
      borderClass: 'border-[var(--blue-soft)]',
      titleClass:  'text-[var(--blue)]',
      items: buildSales(payload.sales),
    },
    {
      key: 'marketing',
      label: 'Marketing',
      bgClass:     'bg-[var(--ai-soft)]',
      borderClass: 'border-[var(--ai-soft)]',
      titleClass:  'text-[var(--purple)]',
      items: buildMarketing(payload.marketing),
    },
    {
      key: 'operations',
      label: 'Operations',
      bgClass:     'bg-[var(--green-soft)]',
      borderClass: 'border-[var(--green-soft)]',
      titleClass:  'text-[var(--green)]',
      items: buildOperations(payload.operations),
    },
    {
      key: 'customers',
      label: 'Customers',
      bgClass:     'bg-[var(--teal-soft)]',
      borderClass: 'border-[var(--teal-soft)]',
      titleClass:  'text-[var(--teal)]',
      items: buildCustomers(payload.customers),
    },
    {
      key: 'reviews',
      label: 'Reviews',
      bgClass:     'bg-[var(--amber-soft)]',
      borderClass: 'border-[var(--amber-soft)]',
      titleClass:  'text-[var(--amber)]',
      items: buildReviews(payload.reviews),
    },
  ];
}

/* ─── Component ───────────────────────────────────────────────────────── */

export function Ticker() {
  const payload = useAppSelector((s) => s.marquee.data);
  const groups = useMemo(() => buildGroups(payload), [payload]);

  if (groups.length === 0) {
    // Render an empty placeholder strip so layout doesn't jump on first paint.
    return (
      <div
        role="region"
        aria-label="KPI ticker"
        className="bg-[var(--surface)] border-b border-[var(--line)] h-[40px]"
      />
    );
  }

  return (
    <div
      role="region"
      aria-label="KPI ticker"
      className="group relative overflow-hidden bg-[var(--surface)] border-b border-[var(--line)]
                 [&:hover_[data-ticker-track]]:[animation-play-state:paused]"
    >
      <div className="flex overflow-hidden">
        <TickerTrack groups={groups} />
        <TickerTrack groups={groups} ariaHidden />
      </div>
    </div>
  );
}
