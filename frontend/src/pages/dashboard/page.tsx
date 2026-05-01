import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Camera, ChevronRight,
  TrendingUp, IndianRupee, Globe, Users, UserPlus,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchDashboard } from '@store/slices/dashboardSlice';
import { fetchMarketingData, fetchOperationsData } from '@store/slices/analyticsSlice';
import { fetchGA4Data, fetchGA4RealtimeWidgetData, refreshGA4Realtime } from '@store/slices/ga4Slice';
import { fetchUnicommerceOverview } from '@store/slices/unicommerceSlice';
import { fetchMarqueeData } from '@store/slices/marqueeSlice';
import { Ticker } from '@components/layout/Ticker';
import { DrawerProvider } from '@components/shared/DrawerContext';
import { InfoDrawer } from '@components/shared/InfoDrawer';
import { KpiCard } from '@components/shared/KpiCard';
import { Panel } from '@components/shared/Panel';
import { PageLoader } from '@components/shared/PageLoader';
import { CustomTooltip } from '@components/shared/CustomTooltip';
import { formatINR, formatNum, formatDate } from '@utils/formatters';
import { rangeLabel } from '@utils/common-functions/buildRangeParams';
import { cn } from '@/lib/utils';
import WorldMap, { regions as worldRegions, type DataItem } from 'react-svg-worldmap';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { RangeState } from '@store/slices/rangeSlice';
import type { KPIs, RecentOrder, RevenueVsSpendItem, ConversionFunnelData } from '@app/types/dashboard';
import type { RevenueTrendRow } from '@app/types/unicommerce-api';
import type {
  GA4TrafficDaily, GA4Channel, GA4EcommerceDaily,
  GA4Product, GA4RealtimeWidget, GA4PageScreen, GA4CountryActiveUsers,
} from '@app/types/ga4';

/* ─── Palette (mockup c1-c5 + semantics) ─────────────────────── */
const ACCENT = '#B8893E';   /* c1 — gold */
const TEAL   = '#0F8C82';   /* c2 */
const INFO   = '#2456C2';   /* c3 — blue */
const POS    = '#1F8A4C';   /* c4 — green */
const WARN   = '#C8780B';   /* c5 — amber */
const NEG    = '#C4361F';   /* red */
const MUTED  = '#98948A';
const AI     = '#6E3FD0';   /* purple */

/* Brand-aligned channel palette — kept in sync with marketplace/page.tsx
 * so the same channel reads the same colour across pages. */
const CHANNEL_DEFS = [
  { key: 'shopify',  label: 'Shopify',  color: '#4FA85C', active: true },
  { key: 'amazon',   label: 'Amazon',   color: '#F08C28', active: true },
  { key: 'flipkart', label: 'Flipkart', color: '#E5A82A', active: true },
  { key: 'myntra',   label: 'Myntra',   color: '#D94373', active: true },
  { key: 'eternz',   label: 'Eternz',   color: '#0E9488', active: true },
] as const;

type ChannelKey = (typeof CHANNEL_DEFS)[number]['key'];

function normalizeChannelKey(raw: string | null | undefined): ChannelKey | null {
  const u = (raw ?? '').toUpperCase();
  if (u.includes('SHOPIFY')) return 'shopify';
  if (u.includes('AMAZON')) return 'amazon';
  if (u.includes('FLIPKART')) return 'flipkart';
  if (u.includes('MYNTRA')) return 'myntra';
  if (u.includes('ETERNZ')) return 'eternz';
  return null;
}

interface ChannelDailyRow {
  date: string;
  shopify: number;
  amazon: number;
  flipkart: number;
  myntra: number;
  eternz: number;
  total: number;
}

/** Pivot per-channel daily rows (one row per channel per date) to one row
 *  per date with stacked-bar–ready columns for each channel. */
function pivotChannelTrend(rows: RevenueTrendRow[]): ChannelDailyRow[] {
  const byDate = new Map<string, ChannelDailyRow>();
  for (const r of rows) {
    if (!r.date) continue;
    const date = r.date.slice(0, 10);
    const existing =
      byDate.get(date) ??
      { date, shopify: 0, amazon: 0, flipkart: 0, myntra: 0, eternz: 0, total: 0 };
    const ch = normalizeChannelKey(r.channel);
    const value = Number(r.revenue ?? 0);
    if (ch) existing[ch] += value;
    existing.total += value;
    byDate.set(date, existing);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

const CHANNEL_COLORS: Record<string, string> = {
  'Organic Search':  POS,
  'Direct':          ACCENT,
  'Paid Social':     INFO,
  'Organic Social':  AI,
  'Email':           WARN,
  'Referral':        TEAL,
  'Paid Search':     NEG,
  'Unassigned':      MUTED,
};
const FALLBACK_COLORS = [ACCENT, TEAL, INFO, POS, WARN, AI, NEG, MUTED];

/* ─── Helpers ─────────────────────────────────────────────────── */
function delta(current: number | undefined | null, prev: number | undefined | null): number | undefined {
  const c = Number(current ?? 0);
  const p = Number(prev ?? 0);
  if (!p) return undefined;
  return ((c - p) / p) * 100;
}

function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(v)));
  const step = magnitude >= 1000 ? magnitude / 2 : magnitude;
  return Math.ceil((v * 1.15) / step) * step;
}

function formatINRFull(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function prettyStatus(status?: string): string {
  return (status ?? '').toLowerCase().replace(/_/g, ' ').trim() || 'n/a';
}

function fmtAxisINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

function fmtAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' })}`;
}

function normalizeCountry(value: string): string {
  return value.trim().toLowerCase();
}

const COUNTRY_TO_ISO2: Record<string, string> = {
  india: 'IN', china: 'CN', 'united states': 'US', singapore: 'SG', indonesia: 'ID',
  'united kingdom': 'GB', philippines: 'PH', canada: 'CA', australia: 'AU', germany: 'DE',
  france: 'FR', japan: 'JP', italy: 'IT', spain: 'ES', brazil: 'BR', mexico: 'MX',
  russia: 'RU', 'south korea': 'KR', uae: 'AE', 'saudi arabia': 'SA', thailand: 'TH',
  malaysia: 'MY', vietnam: 'VN', pakistan: 'PK', bangladesh: 'BD', nepal: 'NP',
  'sri lanka': 'LK', 'new zealand': 'NZ',
};

/* ═══════════════════════════════════════════════════════════════
 * LIVE PULSE — Realtime active users (GA4)
 * ═══════════════════════════════════════════════════════════════ */
