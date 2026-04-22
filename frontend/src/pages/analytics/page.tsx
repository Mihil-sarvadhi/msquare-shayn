import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchGA4Data, refreshGA4Realtime } from '@store/slices/ga4Slice';
import { DrawerProvider } from '@components/shared/DrawerContext';
import { InfoDrawer } from '@components/shared/InfoDrawer';
import { KpiCard } from '@components/shared/KpiCard';
import { Panel } from '@components/shared/Panel';
import { CustomTooltip } from '@components/shared/CustomTooltip';
import { formatINR, formatNum } from '@utils/formatters';
import { rangeLabel } from '@utils/common-functions/buildRangeParams';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type {
  GA4Summary, GA4TrafficDaily, GA4Channel, GA4EcommerceDaily,
  GA4Product, GA4Device, GA4Geography, GA4Realtime,
} from '@app/types/ga4';

const ACCENT = '#8b6f3a';
const POS    = '#2d7a5f';
const INFO   = '#5b7cc7';
const WARN   = '#c4871f';
const NEG    = '#b8433a';
const MUTED  = '#a39f92';
const AI     = '#5b4299';

const CHANNEL_COLORS: Record<string, string> = {
  'Organic Search':  POS,
  'Direct':          ACCENT,
  'Paid Social':     INFO,
  'Organic Social':  AI,
  'Email':           WARN,
  'Referral':        '#2f9e9e',
  'Paid Search':     NEG,
  'Unassigned':      MUTED,
};
const FALLBACK_COLORS = [ACCENT, POS, INFO, WARN, AI, '#2f9e9e', NEG, MUTED];

function fmtDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtAxisDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${dt.toLocaleString('en-IN', { month: 'short' })}`;
}

/* ─── 1 · Summary cards ────────────────────────────────────── */
function AnalyticsSummaryCards({ s, loading }: { s: GA4Summary | null; loading: boolean }) {
  const bounce = s?.avg_bounce_rate ?? 0;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard label="Sessions"     value={formatNum(s?.total_sessions)}   sub="all visits"       loading={loading} />
      <KpiCard label="Users"        value={formatNum(s?.total_users)}      sub="unique users"     loading={loading} />
      <KpiCard label="New Users"    value={formatNum(s?.total_new_users)}  sub="first-time"       loading={loading} />
      <KpiCard label="Page Views"   value={formatNum(s?.total_page_views)} sub="total screens"    loading={loading} />
      <KpiCard
        label="Bounce Rate"
        value={`${(bounce * 100).toFixed(1)}%`}
        sub={bounce > 0.6 ? 'High — action needed' : bounce > 0.4 ? 'Moderate' : 'Healthy'}
        loading={loading}
      />
      <KpiCard label="Avg Session" value={fmtDuration(s?.avg_session_duration ?? 0)} sub="time on site" loading={loading} />
    </div>
  );
}

/* ─── 2 · Traffic trend ────────────────────────────────────── */
function TrafficTrendChart({ data }: { data: GA4TrafficDaily[] }) {
  if (!data.length) return <div className="h-64 flex items-center justify-center text-sm text-[var(--text-subtle)]">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} interval={Math.max(0, Math.floor(data.length / 7) - 1)} />
        <YAxis tickFormatter={formatNum} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={(v) => formatNum(Number(v))} />} />
        <Line type="monotone" dataKey="sessions"     name="Sessions"     stroke={ACCENT} strokeWidth={2}   dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="active_users" name="Active Users" stroke={POS}    strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="new_users"    name="New Users"    stroke={INFO}   strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─── 3 · Channel breakdown (donut + table) ────────────────── */
function ChannelBreakdown({ data }: { data: GA4Channel[] }) {
  const donutData = useMemo(() => data.map((c) => ({
    name:  c.channel || 'Unassigned',
    value: c.sessions,
    fill:  CHANNEL_COLORS[c.channel] ?? FALLBACK_COLORS[0],
  })), [data]);

  if (!data.length) return <div className="h-48 flex items-center justify-center text-sm text-[var(--text-subtle)]">No channel data</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2 flex flex-col min-h-[220px]">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2}>
                {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatNum(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2">
          {donutData.slice(0, 6).map((d) => (
            <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
              {d.name}
            </span>
          ))}
        </div>
      </div>
      <div className="lg:col-span-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 pr-3 text-left  text-[var(--text-muted)] font-medium">Channel</th>
              <th className="py-2 pr-3 text-right text-[var(--text-muted)] font-medium">Sessions</th>
              <th className="py-2 pr-3 text-right text-[var(--text-muted)] font-medium">Users</th>
              <th className="py-2 pr-3 text-right text-[var(--text-muted)] font-medium">Revenue</th>
              <th className="py-2      text-right text-[var(--text-muted)] font-medium">Conv %</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 8).map((c) => (
              <tr key={c.channel} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-2 text-[var(--text)]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHANNEL_COLORS[c.channel] ?? FALLBACK_COLORS[0] }} />
                    {c.channel || 'Unassigned'}
                  </span>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(c.sessions)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(c.active_users)}</td>
                <td className="py-2 pr-3 text-right tabular-nums" style={{ color: ACCENT }}>{formatINR(c.purchase_revenue)}</td>
                <td className="py-2      text-right tabular-nums text-[var(--text-muted)]">{(c.conversion_rate * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 4 · Ecommerce trend ──────────────────────────────────── */
function EcommerceTrend({ data }: { data: GA4EcommerceDaily[] }) {
  if (!data.length) return <div className="h-56 flex items-center justify-center text-sm text-[var(--text-subtle)]">No ecommerce data</div>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 48, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} interval={Math.max(0, Math.floor(data.length / 7) - 1)} />
        <YAxis yAxisId="rev"   tickFormatter={(v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="txn"   orientation="right" tickFormatter={formatNum} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={(v, name) => name === 'Revenue' ? formatINR(Number(v)) : formatNum(Number(v))} />} />
        <Line yAxisId="rev" type="monotone" dataKey="purchase_revenue" name="Revenue"      stroke={ACCENT} strokeWidth={2}   dot={false} activeDot={{ r: 4 }} />
        <Line yAxisId="txn" type="monotone" dataKey="transactions"     name="Transactions" stroke={POS}    strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─── 5 · Conversion funnel ────────────────────────────────── */
function ConversionFunnel({ summary, ecommerce }: { summary: GA4Summary | null; ecommerce: GA4EcommerceDaily[] }) {
  const sessions    = summary?.total_sessions ?? 0;
  const checkouts   = ecommerce.reduce((a, r) => a + Number(r.checkouts), 0);
  const purchases   = ecommerce.reduce((a, r) => a + Number(r.ecommerce_purchases), 0);

  const maxCount = Math.max(sessions, 1);
  const steps = [
    { label: 'Sessions',  count: sessions,  color: ACCENT, pct: 100 },
    { label: 'Checkouts', count: checkouts, color: INFO,   pct: sessions ? (checkouts / sessions) * 100 : 0 },
    { label: 'Purchases', count: purchases, color: POS,    pct: sessions ? (purchases / sessions) * 100 : 0 },
  ];

  const s2c = sessions   ? (checkouts / sessions)   * 100 : 0;
  const c2p = checkouts  ? (purchases / checkouts)  * 100 : 0;
  const overall = sessions ? (purchases / sessions) * 100 : 0;

  return (
    <div>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-[var(--text)]">{step.label}</span>
              <span className="text-xs text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text)]">{formatNum(step.count)}</span>
                {step.label !== 'Sessions' && <span className="ml-2">({step.pct.toFixed(2)}%)</span>}
              </span>
            </div>
            <div className="h-6 rounded-md bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full rounded-md transition-all duration-500"
                   style={{ width: `${Math.max((step.count / maxCount) * 100, 2)}%`, backgroundColor: step.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--border)] grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[10px] uppercase text-[var(--text-subtle)]">Session → Checkout</p>
          <p className="text-sm font-semibold" style={{ color: INFO }}>{s2c.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[var(--text-subtle)]">Checkout → Purchase</p>
          <p className="text-sm font-semibold" style={{ color: ACCENT }}>{c2p.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[var(--text-subtle)]">Overall Conv</p>
          <p className="text-sm font-semibold" style={{ color: POS }}>{overall.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}

/* ─── 6 · Top products ─────────────────────────────────────── */
function TopProductsGA4({ data }: { data: GA4Product[] }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-sm text-[var(--text-subtle)]">No product data</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[600px]">
        <thead>
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
          {data.slice(0, 10).map((p, i) => {
            const cartPct = p.items_viewed > 0 ? (p.items_added_to_cart / p.items_viewed) * 100 : 0;
            return (
              <tr key={p.item_name} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                <td className="py-2 pr-3 text-[var(--text-muted)]">{i + 1}</td>
                <td className="py-2 pr-3 text-[var(--text)] max-w-[260px] truncate" title={p.item_name}>{p.item_name || '(not set)'}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(p.items_viewed)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(p.items_added_to_cart)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(p.items_purchased)}</td>
                <td className="py-2 pr-3 text-right tabular-nums font-semibold" style={{ color: ACCENT }}>{formatINR(p.purchase_revenue)}</td>
                <td className="py-2      text-right tabular-nums" style={{ color: cartPct > 20 ? POS : cartPct > 10 ? WARN : NEG }}>{cartPct.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── 7 · Device breakdown ─────────────────────────────────── */
function DeviceBreakdown({ data }: { data: GA4Device[] }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-sm text-[var(--text-subtle)]">No device data</div>;
  const deviceColors: Record<string, string> = { mobile: ACCENT, desktop: POS, tablet: INFO };

  const sessionsData = data.map((d) => ({
    name:  d.device_category,
    value: d.sessions,
    fill:  deviceColors[d.device_category] ?? MUTED,
  }));
  const revenueData = data.map((d) => ({
    name:  d.device_category,
    value: d.purchase_revenue,
    fill:  deviceColors[d.device_category] ?? MUTED,
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[
        { title: 'Sessions', series: sessionsData, fmt: (v: number) => formatNum(v) },
        { title: 'Revenue',  series: revenueData,  fmt: (v: number) => formatINR(v) },
      ].map(({ title, series, fmt }) => (
        <div key={title} className="flex flex-col min-h-[180px]">
          <p className="text-[10px] uppercase text-[var(--text-subtle)] font-semibold text-center mb-1">{title}</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={series} cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value" paddingAngle={2}
                     label={(e: { name: string; percent?: number }) => `${e.name} ${(((e.percent ?? 0) * 100)).toFixed(0)}%`}
                     labelLine={false} style={{ fontSize: 10 }}>
                  {series.map((s, i) => <Cell key={i} fill={s.fill} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── 8 · Geography table ──────────────────────────────────── */
function GeographyTable({ data }: { data: GA4Geography[] }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-sm text-[var(--text-subtle)]">No geography data</div>;
  return (
    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[var(--surface)] z-10">
          <tr className="border-b border-[var(--border)]">
            <th className="py-2 pr-3 text-left  text-[var(--text-muted)] font-medium">State</th>
            <th className="py-2 pr-3 text-left  text-[var(--text-muted)] font-medium">City</th>
            <th className="py-2 pr-3 text-right text-[var(--text-muted)] font-medium">Users</th>
            <th className="py-2 pr-3 text-right text-[var(--text-muted)] font-medium">Sessions</th>
            <th className="py-2 pr-3 text-right text-[var(--text-muted)] font-medium">Revenue</th>
            <th className="py-2      text-right text-[var(--text-muted)] font-medium">Orders</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((g, i) => (
            <tr key={`${g.region}-${g.city}-${i}`} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
              <td className="py-2 pr-3 text-[var(--text)]">{g.region || '—'}</td>
              <td className="py-2 pr-3 text-[var(--text-muted)]">{g.city || '—'}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(g.active_users)}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(g.sessions)}</td>
              <td className="py-2 pr-3 text-right tabular-nums font-semibold" style={{ color: ACCENT }}>{formatINR(g.purchase_revenue)}</td>
              <td className="py-2      text-right tabular-nums text-[var(--text-muted)]">{formatNum(g.transactions)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── 9 · Realtime widget ──────────────────────────────────── */
function RealtimeWidget({ data, lastUpdated }: { data: GA4Realtime[]; lastUpdated: Date | null }) {
  const total = data.reduce((a, r) => a + Number(r.active_users), 0);
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: POS }} />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: POS }} />
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">Live</span>
      </div>
      <div className="mb-3">
        <p className="text-4xl font-bold text-[var(--text)]">{formatNum(total)}</p>
        <p className="text-xs text-[var(--text-muted)]">active users right now</p>
      </div>
      {data.length > 0 && (
        <div className="max-h-[180px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-1 pr-3 text-left  text-[var(--text-muted)] font-medium">Country</th>
                <th className="py-1 pr-3 text-left  text-[var(--text-muted)] font-medium">Device</th>
                <th className="py-1      text-right text-[var(--text-muted)] font-medium">Users</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 8).map((r, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1 pr-3 text-[var(--text)]">{r.country}</td>
                  <td className="py-1 pr-3 text-[var(--text-muted)]">{r.device_category}</td>
                  <td className="py-1      text-right tabular-nums font-semibold">{formatNum(r.active_users)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lastUpdated && (
        <p className="text-[10px] text-[var(--text-subtle)] mt-2">
          Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      )}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
export function AnalyticsPage() {
  const dispatch = useAppDispatch();
  const { summary, overview, channels, ecommerce, products, devices, geography, realtime, loading, error } =
    useAppSelector((s) => s.ga4);
  const range = useAppSelector((s) => s.range);

  useEffect(() => { dispatch(fetchGA4Data(range)); }, [dispatch, range]);

  // Auto-refresh realtime every 5 min
  useEffect(() => {
    const id = window.setInterval(() => dispatch(refreshGA4Realtime()), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [dispatch]);

  const lastUpdated = useMemo(() => {
    if (!realtime.length) return null;
    return new Date(realtime[0].updated_at);
  }, [realtime]);

  if (error) {
    return (
      <div className={cn('min-h-[60vh] flex items-center justify-center')}>
        <div className="bg-white rounded-xl border border-[var(--neg-soft)] p-8 text-center max-w-md">
          <p className="text-[var(--neg)] font-semibold mb-2">GA4 Error</p>
          <p className="text-[var(--text-muted)] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <DrawerProvider>
      <InfoDrawer />
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">

          <AnalyticsSummaryCards s={summary} loading={loading} />

          {/* Traffic trend + Realtime */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              title="Traffic Trend"
              subtitle={`Sessions · Users · New Users · ${rangeLabel(range)}`}
              className="lg:col-span-2"
            >
              <TrafficTrendChart data={overview} />
            </Panel>
            <Panel title="Realtime" subtitle="Active users now">
              <RealtimeWidget data={realtime} lastUpdated={lastUpdated} />
            </Panel>
          </div>

          {/* Acquisition */}
          <Panel title="Acquisition" subtitle={`Traffic by channel · ${rangeLabel(range)}`}>
            <ChannelBreakdown data={channels} />
          </Panel>

          {/* Ecommerce trend + funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Ecommerce Trend" subtitle="Revenue & transactions" className="lg:col-span-2">
              <EcommerceTrend data={ecommerce} />
            </Panel>
            <Panel title="Conversion Funnel" subtitle="Sessions → Checkouts → Purchases">
              <ConversionFunnel summary={summary} ecommerce={ecommerce} />
            </Panel>
          </div>

          {/* Products table */}
          <Panel title="Top Products" subtitle="Viewed · Added · Purchased · Revenue">
            <TopProductsGA4 data={products} />
          </Panel>

          {/* Devices + Geography */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Device Breakdown" subtitle="Sessions vs revenue">
              <DeviceBreakdown data={devices} />
            </Panel>
            <Panel title="Geography" subtitle="Top 20 locations by revenue" className="lg:col-span-2">
              <GeographyTable data={geography} />
            </Panel>
          </div>

        </main>
      </div>
    </DrawerProvider>
  );
}

/* silence unused import warning for BarChart/Bar until we wire a bar chart — keep imports ready */
void BarChart; void Bar;