function RealtimeActiveUsers({
  data,
  location,
  metric,
  onLocationChange,
  onMetricChange,
}: {
  data: GA4RealtimeWidget | null;
  location: 'country' | 'city';
  metric: 'activeUsers' | 'newUsers';
  onLocationChange: (value: 'country' | 'city') => void;
  onMetricChange: (value: 'activeUsers' | 'newUsers') => void;
}) {
  const total = data?.total ?? 0;
  const trend = data?.trend ?? [];
  const breakdown = data?.breakdown ?? [];
  const metricLabel = metric === 'newUsers' ? 'new users' : 'active users';
  const locationLabel = location === 'city' ? 'City' : 'Country';
  const metricLabelTitle = metric === 'newUsers' ? 'New users' : 'Active users';

  return (
    <div className="h-full flex flex-col">
      <div className="mb-3 flex items-start justify-between">
        <p className="text-[42px] font-medium tracking-tightx leading-none tabular-nums text-[var(--ink)]">{formatNum(total)}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--green)]" />
          </span>
          <span className="text-[10px] uppercase tracking-widish text-[var(--muted)] font-medium">Live</span>
        </div>
      </div>
      <p className="text-[10.5px] uppercase tracking-widish text-[var(--muted)] font-medium mb-2">
        {metric === 'newUsers' ? 'New users per minute' : 'Active users per minute'}
      </p>
      <div className="mb-3">
        <ResponsiveContainer width="100%" height={64}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="minute" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} interval={4} minTickGap={12} padding={{ left: 16, right: 16 }} allowDataOverflow />
            <YAxis hide />
            <Tooltip content={<CustomTooltip formatter={(v) => formatNum(Number(v))} labelFormatter={(label) => `${label}`} />} />
            <Bar dataKey="value" name={metricLabelTitle} fill={ACCENT} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <select className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 text-xs text-[var(--ink)]" value={location} onChange={(e) => onLocationChange(e.target.value as 'country' | 'city')}>
          <option value="country">Country</option>
          <option value="city">City</option>
        </select>
        <select className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 text-xs text-[var(--ink)]" value={metric} onChange={(e) => onMetricChange(e.target.value as 'activeUsers' | 'newUsers')}>
          <option value="activeUsers">Active users</option>
          <option value="newUsers">New users</option>
        </select>
      </div>
      {breakdown.length > 0 && (
        // Cap at ~5 rows then scroll — keeps panel height stable when location
        // toggles from Country (few rows) to City (many rows). Sticky header
        // stays visible while scrolling.
        <div className="max-h-[180px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--surface)] z-10">
              <tr className="border-b border-[var(--line)]">
                <th className="py-1.5 pr-3 text-left  text-[10.5px] font-medium uppercase tracking-widish text-[var(--muted)]">{locationLabel}</th>
                <th className="py-1.5      text-right text-[10.5px] font-medium uppercase tracking-widish text-[var(--muted)]">{metricLabel}</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((r) => (
                <tr key={r.location} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-1.5 pr-3 text-[12.5px] text-[var(--ink-2)]">{r.location}</td>
                  <td className="py-1.5      text-right font-mono text-[12.5px] tabular-nums font-medium text-[var(--ink)]">{formatNum(r.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * LIVE PULSE — Recent Orders
 * ═══════════════════════════════════════════════════════════════ */
/** Big-number stat rendered at the top of the Recent Orders body — mirrors
 *  the Live Active Users widget so both panels open with a hero count. */
function RecentOrdersHeaderStat({ kpis, prevKpis }: { kpis: KPIs | null; prevKpis: KPIs | null }) {
  const ordersToday = kpis?.orders ?? 0;
  const prevOrders  = prevKpis?.orders ?? 0;
  const ordersDelta = prevOrders > 0 ? ((ordersToday - prevOrders) / prevOrders) * 100 : undefined;

  return (
    <div className="flex items-baseline gap-2.5">
      <p className="text-[42px] font-medium tracking-tightx leading-none tabular-nums text-[var(--ink)]">{formatNum(ordersToday)}</p>
      {ordersDelta !== undefined && (
        <span className={cn(
          'inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums px-1.5 py-[2px] rounded-full',
          ordersDelta >= 0 ? 'bg-[var(--green-soft)] text-[var(--green)]' : 'bg-[var(--red-soft)] text-[var(--red)]',
        )}>
          {ordersDelta >= 0 ? '↑' : '↓'} {Math.abs(ordersDelta).toFixed(1)}%
        </span>
      )}
      {prevOrders > 0 && (
        <span className="text-[11px] text-[var(--muted-2)]">vs {formatNum(prevOrders)}</span>
      )}
    </div>
  );
}

function LiveActivityFeed({ orders }: { orders: RecentOrder[] }) {
  const recent = orders.slice(0, 10);

  if (recent.length === 0) {
    return <p className="text-xs text-[var(--text-subtle)] text-center py-4">No recent orders</p>;
  }

  // Title-case city names so "BALRAMPUR" / "Mumbai" / "KHEDA" all render consistently.
  const titleCase = (s: string): string =>
    s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '';

  return (
    // 7-column compact table with a single status visual system (dot + soft tint).
    // Products column shows the first SKU plus a position-aware "+N" popover that
    // lists every line item so users never lose clarity on what's in the order.
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto -mr-1 pr-1">
        <table className="w-full text-[11.5px]">
          <thead className="sticky top-0 bg-[var(--surface)] z-10">
            <tr className="border-b border-[var(--line)] text-[10px] uppercase tracking-[0.06em] text-[var(--muted)] font-medium">
              <th className="py-1.5 pr-3 text-left font-medium">Date</th>
              <th className="py-1.5 pr-3 text-left font-medium">Order</th>
              <th className="py-1.5 pr-3 text-left font-medium">City</th>
              <th className="py-1.5 pr-3 text-left font-medium">Products</th>
              <th className="py-1.5 pr-3 text-left font-medium">Payment</th>
              <th className="py-1.5 pr-3 text-left font-medium">Fulfillment</th>
              <th className="py-1.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((o, i) => {
              const finStatus = prettyStatus(o.financial_status);
              const fulfilStatus = prettyStatus(o.fulfillment_status);
              const isPartial = finStatus.includes('partial');
              const isPaid = finStatus.includes('paid') && !isPartial;
              const isVoided = finStatus.includes('void') || finStatus.includes('refund');
              const isPending = finStatus.includes('pending') || finStatus.includes('authorized');
              const isFulfilled = fulfilStatus.includes('fulfill') && !fulfilStatus.includes('un');
              const products = o.products ?? [];
              const firstProduct = products[0];
              const extraCount = Math.max(0, products.length - 1);
              const orderName = o.order_name ?? '';
              const isExchange = /^EXC\b/i.test(orderName) || (Number(o.revenue) === 0 && products.length > 0);
              // Open popover above for the bottom rows so it doesn't clip in the scroll container.
              const openAbove = i >= recent.length - 3;

              // Single status vocabulary: tinted background + matching dot + label.
              let payTone = 'bg-[var(--amber-soft)] text-[var(--amber)]';
              let payDot  = 'bg-[var(--amber)]';
              if (isPaid)         { payTone = 'bg-[var(--green-soft)] text-[var(--green)]'; payDot = 'bg-[var(--green)]'; }
              else if (isPartial) { payTone = 'bg-[var(--blue-soft)] text-[var(--blue)]';   payDot = 'bg-[var(--blue)]'; }
              else if (isVoided)  { payTone = 'bg-[var(--bg-2)] text-[var(--muted)]';       payDot = 'bg-[var(--muted-2)]'; }
              else if (isPending) { payTone = 'bg-[var(--amber-soft)] text-[var(--amber)]'; payDot = 'bg-[var(--amber)]'; }

              const fulfilTone = isFulfilled
                ? 'bg-[var(--green-soft)] text-[var(--green)]'
                : 'bg-[var(--bg-2)] text-[var(--muted)]';
              const fulfilDot = isFulfilled ? 'bg-[var(--green)]' : 'bg-[var(--muted-2)]';

              return (
                <tr
                  key={o.order_id || i}
                  className="border-b border-[var(--line)] last:border-0 align-middle transition-colors hover:bg-[var(--accent-soft)]/30"
                >
                  <td className="py-1.5 pr-3 text-[10.5px] uppercase tracking-[0.04em] text-[var(--muted-2)] whitespace-nowrap">
                    {formatDate(o.created_at)}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap font-mono text-[12px] font-medium text-[var(--ink)] tracking-tight">
                    {orderName}
                  </td>
                  <td className="py-1.5 pr-3 text-[11.5px] text-[var(--ink-2)] truncate max-w-[110px]">
                    {titleCase(o.customer_city) || '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-[11.5px] text-[var(--ink-2)]">
                    {firstProduct ? (
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate max-w-[180px]">{firstProduct}</span>
                        {extraCount > 0 && (
                          // `group/more` keeps hover/focus local to this badge.
                          <span className="relative group/more shrink-0">
                            <span
                              tabIndex={0}
                              className="inline-flex items-center px-1.5 py-[1px] rounded-full text-[10px] font-medium bg-[var(--bg-2)] text-[var(--ink-2)] cursor-help select-none outline-none transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                            >
                              +{extraCount}
                            </span>
                            <span
                              className={cn(
                                'invisible opacity-0 group-hover/more:visible group-hover/more:opacity-100 group-focus-within/more:visible group-focus-within/more:opacity-100 transition-opacity duration-150 absolute right-0 z-30 w-[260px] rounded-lg p-2.5 pointer-events-none',
                                openAbove ? 'bottom-full mb-2' : 'top-full mt-2',
                              )}
                              style={{
                                backgroundColor: 'var(--surface)',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                              }}
                            >
                              <span
                                aria-hidden
                                className={cn(
                                  'absolute right-4 h-2.5 w-2.5 rotate-45',
                                  openAbove ? '-bottom-[5px] border-r border-b' : '-top-[5px] border-l border-t',
                                )}
                                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                              />
                              <p className="text-[9.5px] font-medium uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                Line items · {products.length}
                              </p>
                              <ul className="space-y-1">
                                {products.map((p, idx) => (
                                  <li key={`${p}-${idx}`} className="flex items-start gap-2 leading-snug text-[11px]">
                                    <span className="font-mono text-[9.5px] text-[var(--muted-2)] mt-[2px] shrink-0 w-4 tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                                    <span className="text-[var(--ink)]">{p}</span>
                                  </li>
                                ))}
                              </ul>
                            </span>
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[var(--muted-2)] italic">—</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full text-[10px] font-medium capitalize',
                      payTone,
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', payDot)} />
                      {finStatus}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full text-[10px] font-medium capitalize',
                      fulfilTone,
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', fulfilDot)} />
                      {fulfilStatus}
                    </span>
                  </td>
                  <td className="py-1.5 font-mono text-[12px] font-medium tabular-nums text-right whitespace-nowrap">
                    {isExchange ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="px-1 py-[1px] rounded text-[9px] font-medium uppercase tracking-[0.05em] bg-[var(--bg-2)] text-[var(--muted)]">Exchange</span>
                        <span className="text-[var(--muted-2)]">—</span>
                      </span>
                    ) : (
                      <span className="text-[var(--ink)]">{formatINRFull(o.revenue)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * LIVE PULSE — Abandoned Carts
 * ═══════════════════════════════════════════════════════════════ */
function AbandonedCartsWidget({ carts }: { carts: { count: number; total_value: number; avg_value: number } | null }) {
  return (
    <div className="h-full flex flex-col">
      {/* Top row — three KPI cells, each value centered above its label.
          justify-between keeps the cells spread across the panel width. */}
      <div className="flex items-end justify-between gap-4">
        <div className="text-center">
          <p className="font-mono text-[18px] font-medium text-[var(--red)] tabular-nums">{formatNum(carts?.count ?? 0)}</p>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-[var(--muted)] mt-0.5">Abandoned Carts</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[18px] font-medium text-[var(--ink)] tabular-nums">{formatINR(carts?.total_value ?? 0)}</p>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-[var(--muted)] mt-0.5">Cart Value Lost</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[18px] font-medium text-[var(--ink)] tabular-nums">{formatINR(carts?.avg_value ?? 0)}</p>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-[var(--muted)] mt-0.5">Avg Cart Value</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * FINANCIALS — Revenue by Channel
 * ═══════════════════════════════════════════════════════════════ */
function RevenueByChannelPanel({ data, range, className }: { data: RevenueTrendRow[]; range: RangeState; className?: string }) {
  const [solo, setSolo] = useState<ChannelKey | null>(null);
  const chartData = useMemo(() => pivotChannelTrend(data), [data]);
  const visibleChannels = useMemo(
    () => (solo ? CHANNEL_DEFS.filter((c) => c.key === solo) : CHANNEL_DEFS),
    [solo],
  );
  const yMax = useMemo(() => {
    const peak = solo
      ? Math.max(...chartData.map((d) => d[solo]), 1)
      : Math.max(...chartData.map((d) => d.total), 1);
    return niceMax(peak);
  }, [chartData, solo]);
  const xInterval = Math.max(1, Math.floor(chartData.length / 6) - 1);

  // Same chip pressed again clears the filter and returns to "All".
  const handleChannelClick = (key: ChannelKey) => {
    setSolo((cur) => (cur === key ? null : key));
  };

  return (
    <Panel
      className={className}
      title="Revenue by Channel"
      subtitle={`${solo ? CHANNEL_DEFS.find((c) => c.key === solo)?.label : 'All channels'} · Daily · ${rangeLabel(range)}`}
      info={{ what: 'Daily revenue stacked by sales channel — Shopify, Amazon, Flipkart, Myntra and Eternz combined. Click a channel chip below to solo it.', source: 'Shopify Orders + Unicommerce', readIt: 'Each bar = one day, segments show contribution from each marketplace. Hover for the per-channel breakdown.' }}
      ai={{ observation: 'Channel mix exposes marketplace dependence vs. D2C strength.', insight: 'A healthy mix has D2C (Shopify) carrying baseline revenue and marketplaces driving incremental volume. Heavy single-channel reliance is a margin and discoverability risk.', actions: ['Identify channels under 10% share and either grow or sunset', 'Match top SKUs to under-indexed channels to lift incremental revenue', 'Track channel mix weekly to spot drift early'] }}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} interval={xInterval} />
              <YAxis tickFormatter={fmtAxisINR} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} domain={[0, yMax]} tickCount={5} />
              <Tooltip content={<CustomTooltip formatter={(v: number) => (v === 0 ? '—' : formatINR(v))} />} cursor={{ fill: 'rgba(184,137,62,0.08)' }} />
              {visibleChannels.map((ch, i) => (
                <Bar
                  key={ch.key}
                  dataKey={ch.key}
                  name={ch.label}
                  stackId="ch"
                  fill={ch.color}
                  maxBarSize={24}
                  radius={i === visibleChannels.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

      <div className="flex items-center flex-wrap gap-x-2 gap-y-1.5 mt-3 pt-3 border-t border-[var(--border)] shrink-0">
        <button
          type="button"
          onClick={() => setSolo(null)}
          className={cn(
            'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-colors',
            solo === null
              ? 'bg-[var(--surface-2)] text-[var(--ink)] font-medium'
              : 'text-[var(--text-muted)] hover:text-[var(--ink)]',
          )}
        >
          All
        </button>
        {CHANNEL_DEFS.map((ch) => {
          const isActive = solo === ch.key;
          const isDimmed = solo !== null && !isActive;
          return (
            <button
              key={ch.key}
              type="button"
              onClick={() => handleChannelClick(ch.key)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all',
                isActive && 'bg-[var(--surface-2)] font-medium',
                isDimmed ? 'opacity-40 hover:opacity-100' : 'text-[var(--text-muted)] hover:text-[var(--ink)]',
              )}
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ch.color }} />
              {ch.label}
            </button>
          );
        })}
        </div>
      </div>
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * FINANCIALS — COD vs Prepaid
 * ═══════════════════════════════════════════════════════════════ */
function CodPrepaidDonut({ codPct }: { codPct: number }) {
  const data = [
    { name: 'COD', value: codPct, fill: WARN },
    { name: 'Prepaid', value: 100 - codPct, fill: POS },
  ];
  return (
    <div className="flex-1 min-h-[140px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={68} dataKey="value" paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * FINANCIALS — Revenue vs Spend Trend
 * ═══════════════════════════════════════════════════════════════ */
function RevenueVsSpendPanel({ data, range, className }: { data: RevenueVsSpendItem[]; range: RangeState; className?: string }) {
  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const maxSpend   = Math.max(...data.map((d) => d.ad_spend), 1);

  return (
    <Panel
      className={className}
      title="Gross Sales vs Ad Spend"
      subtitle={`Shopify + Meta · Daily · ${rangeLabel(range)}`}
      info={{ what: 'Daily Shopify gross sales (matches Finance Sales Breakdown) overlaid with daily Meta ad spend on a dual Y-axis.', source: 'Shopify Orders + Meta Ads', readIt: 'When gross sales spikes lead spend spikes by 1–2 days, it signals organic demand. When spend spikes first, it confirms paid acquisition is driving sales.' }}
      ai={{ observation: 'Gross sales and ad spend correlation reveals how efficiently paid campaigns drive orders.', insight: 'A high correlation (spend up → gross sales up same day) indicates paid dependency. Low correlation suggests organic pull or attribution lag. Healthy brands show gross sales continuing to grow after spend pauses.', actions: ['Pause spend for 48h occasionally to measure organic baseline', 'Compare day-of-week patterns: are weekend gross sales paid or organic?', 'Track gross sales / spend ratio weekly as a quick efficiency gauge'] }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} interval={Math.floor(data.length / 6)} />
          <YAxis yAxisId="rev" orientation="left" tickFormatter={(v: number) => `₹${(v / 100000).toFixed(1)}L`} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} domain={[0, maxRevenue * 1.15]} />
          <YAxis yAxisId="spend" orientation="right" tickFormatter={(v: number) => `₹${(v / 100000).toFixed(1)}L`} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} domain={[0, maxSpend * 1.15]} />
          <Tooltip content={<CustomTooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />} />
          <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Gross Sales" stroke={ACCENT} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line yAxisId="spend" type="monotone" dataKey="ad_spend" name="Ad spend" stroke={INFO} strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 inline-block rounded" style={{ backgroundColor: ACCENT }} />Gross Sales</span>
        <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 inline-block rounded border-dashed border-t-2" style={{ borderColor: INFO }} />Ad spend</span>
      </div>
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * GA4 · Traffic Trend
 * ═══════════════════════════════════════════════════════════════ */
function TrafficTrendChart({ data }: { data: GA4TrafficDaily[] }) {
  if (!data.length) return <div className="h-full min-h-[220px] flex items-center justify-center text-sm text-[var(--text-subtle)]">No data</div>;
  return (
    <div className="h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} interval={Math.max(0, Math.floor(data.length / 5) - 1)} padding={{ left: 8, right: 8 }} />
          <YAxis tickFormatter={formatNum} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip formatter={(v) => formatNum(Number(v))} />} />
          <Line type="monotone" dataKey="sessions"     name="Sessions"     stroke={ACCENT} strokeWidth={2}   dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="active_users" name="Active Users" stroke={POS}    strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="new_users"    name="New Users"    stroke={INFO}   strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * Ecommerce Trend — Shopify gross sales (Sales Breakdown) + GA4 transactions
 * ═══════════════════════════════════════════════════════════════ */
function EcommerceTrend({ ecommerce, revenueVsSpend }: { ecommerce: GA4EcommerceDaily[]; revenueVsSpend: RevenueVsSpendItem[] }) {
  const merged = useMemo(() => {
    const grossByDate = new Map<string, number>();
    for (const r of revenueVsSpend) grossByDate.set(r.date, Number(r.revenue) || 0);
    const txnByDate = new Map<string, number>();
    for (const r of ecommerce) txnByDate.set(r.date, Number(r.transactions) || 0);
    const dates = Array.from(new Set<string>([...grossByDate.keys(), ...txnByDate.keys()])).sort();
    return dates.map((date) => ({
      date,
      gross_sales: grossByDate.get(date) ?? 0,
      transactions: txnByDate.get(date) ?? 0,
    }));
  }, [ecommerce, revenueVsSpend]);

  if (!merged.length) return <div className="h-full min-h-[220px] flex items-center justify-center text-sm text-[var(--text-subtle)]">No ecommerce data</div>;
  return (
    <div className="h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} interval={Math.max(0, Math.floor(merged.length / 5) - 1)} />
          <YAxis yAxisId="rev" tickFormatter={(v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={42} />
          <YAxis yAxisId="txn" orientation="right" tickFormatter={formatNum} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={30} />
          <Tooltip content={<CustomTooltip formatter={(v, name) => name === 'Gross Sales' ? formatINR(Number(v)) : formatNum(Number(v))} />} />
          <Line yAxisId="rev" type="monotone" dataKey="gross_sales"  name="Gross Sales"  stroke={ACCENT} strokeWidth={2}   dot={false} activeDot={{ r: 4 }} />
          <Line yAxisId="txn" type="monotone" dataKey="transactions" name="Transactions" stroke={POS}    strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * GA4 · Conversion Funnel — wireframe SVG funnel
 *
 * Each stage is rendered as the bottom edge of a frustum: an open ellipse
 * sized by `widthPct = count / sessions` (floored at MIN_RX so the smallest
 * stage is still visible), with two side-lines connecting it to the
 * previous stage's ellipse. The top "mouth" is drawn first as a full-width
 * open ellipse. Percentages sit on the left with dashed leader lines;
 * pill-shaped labels sit on the right.
 * ═══════════════════════════════════════════════════════════════ */
function ConversionFunnel({ data }: { data: ConversionFunnelData | null }) {
  const sessions = data?.sessions ?? 0;
  const cart     = data?.added_to_cart ?? 0;
  const checkout = data?.checkouts ?? 0;
  const purchase = data?.purchases ?? 0;

  if (sessions === 0) {
    return (
      <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-[var(--text-subtle)]">
        No GA4 funnel data
      </div>
    );
  }

  // Geometry
  const VB_W = 600;
  const STAGE_H = 70;
  const TOP_Y = 26;
  const CX = 300;
  const MAX_RX = 110;
  const MIN_RX = 14;
  const RY = 8;
  const stageData = [
    { key: 'sessions', label: 'Sessions',     count: sessions, color: '#2456C2' },
    { key: 'cart',     label: 'Add to Cart',  count: cart,     color: '#7A3FD0' },
    { key: 'checkout', label: 'Checkouts',    count: checkout, color: '#D1396B' },
    { key: 'purchase', label: 'Purchases',    count: purchase, color: '#E08A1F' },
  ];

  const widthOf = (n: number) => Math.max(MIN_RX, Math.min(MAX_RX, (n / sessions) * MAX_RX));
  const stages = stageData.map((s, i, arr) => {
    const topRx = i === 0 ? MAX_RX : widthOf(arr[i - 1].count);
    const bottomRx = i === 0 ? MAX_RX : widthOf(s.count);
    const topY = TOP_Y + i * STAGE_H;
    const bottomY = topY + STAGE_H;
    const pct = (s.count / sessions) * 100;
    return { ...s, topRx, bottomRx, topY, bottomY, pct };
  });
  const VB_H = TOP_Y + stages.length * STAGE_H + 40;

  // Position labels at the BOTTOM edge of each stage's frustum (matches the reference)
  const LABEL_LEFT_X = 78;
  const LABEL_RIGHT_X = VB_W - 150;
  const PILL_W = 140;
  const PILL_H = 26;

  const s2cart  = sessions ? (cart / sessions) * 100 : 0;
  const cart2chk = cart ? (checkout / cart) * 100 : 0;
  const chk2buy = checkout ? (purchase / checkout) * 100 : 0;
  const overall = sessions ? (purchase / sessions) * 100 : 0;

  return (
    <div className="flex flex-col">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Per-stage vertical gradient: stronger tint at top, fading toward bottom.
              Keeps the colored "panel" feel while staying soft enough that the
              count number on each band remains readable. */}
          {stageData.map((s) => (
            <linearGradient key={s.key} id={`funnel-grad-${s.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.18} />
            </linearGradient>
          ))}
          {/* Soft drop-shadow for the funnel body to lift it off the panel */}
          <filter id="funnel-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.18" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Top "mouth" of the funnel — filled to read as the open top of the cone */}
        <ellipse
          cx={CX}
          cy={TOP_Y}
          rx={MAX_RX}
          ry={RY}
          stroke={stages[0].color}
          strokeWidth={2}
          fill={stages[0].color}
          fillOpacity={0.18}
        />
        {/* Top-stage left percentage label (100% at the mouth) */}
        <line
          x1={CX - MAX_RX} y1={TOP_Y}
          x2={LABEL_LEFT_X + 10} y2={TOP_Y}
          stroke={stages[0].color}
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.5}
        />
        <text
          x={LABEL_LEFT_X} y={TOP_Y + 4}
          textAnchor="end"
          fontSize={13}
          fontWeight={700}
          fill={stages[0].color}
        >100%</text>

        {stages.map((stage) => (
          <g key={stage.key}>
            {/* Filled trapezoid body of the frustum (sides + interior).
                Drawn first so the ellipse + side strokes overlay it cleanly. */}
            <path
              d={`M ${CX - stage.topRx},${stage.topY} L ${CX + stage.topRx},${stage.topY} L ${CX + stage.bottomRx},${stage.bottomY} L ${CX - stage.bottomRx},${stage.bottomY} Z`}
              fill={`url(#funnel-grad-${stage.key})`}
              filter="url(#funnel-shadow)"
            />
            {/* Side outline lines */}
            <line
              x1={CX - stage.topRx} y1={stage.topY}
              x2={CX - stage.bottomRx} y2={stage.bottomY}
              stroke={stage.color}
              strokeWidth={2}
            />
            <line
              x1={CX + stage.topRx} y1={stage.topY}
              x2={CX + stage.bottomRx} y2={stage.bottomY}
              stroke={stage.color}
              strokeWidth={2}
            />
            {/* Bottom ellipse — narrower means flatter, lightly tinted */}
            <ellipse
              cx={CX}
              cy={stage.bottomY}
              rx={stage.bottomRx}
              ry={Math.max(2, RY * (stage.bottomRx / MAX_RX))}
              stroke={stage.color}
              strokeWidth={2}
              fill={stage.color}
              fillOpacity={0.28}
            />
            {/* Count label centered inside the frustum (darker for contrast on tint) */}
            <text
              x={CX}
              y={stage.topY + STAGE_H / 2 + 5}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="var(--text)"
            >
              {formatNum(stage.count)}
            </text>

            {/* Leader: bottom of stage's left edge → left percentage label */}
            <line
              x1={CX - stage.bottomRx} y1={stage.bottomY}
              x2={LABEL_LEFT_X + 10} y2={stage.bottomY}
              stroke={stage.color}
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.5}
            />
            <text
              x={LABEL_LEFT_X} y={stage.bottomY + 4}
              textAnchor="end"
              fontSize={13}
              fontWeight={700}
              fill={stage.color}
            >
              {stage.pct.toFixed(1)}%
            </text>

            {/* Leader: bottom of stage's right edge → right pill label */}
            <line
              x1={CX + stage.bottomRx} y1={stage.bottomY}
              x2={LABEL_RIGHT_X} y2={stage.bottomY}
              stroke={stage.color}
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.5}
            />
            <rect
              x={LABEL_RIGHT_X} y={stage.bottomY - PILL_H / 2}
              width={PILL_W} height={PILL_H}
              rx={PILL_H / 2}
              stroke={stage.color}
              strokeWidth={1.5}
              fill={stage.color}
              fillOpacity={0.12}
            />
            <text
              x={LABEL_RIGHT_X + PILL_W / 2}
              y={stage.bottomY + 4}
              textAnchor="middle"
              fontSize={11.5}
              fontWeight={600}
              fill={stage.color}
            >
              {stage.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-2 pt-3 border-t border-[var(--border)] grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase text-[var(--text-subtle)]">Sess → Cart</p>
          <p className="text-sm font-semibold" style={{ color: '#7A3FD0' }}>{s2cart.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[var(--text-subtle)]">Cart → Checkout</p>
          <p className="text-sm font-semibold" style={{ color: '#D1396B' }}>{cart2chk.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[var(--text-subtle)]">Check → Purchase</p>
          <p className="text-sm font-semibold" style={{ color: '#E08A1F' }}>{chk2buy.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[var(--text-subtle)]">Overall Conv</p>
          <p className="text-sm font-semibold" style={{ color: ACCENT }}>{overall.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * GA4 · Channel Breakdown (donut + table)
 * ═══════════════════════════════════════════════════════════════ */
function ChannelBreakdown({ data }: { data: GA4Channel[] }) {
  const donutData = useMemo(() => data.map((c) => ({
    name:  c.channel || 'Unassigned',
    value: c.sessions,
    fill:  CHANNEL_COLORS[c.channel] ?? FALLBACK_COLORS[0],
  })), [data]);

  if (!data.length) return <div className="h-48 flex items-center justify-center text-sm text-[var(--text-subtle)]">No channel data</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
      <div className="lg:col-span-2 flex flex-col min-h-[170px]">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} dataKey="value" paddingAngle={2}>
                {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip formatter={(v: number) => formatNum(v)} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-0.5 pt-1">
          {donutData.slice(0, 6).map((d) => (
            <span key={d.name} className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
              {d.name}
            </span>
          ))}
        </div>
      </div>
      <div className="lg:col-span-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="py-1.5 pr-3 text-left  text-[var(--text-muted)] font-medium">Channel</th>
              <th className="py-1.5 pr-3 text-right text-[var(--text-muted)] font-medium">Sessions</th>
              <th className="py-1.5 pr-3 text-right text-[var(--text-muted)] font-medium">Users</th>
              <th className="py-1.5 pr-3 text-right text-[var(--text-muted)] font-medium">Revenue</th>
              <th className="py-1.5      text-right text-[var(--text-muted)] font-medium">Conv %</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 8).map((c) => (
              <tr key={c.channel} className="border-b border-[var(--border)] last:border-0">
                <td className="py-1.5 pr-3">
                  <span className="flex items-center gap-2 text-[var(--text)]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHANNEL_COLORS[c.channel] ?? FALLBACK_COLORS[0] }} />
                    {c.channel || 'Unassigned'}
                  </span>
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(c.sessions)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(c.active_users)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums" style={{ color: ACCENT }}>{formatINR(c.purchase_revenue)}</td>
                <td className="py-1.5      text-right tabular-nums text-[var(--text-muted)]">{(c.conversion_rate * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * GA4 · Top Viewed Products
 * ═══════════════════════════════════════════════════════════════ */
function TopProductsGA4({ data }: { data: GA4Product[] }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-sm text-[var(--text-subtle)]">No product data</div>;
  const topViewedProducts = [...data].sort((a, b) => b.items_viewed - a.items_viewed);
  return (
    <div className="overflow-auto max-h-[360px] pr-1">
      <table className="w-full text-xs min-w-[600px]">
        <thead className="sticky top-0 bg-[var(--surface)] z-10">
          <tr className="border-b border-[var(--border)]">
            <th className="py-2 pr-3 text-left  text-[var(--text-muted)] font-medium w-8">#</th>
            <th className="py-2 pr-3 text-left  text-[var(--text-muted)] font-medium">Product</th>
            <th className="py-2 pr-3 text-right text-[var(--text-muted)] font-medium">Viewed</th>
            <th className="py-2 pr-3 text-right text-[var(--text-muted)] font-medium">Added</th>
            <th className="py-2 pr-3 text-right text-[var(--text-muted)] font-medium">Purchased</th>
            <th className="py-2 pr-3 text-right text-[var(--text-muted)] font-medium">Revenue</th>
            <th className="py-2      text-right text-[var(--text-muted)] font-medium">Cart %</th>
          </tr>
        </thead>
        <tbody>
          {topViewedProducts.slice(0, 10).map((p, i) => {
            const cartPct = p.items_viewed > 0 ? (p.items_added_to_cart / p.items_viewed) * 100 : 0;
            return (
              <tr key={p.item_name} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                <td className="py-2.5 pr-3 text-[var(--text-muted)]">{i + 1}</td>
                <td className="py-2.5 pr-3 text-[var(--text)] max-w-[260px] truncate" title={p.item_name}>{p.item_name || '(not set)'}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(p.items_viewed)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(p.items_added_to_cart)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(p.items_purchased)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums font-semibold" style={{ color: ACCENT }}>{formatINR(p.purchase_revenue)}</td>
                <td className="py-2.5      text-right tabular-nums" style={{ color: cartPct > 20 ? POS : cartPct > 10 ? WARN : NEG }}>{cartPct.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * GA4 · Top Pages/Screens
 * ═══════════════════════════════════════════════════════════════ */
function TopPagesScreensTable({ data }: { data: GA4PageScreen[] }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-sm text-[var(--text-subtle)]">No page/screen data</div>;
  return (
    <div className="overflow-auto max-h-[320px] pr-1">
      <table className="w-full text-[12px]">
        <thead className="sticky top-0 bg-[var(--surface)] z-10">
          <tr className="border-b border-[var(--line)]">
            <th className="py-1.5 pr-3 text-left  text-[10.5px] uppercase tracking-widish text-[var(--muted)] font-medium">Page</th>
            <th className="py-1.5 px-2 text-right text-[10.5px] uppercase tracking-widish text-[var(--muted)] font-medium whitespace-nowrap">Views</th>
            <th className="py-1.5 px-2 text-right text-[10.5px] uppercase tracking-widish text-[var(--muted)] font-medium whitespace-nowrap">Users</th>
            <th className="py-1.5 px-2 text-right text-[10.5px] uppercase tracking-widish text-[var(--muted)] font-medium whitespace-nowrap">V/U</th>
            <th className="py-1.5 px-2 text-right text-[10.5px] uppercase tracking-widish text-[var(--muted)] font-medium whitespace-nowrap">Avg&nbsp;Time</th>
            <th className="py-1.5 px-2 text-right text-[10.5px] uppercase tracking-widish text-[var(--muted)] font-medium whitespace-nowrap">Events</th>
            <th className="py-1.5 pl-2 text-right text-[10.5px] uppercase tracking-widish text-[var(--muted)] font-medium whitespace-nowrap">Bounce</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, i) => (
            <tr key={row.page_title} className={cn('transition-colors hover:bg-[var(--surface-2)] border-b border-[var(--line)]/60 last:border-0', i % 2 === 1 && 'bg-[var(--surface-2)]/40')}>
              <td className="py-1.5 pr-3 text-[var(--ink)] font-medium" title={row.page_title}>
                <div className="max-w-[260px] truncate">{row.page_title}</div>
              </td>
              <td className="py-1.5 px-2 text-right tabular-nums font-medium text-[var(--ink)] whitespace-nowrap font-mono">{formatNum(row.screen_page_views)}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-[var(--muted)] whitespace-nowrap font-mono">{formatNum(row.active_users)}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-[var(--muted)] whitespace-nowrap font-mono">{row.views_per_active_user.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-[var(--muted)] whitespace-nowrap font-mono">{Math.round(row.avg_engagement_time_per_active_user)}s</td>
              <td className="py-1.5 px-2 text-right tabular-nums text-[var(--muted)] whitespace-nowrap font-mono">{formatNum(row.event_count)}</td>
              <td className="py-1.5 pl-2 text-right tabular-nums whitespace-nowrap">
                <span className="px-1.5 py-[1px] rounded text-[10.5px] font-medium font-mono" style={{
                  color:           row.bounce_rate > 0.6 ? 'var(--red)'      : row.bounce_rate > 0.4 ? 'var(--amber)'      : 'var(--green)',
                  backgroundColor: row.bounce_rate > 0.6 ? 'var(--red-soft)' : row.bounce_rate > 0.4 ? 'var(--amber-soft)' : 'var(--green-soft)',
                }}>
                  {(row.bounce_rate * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * GA4 · Active Users by Country (map + list)
 * ═══════════════════════════════════════════════════════════════ */
function ActiveUsersCountryMapCard({ data, loading, subtitle }: { data: GA4CountryActiveUsers[]; loading: boolean; subtitle: string }) {
  const mapPoints = useMemo<DataItem<number>[]>(
    () => data
      .map((row) => {
        const code = COUNTRY_TO_ISO2[normalizeCountry(row.country)];
        return code ? { country: code.toLowerCase() as DataItem<number>['country'], value: row.activeUsers } : null;
      })
      .filter((row): row is DataItem<number> => Boolean(row)),
    [data],
  );

  const maxUsers = data.reduce((m, r) => Math.max(m, r.activeUsers), 0);
  const minUsers = mapPoints.reduce<number>((m, r) => (m === 0 || r.value < m ? r.value : m), 0);

  const logMin = useMemo(() => Math.log(Math.max(minUsers, 1)), [minUsers]);
  const logMax = useMemo(() => Math.log(Math.max(maxUsers, minUsers + 1)), [maxUsers, minUsers]);

  const styleFunction = useMemo(
    () => ({ countryValue }: { countryValue?: number }) => {
      if (countryValue === undefined || countryValue === null) {
        return {
          fill: ACCENT,
          fillOpacity: 0.07,
          stroke: 'var(--line)',
          strokeWidth: 0.5,
          cursor: 'default',
        };
      }
      const t = logMax > logMin
        ? (Math.log(Math.max(countryValue, 1)) - logMin) / (logMax - logMin)
        : 1;
      const opacity = 0.35 + 0.55 * Math.max(0, Math.min(1, t));
      return {
        fill: ACCENT,
        fillOpacity: opacity,
        stroke: 'var(--surface)',
        strokeWidth: 0.6,
        cursor: 'pointer',
      };
    },
    [logMin, logMax],
  );

  const valueByIso = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach((row) => {
      const iso = COUNTRY_TO_ISO2[normalizeCountry(row.country)];
      if (iso) m.set(iso.toUpperCase(), row.activeUsers);
    });
    return m;
  }, [data]);

  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; iso: string; name: string; value: number } | null>(null);

  useEffect(() => {
    const node = mapWrapperRef.current;
    if (!node) return;
    const stripTitles = () => {
      node.querySelectorAll('svg title').forEach((t) => t.remove());
    };
    stripTitles();
    const observer = new MutationObserver(stripTitles);
    observer.observe(node, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrapper = mapWrapperRef.current;
    if (!wrapper) return;
    const path = (e.target as Element | null)?.closest?.('path');
    if (!path || !wrapper.contains(path)) {
      if (hover) setHover(null);
      return;
    }
    const parent = path.parentElement;
    if (!parent || parent.tagName.toLowerCase() !== 'g') {
      if (hover) setHover(null);
      return;
    }
    const idx = Array.prototype.indexOf.call(parent.children, path);
    const region = idx >= 0 ? worldRegions[idx] : undefined;
    if (!region) {
      if (hover) setHover(null);
      return;
    }
    const value = valueByIso.get(region.code) ?? 0;
    if (!value) {
      if (hover) setHover(null);
      return;
    }
    const wrapperRect = wrapper.getBoundingClientRect();
    setHover({
      x: e.clientX - wrapperRect.left,
      y: e.clientY - wrapperRect.top,
      iso: region.code,
      name: region.name,
      value,
    });
  };

  const handleMouseLeave = () => setHover(null);

  const hoverFlag = hover
    ? String.fromCodePoint(...hover.iso.split('').map((c) => 127397 + c.charCodeAt(0)))
    : '';

  const body = (() => {
    if (loading) return <div className="h-[240px] flex items-center justify-center text-sm text-[var(--text-subtle)]">Loading…</div>;
    if (!data.length) return <div className="h-[240px] flex items-center justify-center text-sm text-[var(--text-subtle)]">No country data</div>;
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3 items-center">
        <div
          ref={mapWrapperRef}
          className="ga4-worldmap relative bg-[var(--bg-2)] rounded-lg p-2"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <WorldMap
            color={ACCENT}
            size="responsive"
            backgroundColor="transparent"
            strokeOpacity={0.6}
            data={mapPoints}
            styleFunction={styleFunction}
            tooltipTextFunction={() => ''}
          />
          {hover ? (
            <div
              className="pointer-events-none absolute z-10 flex items-center gap-1.5 rounded-md bg-[var(--surface)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--text)] shadow-lg border border-[var(--border)] whitespace-nowrap"
              style={{ left: hover.x + 12, top: hover.y + 12 }}
            >
              <span aria-hidden className="text-sm leading-none">{hoverFlag}</span>
              <span>{hover.name}</span>
              <span className="opacity-50">·</span>
              <span className="tabular-nums">{formatNum(hover.value)} users</span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col">
          <div className="flex justify-between text-[10px] uppercase tracking-widish text-[var(--muted-2)] font-medium pb-1.5 border-b border-[var(--line)]">
            <span>Country</span><span>Active Users</span>
          </div>
          <div className="flex-1 overflow-y-auto mt-0.5">
            {data.slice(0, 8).map((row) => {
              const pct  = maxUsers > 0 ? (row.activeUsers / maxUsers) * 100 : 0;
              const code = COUNTRY_TO_ISO2[normalizeCountry(row.country)];
              const flag = code ? String.fromCodePoint(...code.split('').map((c) => 127397 + c.charCodeAt(0))) : '🌐';
              return (
                <div key={row.country} className="py-1.5 transition-colors hover:bg-[var(--surface-2)] rounded px-2 -mx-2">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-xs text-[var(--ink)] truncate font-medium flex items-center gap-1.5 min-w-0">
                      <span aria-hidden className="text-base leading-none shrink-0">{flag}</span>
                      <span className="truncate">{row.country}</span>
                    </span>
                    <span className="text-xs font-medium tabular-nums font-mono text-[var(--ink)] shrink-0">{formatNum(row.activeUsers)}</span>
                  </div>
                  <div className="h-1 rounded-full bg-[var(--bg-2)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  })();

  return (
    <div className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-[22px] py-[20px] shadow-[var(--shadow-sm)]">
      <style>{`.ga4-worldmap svg { max-width: 100%; height: auto; }`}</style>
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-[14.5px] font-semibold tracking-tightish text-[var(--ink)] leading-[1.25]">Active Users by Country</h3>
        <span className="text-[11.5px] text-[var(--muted)] mt-0.5">{subtitle}</span>
      </div>
      {body}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * PAGE — Dashboard (unified)
 * ═══════════════════════════════════════════════════════════════ */
export function DashboardPage() {
  const dispatch = useAppDispatch();
  const {
    kpis, prevKpis, revenueTrend, campaigns, abandonedCarts, recentOrders,
    revenueVsSpend, conversionFunnel, loading, error,
    topProducts, logistics, reviewsSummary, topRatedProducts,
  } = useAppSelector((s) => s.dashboard);
  const { topSkus } = useAppSelector((s) => s.analytics);
  const unicommerceRevenueTrend = useAppSelector((s) => s.unicommerce.revenueTrend);
  const {
    summary: ga4Summary,
    summaryInsights: ga4Insights,
    overview: ga4Overview,
    channels: ga4Channels,
    ecommerce: ga4Ecommerce,
    products: ga4Products,
    countryActiveUsers,
    realtimeWidget,
    pagesScreens,
    loading: ga4Loading,
  } = useAppSelector((s) => s.ga4);
  const range = useAppSelector((s) => s.range);
  const navigate = useNavigate();

  const [realtimeLocation, setRealtimeLocation] = useState<'country' | 'city'>('country');
  const [realtimeMetric, setRealtimeMetric] = useState<'activeUsers' | 'newUsers'>('activeUsers');

  useEffect(() => {
    dispatch(fetchDashboard(range));
    dispatch(fetchMarketingData(range));
    dispatch(fetchOperationsData(range));
    dispatch(fetchGA4Data(range));
    dispatch(fetchUnicommerceOverview({ range, channel: 'ALL' }));
    dispatch(fetchMarqueeData(range));
  }, [dispatch, range]);

  useEffect(() => {
    dispatch(fetchGA4RealtimeWidgetData({ location: realtimeLocation, metric: realtimeMetric }));
  }, [dispatch, realtimeLocation, realtimeMetric]);

  useEffect(() => {
    const id = window.setInterval(() => {
      dispatch(refreshGA4Realtime());
      dispatch(fetchGA4RealtimeWidgetData({ location: realtimeLocation, metric: realtimeMetric }));
    }, 60 * 1000);
    return () => window.clearInterval(id);
  }, [dispatch, realtimeLocation, realtimeMetric]);

  const displaySkus = topSkus;

  const codPct = kpis && (kpis.codOrders + kpis.prepaidOrders) > 0
    ? (kpis.codOrders / (kpis.codOrders + kpis.prepaidOrders)) * 100
    : 0;
  const prevCodPct = prevKpis && (prevKpis.codOrders + prevKpis.prepaidOrders) > 0
    ? (prevKpis.codOrders / (prevKpis.codOrders + prevKpis.prepaidOrders)) * 100
    : undefined;

  /* ── Sparkline trend arrays for top KPI strip ───────────────────── */
  const revenueSpark    = useMemo(() => revenueTrend.map((d) => Number(d.revenue ?? 0)), [revenueTrend]);
  const aovSpark        = useMemo(
    () => revenueTrend.map((d) => (Number(d.orders ?? 0) > 0 ? Number(d.revenue ?? 0) / Number(d.orders) : 0)),
    [revenueTrend],
  );
  const sessionsSpark   = useMemo(() => ga4Overview.map((d) => Number(d.sessions     ?? 0)), [ga4Overview]);
  const activeUserSpark = useMemo(() => ga4Overview.map((d) => Number(d.active_users ?? 0)), [ga4Overview]);
  const newUserSpark    = useMemo(() => ga4Overview.map((d) => Number(d.new_users    ?? 0)), [ga4Overview]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--neg-soft)] p-8 text-center max-w-md">
          <p className="text-[var(--neg)] font-semibold mb-2">Connection Error</p>
          <p className="text-[var(--text-muted)] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const showPageLoader = (loading && !kpis) || (ga4Loading && !ga4Summary);

  return (
    <DrawerProvider>
      <InfoDrawer />
      {showPageLoader && <PageLoader overlay />}
      <Ticker />
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">

          {/* ═══ ROW 1 · KPI STRIP (5 cards) ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Gross Sales"
              value={formatINR(kpis?.revenue)}
              delta={delta(kpis?.revenue, prevKpis?.revenue)}
              sub={`${formatNum(kpis?.orders)} orders`}
              icon={TrendingUp}
              trend={revenueSpark}
              loading={loading}
            />
            <KpiCard
              label="AOV"
              labelTooltip="Average Order Value"
              value={formatINR(kpis?.aov)}
              delta={delta(kpis?.aov, prevKpis?.aov)}
              sub="avg order value"
              icon={IndianRupee}
              trend={aovSpark}
              loading={loading}
            />
            <KpiCard
              label="Sessions (GA4)"
              value={formatNum(ga4Summary?.total_sessions)}
              delta={ga4Insights?.sessions_delta_pct}
              sub="traffic · vs prev period"
              icon={Globe}
              trend={sessionsSpark}
              loading={ga4Loading}
            />
            <KpiCard
              label="Active Users"
              value={formatNum(ga4Summary?.total_users)}
              delta={ga4Insights?.users_delta_pct}
              sub="unique · vs prev period"
              icon={Users}
              trend={activeUserSpark}
              loading={ga4Loading}
            />
            <KpiCard
              label="New Users"
              value={formatNum(ga4Summary?.total_new_users)}
              delta={ga4Insights?.new_users_delta_pct}
              sub="first-time · vs prev period"
              icon={UserPlus}
              trend={newUserSpark}
              loading={ga4Loading}
            />
          </div>

          {/* ═══ ROW 2 · REVENUE OVERVIEW + LIVE (2 + 1) ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RevenueByChannelPanel data={unicommerceRevenueTrend} range={range} className="lg:col-span-2" />
            <Panel
              title="Live Active Users"
              subtitle="Last 30 minutes · GA4"
              info={{ what: 'GA4 realtime active users in the last 30 minutes, trended per minute and split by country or city.', source: 'Google Analytics 4' }}
            >
              <RealtimeActiveUsers
                data={realtimeWidget}
                location={realtimeLocation}
                metric={realtimeMetric}
                onLocationChange={setRealtimeLocation}
                onMetricChange={setRealtimeMetric}
              />
            </Panel>
          </div>

          {/* ═══ ROW 3 · OPS PULSE — Recent Orders (2/3) + stacked right (1/3) ═══
              Right column stacks Abandoned Carts (top) and COD vs Prepaid
              (bottom) so we get three panels in two visual columns. Recent
              Orders gets the wider 2/3 to render a proper order table. */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              className="lg:col-span-2"
              title="Recent Orders"
              subtitle="Shopify · Last 10 orders this period"
              info={{ what: 'Total orders for the selected period and the 10 most recent orders.', source: 'Shopify Orders' }}
              ai={{ observation: 'Order velocity is the fastest real-time signal for campaign performance.', insight: 'Spikes in recent orders often correlate with email/SMS sends or social posts going viral. Use this to confirm paid campaign impact within minutes of launch.', actions: ['Monitor feed after every campaign launch', 'Alert on zero orders for > 2 hours during peak hours', 'Cross-reference high-value orders with campaign UTMs'] }}
            >
              <div className="flex flex-col h-full">
                <div className="mb-3 shrink-0">
                  <RecentOrdersHeaderStat kpis={kpis} prevKpis={prevKpis} />
                </div>
                <div className="flex-1 min-h-0">
                  <LiveActivityFeed orders={recentOrders} />
                </div>
              </div>
            </Panel>

            <div className="flex flex-col gap-4">
            <Panel
              title="Abandoned Carts"
              subtitle="Shopify · Recoverable revenue"
              info={{ what: 'Count of abandoned carts with their total cart value and average cart value.', source: 'Shopify Checkouts' }}
              ai={{ observation: 'Abandoned carts often recover at 8–12% with timely email + SMS sequences.', insight: 'Recovery emails sent within 2 hours convert 3× better than next-day sends. High cart value + abandonment can indicate COD anxiety or shipping cost surprise.', actions: ['Trigger recovery email within 2h of abandonment', 'Add trust badges and prepaid discounts near cart totals', 'A/B test "Complete your order" subject lines'] }}
            >
              <div className="flex flex-col gap-4">
                <AbandonedCartsWidget carts={abandonedCarts} />

                <div className="h-px bg-[var(--line)]" />

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-widish text-[var(--muted)] mb-3">Logistics Overview</p>
                  {(() => {
                    const statusMap: Record<string, { label: string; color: string }> = {
                      delivered:        { label: 'Delivered',  color: POS },
                      in_transit:       { label: 'In Transit', color: ACCENT },
                      out_for_delivery: { label: 'OFD',        color: WARN },
                      rto:              { label: 'RTO',        color: NEG },
                      ndr:              { label: 'NDR',        color: MUTED },
                    };
                    const total = logistics.reduce((s, l) => s + Number(l.count), 0);
                    const rtoItem = logistics.find((l) => l.current_status_code?.toLowerCase() === 'rto');
                    const rtoRate = total > 0 && rtoItem ? (Number(rtoItem.count) / total) * 100 : 0;
                    const slots = ['delivered', 'in_transit', 'out_for_delivery', 'rto', 'ndr'];

                    return (
                      <>
                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {slots.map((code) => {
                            const item = logistics.find((l) => l.current_status_code?.toLowerCase() === code);
                            const { label, color } = statusMap[code] ?? { label: code, color: MUTED };
                            return (
                              <div key={code} className="text-center px-1 py-2 rounded-lg">
                                <p className="font-mono text-[18px] font-medium leading-none tabular-nums" style={{ color }}>
                                  {item ? formatNum(Number(item.count)) : 0}
                                </p>
                                <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.04em] text-[var(--muted)] truncate">
                                  {label}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        <div className="h-px bg-[var(--line)] mb-2" />
                        <div className="flex justify-between items-center text-[11.5px] text-[var(--muted)]">
                          <span>Total Shipments <span className="ml-1 font-mono font-medium text-[var(--ink)] tabular-nums">{formatNum(total)}</span></span>
                          <span>RTO Rate <span className="ml-1 font-mono font-medium tabular-nums" style={{ color: rtoRate > 10 ? NEG : POS }}>{rtoRate.toFixed(1)}%</span></span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </Panel>

            <Panel
              title="COD vs Prepaid"
              subtitle="Shopify · Payment mix"
              info={{ what: 'Split between Cash on Delivery and Prepaid orders for the period.', source: 'Shopify Orders' }}
              ai={{ observation: `${codPct.toFixed(0)}% COD orders carry ~3× the RTO risk of prepaid.${prevCodPct !== undefined ? ` Previously ${prevCodPct.toFixed(0)}%.` : ''}`, insight: 'A 5% shift to prepaid meaningfully improves cash flow and RTO rate. Prepaid customers are also more intentional buyers.', actions: ['Offer ₹50–100 prepaid discount at checkout', 'Show trust signals (reviews, delivery guarantee) at checkout', 'Run prepaid-only flash sales monthly'] }}
            >
              <div className="flex h-full gap-4 items-stretch">
                <div className="flex-1 min-w-0 flex flex-col">
                  <CodPrepaidDonut codPct={codPct} />
                </div>
                <div className="flex flex-col justify-center gap-2.5 shrink-0 text-xs text-[var(--text-muted)] min-w-[110px]">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: WARN }} />
                    <span>COD</span>
                    <span className="ml-auto font-mono font-medium tabular-nums text-[var(--ink)]">{codPct.toFixed(1)}%</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: POS }} />
                    <span>Prepaid</span>
                    <span className="ml-auto font-mono font-medium tabular-nums text-[var(--ink)]">{(100 - codPct).toFixed(1)}%</span>
                  </span>
                </div>
              </div>
            </Panel>
            </div>
          </div>

          {/* ═══ ROW 4 · SPEND & OPS (full) ═══ */}
          <RevenueVsSpendPanel data={revenueVsSpend} range={range} />

          {/* ═══ ROW 5 · GA4 CONVERSION (3-col) ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Traffic Trend" subtitle={`GA4 · Sessions · Users · New · ${rangeLabel(range)}`}>
              <TrafficTrendChart data={ga4Overview} />
            </Panel>
            <Panel title="Ecommerce Trend" subtitle="Shopify Gross Sales · GA4 Transactions">
              <EcommerceTrend ecommerce={ga4Ecommerce} revenueVsSpend={revenueVsSpend} />
            </Panel>
            <Panel title="Conversion Funnel" subtitle="GA4 · Sessions → Cart → Checkouts → Purchases">
              <ConversionFunnel data={conversionFunnel} />
            </Panel>
          </div>

          {/* ═══ ROW 6 · TRAFFIC SOURCES + GEOGRAPHY (1/2 + 1/2) ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Acquisition" subtitle={`GA4 · Traffic by channel · ${rangeLabel(range)}`}>
              <ChannelBreakdown data={ga4Channels} />
            </Panel>
            <ActiveUsersCountryMapCard data={countryActiveUsers} loading={ga4Loading} subtitle={`GA4 · ${rangeLabel(range)}`} />
          </div>

          {/* ═══ ROW 7 · CAMPAIGN + TOP PAGES (1/2 + 1/2) ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title="Campaign Performance"
              subtitle={`Meta Ads · ${rangeLabel(range)}`}
              info={{ what: 'Meta ad campaigns ranked by spend. Status is computed from ROAS and CTR: Scale (ROAS ≥ 3×), Hold (1.5–3×), Cut (< 1.5×).', source: 'Meta Ads API', readIt: 'Scale winners by duplicating ad sets. Cut campaigns below 1.5× ROAS after 3+ days of data.' }}
              ai={{ observation: 'Campaign ROAS variance indicates some creatives significantly outperform others.', insight: 'Budget concentration in top 20% of campaigns yields 80% of returns. Rapidly pause underperformers and scale winners within the same ad set structure.', actions: ['Pause campaigns with ROAS < 1.5x for 3+ days', 'Duplicate top ad sets with 20% budget increase', 'Test new creatives against control at 10% budget'] }}
            >
              <div className="overflow-auto max-h-[360px] pr-1">
                <table className="w-full text-xs min-w-[600px]">
                  <thead className="sticky top-0 bg-[var(--surface)] z-10">
                    <tr className="border-b border-[var(--border)]">
                      {['Campaign', 'Spend', 'Revenue', 'ROAS', 'CTR', 'CPM', 'Freq', 'Status'].map((h) => (
                        <th key={h} className={cn('py-2 pr-3 text-[var(--text-muted)] font-medium', h === 'Campaign' ? 'text-left' : 'text-right last:text-center')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 8).map((c) => {
                      const roas = Number(c.roas);
                      const ctr  = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
                      const cpm  = c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0;
                      const freq = c.reach > 0 ? c.impressions / c.reach : 0;
                      const status = roas >= 3 ? 'Scale' : roas >= 1.5 ? 'Hold' : 'Cut';
                      const statusStyle = status === 'Scale' ? 'bg-[var(--pos-soft)] text-[var(--pos)]' : status === 'Hold' ? 'bg-[var(--warn-soft)] text-[var(--warn)]' : 'bg-[var(--neg-soft)] text-[var(--neg)]';
                      const roasStyle = roas >= 3 ? 'text-[var(--pos)] font-semibold' : roas >= 1.5 ? 'text-[var(--warn)] font-semibold' : 'text-[var(--neg)] font-semibold';
                      return (
                        <tr key={c.campaign_id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                          <td className="py-2.5 pr-3 text-[var(--text)] max-w-[200px] truncate">{c.campaign_name}</td>
                          <td className="py-2.5 pr-3 text-[var(--text-muted)] text-right">{formatINR(c.spend)}</td>
                          <td className="py-2.5 pr-3 text-[var(--text-muted)] text-right">{formatINR(c.purchase_value)}</td>
                          <td className={cn('py-2.5 pr-3 text-right', roasStyle)}>{roas.toFixed(2)}x</td>
                          <td className="py-2.5 pr-3 text-[var(--text-muted)] text-right">{ctr.toFixed(2)}%</td>
                          <td className="py-2.5 pr-3 text-[var(--text-muted)] text-right">₹{Math.round(cpm)}</td>
                          <td className="py-2.5 pr-3 text-[var(--text-muted)] text-right">{freq.toFixed(1)}</td>
                          <td className="py-2.5 text-center">
                            <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold', statusStyle)}>{status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Top Pages & Screens" subtitle="GA4 · Views · Users · Events · Bounce">
              <TopPagesScreensTable data={pagesScreens} />
            </Panel>
          </div>

          {/* ═══ ROW 8 · PRODUCTS (3-col) ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top 5 Products (Shopify) */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 flex flex-col">
              <h3 className="font-semibold text-sm text-[var(--text)]">Top 5 Products</h3>
              <p className="mt-[3px] mb-4 text-[11.5px] leading-[1.3] text-[var(--muted)]">Shopify · top 5 by gross sales</p>
              <div className="space-y-0">
                <div className="grid grid-cols-[1.5rem_1fr_3rem_3.5rem] text-[10px] font-medium text-[var(--text-muted)] uppercase pb-1.5 border-b border-[var(--border)]">
                  <span>#</span><span>Product</span><span className="text-right">Units</span><span className="text-right">Gross Sales</span>
                </div>
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={p.product_id} className="grid grid-cols-[1.5rem_1fr_3rem_3.5rem] items-center py-1.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-xs text-[var(--text-muted)]">#{i + 1}</span>
                    <span className="text-xs font-medium text-[var(--text)] truncate pr-1">{p.title}</span>
                    <span className="text-xs text-[var(--text-muted)] text-right">{formatNum(p.units_sold)}</span>
                    <span className="text-xs font-semibold text-right" style={{ color: ACCENT }}>{formatINR(p.revenue)}</span>
                  </div>
                ))}
                {topProducts.length === 0 && (
                  <p className="text-xs text-[var(--text-subtle)] text-center py-6">No data</p>
                )}
              </div>
              {topProducts.length > 0 && (() => {
                const topFive = topProducts.slice(0, 5);
                const totalUnits = topFive.reduce((sum, p) => sum + Number(p.units_sold), 0);
                const totalRevenue = topFive.reduce((sum, p) => sum + Number(p.revenue), 0);
                return (
                  <div className="mt-auto pt-4">
                    <div className="h-px bg-[var(--border)] mb-3" />
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Total units</p>
                        <p className="text-sm font-semibold text-[var(--text)]">{formatNum(totalUnits)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Top 5 gross sales</p>
                        <p className="text-sm font-semibold" style={{ color: ACCENT }}>{formatINR(totalRevenue)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Top Rated Products (Judge.me) */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
              <h3 className="font-semibold text-sm text-[var(--text)]">Top Rated Products</h3>
              <p className="mt-[3px] mb-4 text-[11.5px] leading-[1.3] text-[var(--muted)]">Judge.me · top 5 by rating</p>
              {topRatedProducts.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center">No data</p>
              ) : (
                <div className="space-y-3">
                  {topRatedProducts.slice(0, 5).map((p, i) => (
                    <div key={p.product_id} className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-muted)] w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text)] truncate">{p.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{p.reviews_count} review{p.reviews_count !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="text-sm font-semibold shrink-0" style={{ color: WARN }}>
                        {'★'.repeat(Math.round(p.average_rating))} {p.average_rating.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Review Summary */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 flex flex-col">
              <h3 className="font-semibold text-sm text-[var(--text)]">Review Summary</h3>
              <p className="mt-[3px] mb-4 text-[11.5px] leading-[1.3] text-[var(--muted)]">Judge.me · store rating & breakdown</p>
              {reviewsSummary ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-4xl font-bold leading-none" style={{ color: WARN }}>{Number(reviewsSummary.store_rating).toFixed(1)}</p>
                    <div>
                      <div className="flex gap-0.5 mb-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <span key={s} className="text-base leading-none" style={{ color: s <= Math.round(reviewsSummary.store_rating) ? WARN : 'var(--line-2)' }}>★</span>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{formatNum(reviewsSummary.total_reviews)} reviews</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {([5, 4, 3, 2, 1] as const).map((star) => {
                      const key = `${['five','four','three','two','one'][5 - star]}_star` as keyof typeof reviewsSummary;
                      const count = Number(reviewsSummary[key] ?? 0);
                      const pct = reviewsSummary.total_reviews > 0 ? (count / reviewsSummary.total_reviews) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-6 text-[var(--text-muted)] text-right shrink-0 tabular-nums">{star}★</span>
                          <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: WARN }} />
                          </div>
                          <span className="w-4 text-[var(--text-muted)] text-right shrink-0 tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 mb-3 pt-3 border-t border-[var(--border)]">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text)]">{formatNum(reviewsSummary.verified_count)}</p>
                        <p className="text-[10px] text-[var(--text-subtle)] truncate">Verified</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                        <Camera className="h-4 w-4 text-sky-500" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text)]">{formatNum(reviewsSummary.with_photos)}</p>
                        <p className="text-[10px] text-[var(--text-subtle)] truncate">With photos</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/reviews')}
                    className="mt-auto w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors text-xs font-medium text-[var(--text)]"
                  >
                    View all reviews
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.5} />
                  </button>
                </>
              ) : (
                <p className="text-xs text-[var(--text-muted)] text-center py-8">No review data</p>
              )}
            </div>
          </div>

          {/* ═══ ROW 9 · PRODUCT PERFORMANCE — GA4 funnel + Shopify SKUs (1/2 + 1/2) ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Top Viewed Products" subtitle="GA4 · views → added → purchased">
              <TopProductsGA4 data={ga4Products} />
            </Panel>
            <Panel title="Top SKUs by Gross Sales" subtitle="Shopify · top 10 by gross sales">
              <div className="overflow-auto max-h-[360px] pr-1">
                <table className="w-full text-xs min-w-[480px]">
                  <thead className="sticky top-0 bg-[var(--surface)] z-10">
                    <tr className="border-b border-[var(--border)]">
                      {['#', 'SKU', 'Product', 'Units', 'Orders', 'Gross Sales'].map((h, i) => (
                        <th key={h} className={cn('py-2 pr-3 text-[var(--text-muted)] font-medium text-xs', i < 3 ? 'text-left' : 'text-right')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displaySkus.slice(0, 10).map((s, i) => (
                      <tr key={s.sku} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                        <td className="py-2.5 pr-3 text-[var(--text-muted)] w-6">{i + 1}</td>
                        <td className="py-2.5 pr-4">
                          <span className="px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] font-mono text-[10px] text-[var(--text-muted)] whitespace-nowrap">{s.sku}</span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-[var(--text)] leading-tight">{s.title}</p>
                          {s.variant && <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">{s.variant}</p>}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-[var(--text-muted)] tabular-nums">{formatNum(s.units_sold)}</td>
                        <td className="py-2.5 pr-3 text-right text-[var(--text-muted)] tabular-nums">{formatNum(s.orders_count)}</td>
                        <td className="py-2.5 text-right font-semibold tabular-nums" style={{ color: ACCENT }}>{formatINR(s.revenue)}</td>
                      </tr>
                    ))}
                    {displaySkus.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-xs text-[var(--text-subtle)]">No data for this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

        </main>
      </div>
    </DrawerProvider>
  );
}
