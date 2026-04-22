import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Camera, ChevronRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchDashboard } from '@store/slices/dashboardSlice';
import { fetchMarketingData, fetchOperationsData } from '@store/slices/analyticsSlice';
import { DrawerProvider } from '@components/shared/DrawerContext';
import { InfoDrawer } from '@components/shared/InfoDrawer';
import { KpiCard } from '@components/shared/KpiCard';
import { Panel } from '@components/shared/Panel';
import { CustomTooltip } from '@components/shared/CustomTooltip';
import { formatINR, formatNum, formatPct, formatDate } from '@utils/formatters';
import { rangeLabel } from '@utils/common-functions/buildRangeParams';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { RangeState } from '@store/slices/rangeSlice';
import type { KPIs, RecentOrder, RevenueTrendItem, RevenueVsSpendItem } from '@app/types/dashboard';
// import type { ChannelRevenue } from '@app/types/analytics'; // re-enable with ChannelRevenueChart

const ACCENT = '#8b6f3a';
const POS    = '#2d7a5f';
// const NEG = '#b8433a'; // re-enable with WaterfallChart / ChannelRevenueChart
const WARN   = '#c4871f';
const MUTED  = '#a39f92';

/* ─── Delta helpers ─────────────────────────────────────────── */
function delta(current: number | undefined | null, prev: number | undefined | null): number | undefined {
  const c = Number(current ?? 0);
  const p = Number(prev ?? 0);
  if (!p) return undefined;
  return ((c - p) / p) * 100;
}

/* ─── Revenue by Channel (hero panel — self-contained) ─────── */
const CHANNEL_DEFS = [
  { key: 'shopify',  label: 'Shopify',  color: ACCENT,   active: true  },
  { key: 'amazon',   label: 'Amazon',   color: '#e8a838', active: false },
  { key: 'flipkart', label: 'Flipkart', color: '#c4871f', active: false },
  { key: 'myntra',   label: 'Myntra',   color: '#6b5529', active: false },
  { key: 'eternz',   label: 'Eternz',   color: '#a39f92', active: false },
] as const;

/* Fill every calendar date between first and last so spacing is even */
function fillDateSeries(data: RevenueTrendItem[]): RevenueTrendItem[] {
  if (data.length === 0) return data;
  const map = new Map(data.map((d) => [d.date.slice(0, 10), d]));
  const start = new Date(data[0].date);
  const end   = new Date(data[data.length - 1].date);
  const result: RevenueTrendItem[] = [];
  for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const key = cur.toISOString().slice(0, 10);
    result.push(map.get(key) ?? { date: key, revenue: 0, orders: 0 });
  }
  return result;
}

/* Round up to a "nice" tick ceiling */
function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(v)));
  const step = magnitude >= 1000 ? magnitude / 2 : magnitude;
  return Math.ceil((v * 1.15) / step) * step;
}

/* Short INR axis label: ₹10K, ₹2.5L, ₹1Cr */
function fmtAxisINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

/* Day is suspicious if revenue=0 but neighbours on both sides have data */
function isSyncGap(data: RevenueTrendItem[], idx: number): boolean {
  if (data[idx].revenue !== 0) return false;
  const hasPrev = data.slice(0, idx).some((d) => d.revenue > 0);
  const hasNext = data.slice(idx + 1).some((d) => d.revenue > 0);
  return hasPrev && hasNext;
}

/* Format date for X-axis tick: "14 Apr" */
function fmtAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' })}`;
}

function RevenueByChannelPanel({ data, range, className }: { data: RevenueTrendItem[]; range: RangeState; className?: string }) {
  const filled    = useMemo(() => fillDateSeries(data), [data]);
  const chartData = filled;
  const yMax      = useMemo(() => niceMax(Math.max(...chartData.map((d) => d.revenue), 1)), [chartData]);
  const xInterval = Math.max(1, Math.floor(chartData.length / 6) - 1);
  const todayKey  = new Date().toISOString().slice(0, 10);

  return (
    <Panel
      className={className}
      title="Revenue by Channel"
      subtitle={`Daily · ${rangeLabel(range)}`}
      info={{ what: 'Daily Shopify revenue over the selected period. Amazon, Flipkart, Myntra and Eternz channels will be added once connected.', source: 'Shopify Orders', readIt: 'Each bar = one day/week of revenue. Zero-revenue interior days may indicate a sync gap.' }}
      ai={{ observation: 'Revenue cadence reveals dependence on weekend spikes vs weekday consistency.', insight: 'Consistent mid-week revenue (Mon–Thu) indicates organic demand; spikes on weekends usually correlate with email campaigns or Meta ads. A healthy brand builds both.', actions: ['Launch campaigns Mon–Wed to lift weekday baseline', 'Schedule email sends for Tuesday 10am for best open rates', 'Track revenue per day-of-week to find highest-conversion day'] }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtAxisDate}
            tick={{ fontSize: 10, fill: MUTED }}
            tickLine={false}
            interval={xInterval}
          />
          <YAxis
            tickFormatter={fmtAxisINR}
            tick={{ fontSize: 10, fill: MUTED }}
            axisLine={false}
            tickLine={false}
            domain={[0, yMax]}
            tickCount={5}
          />
          <Tooltip
            content={
              <CustomTooltip
                formatter={(v: number) => (v === 0 ? 'No orders' : formatINR(v))}
              />
            }
            cursor={{ fill: 'rgba(139,111,58,0.06)' }}
          />
          <Bar dataKey="revenue" name="Shopify" radius={[3, 3, 0, 0]} maxBarSize={24}>
            {chartData.map((d, i) => {
              const isGap     = isSyncGap(chartData, i);
              const isToday   = d.date.slice(0, 10) === todayKey;
              const isNoData  = d.revenue === 0;
              const fill = isGap
                ? '#f0c070'                       /* amber — possible sync issue */
                : isToday
                  ? `${ACCENT}99`               /* semi-transparent — partial day */
                  : isNoData
                    ? '#e8e6df'                  /* very light — legitimately zero */
                    : ACCENT;
              return <Cell key={i} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend row */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[var(--border)]">
        {CHANNEL_DEFS.map((ch) => (
          <span
            key={ch.key}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              ch.active ? 'text-[var(--text-muted)]' : 'text-[var(--text-subtle)] opacity-50',
            )}
            title={ch.active ? undefined : 'Coming soon — connect this channel to unlock'}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: ch.active ? ch.color : '#d4d1c7' }}
            />
            {ch.label}
            {!ch.active && (
              <span className="text-[9px] font-medium bg-[var(--surface-2)] text-[var(--text-subtle)] px-1 py-0.5 rounded">
                soon
              </span>
            )}
          </span>
        ))}
        {/* Partial-day legend entry when today is in range */}
        {chartData.some((d) => d.date.slice(0, 10) === todayKey) && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-subtle)]">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: `${ACCENT}99` }} />
            Today (partial)
          </span>
        )}
      </div>
    </Panel>
  );
}

/* ─── COD / Prepaid donut ───────────────────────────────────── */
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
          <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Channel Revenue bars ──────────────────────────────────── */
/* ChannelRevenueChart — commented out until multi-channel attribution is live
function ChannelRevenueChart({ data }: { data: ChannelRevenue | null }) {
  if (!data) return <div className="h-40 flex items-center justify-center text-[var(--text-subtle)] text-sm">No data</div>;
  const bars = [
    { name: 'Shopify', value: data.shopify_revenue, fill: ACCENT },
    { name: 'Meta Attr.', value: data.meta_revenue, fill: '#5b4299' },
    { name: 'Organic', value: data.organic_revenue, fill: POS },
  ];
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={bars} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} />
        <YAxis tickFormatter={(v: number) => formatINR(v)} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={(v) => formatINR(v)} />} />
        <Bar dataKey="value" name="Revenue" radius={[4, 4, 0, 0]}>
          {bars.map((b, i) => <Cell key={i} fill={b.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
*/

/* ─── Live Activity feed ────────────────────────────────────── */
function LiveActivityFeed({ orders, kpis, prevKpis }: { orders: RecentOrder[]; kpis: KPIs | null; prevKpis: KPIs | null }) {
  const ordersToday = kpis?.orders ?? 0;
  const prevOrders  = prevKpis?.orders ?? 0;
  const ordersDelta = prevOrders > 0 ? ((ordersToday - prevOrders) / prevOrders) * 100 : undefined;
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)] mb-1">Orders this period</p>
      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-3xl font-semibold text-[var(--text)]">{formatNum(ordersToday)}</p>
        {ordersDelta !== undefined && (
          <span className={cn(
            'text-xs font-semibold px-1.5 py-0.5 rounded-full',
            ordersDelta >= 0 ? 'bg-[var(--pos-soft)] text-[var(--pos)]' : 'bg-[var(--neg-soft)] text-[var(--neg)]',
          )}>
            {ordersDelta >= 0 ? '↑' : '↓'} {Math.abs(ordersDelta).toFixed(1)}%
          </span>
        )}
      </div>
      {prevOrders > 0 && (
        <p className="text-xs text-[var(--text-subtle)] mb-3">vs {formatNum(prevOrders)} previous period</p>
      )}
      <div className="space-y-0">
        {orders.map((o, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
            <div>
              <p className="text-xs font-medium text-[var(--text)]">{o.order_name}</p>
              <p className="text-xs text-[var(--text-subtle)]">{o.customer_city}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-[var(--accent)]">{formatINR(o.revenue)}</p>
              <p className="text-xs text-[var(--text-subtle)]">{formatDate(o.created_at)}</p>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <p className="text-xs text-[var(--text-subtle)] text-center py-4">No recent orders</p>
        )}
      </div>
    </div>
  );
}

/* ─── Waterfall ─────────────────────────────────────────────── */
/* WaterfallChart — commented out with Revenue Waterfall panel
function WaterfallChart({ gross, logistics, rtoWaste }: { gross: number; logistics: number; rtoWaste: number }) {
  const net = Math.max(0, gross - logistics - rtoWaste);

  const rows = [
    { label: 'Gross Revenue',  value: gross,     pct: 100,                              color: ACCENT, sign: ''  },
    { label: 'Logistics Cost', value: logistics,  pct: gross > 0 ? (logistics / gross) * 100 : 0, color: NEG,   sign: '−' },
    { label: 'RTO Waste',      value: rtoWaste,  pct: gross > 0 ? (rtoWaste  / gross) * 100 : 0, color: WARN,  sign: '−' },
    { label: 'Net Revenue',    value: net,        pct: gross > 0 ? (net       / gross) * 100 : 0, color: POS,   sign: ''  },
  ];

  return (
    <div className="space-y-3 pt-1">
      {rows.map((row, i) => {
        const isDeduction = row.sign === '−';
        const isLast = i === rows.length - 1;
        return (
          <div key={row.label}>
            {isLast && <div className="h-px bg-[var(--border)] my-1" />}
            <div className="flex items-center gap-3">
              <div className="w-32 shrink-0">
                <p className="text-xs text-[var(--text-muted)]">{row.label}</p>
              </div>
              <div className="flex-1 h-5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(row.pct, isDeduction && row.value > 0 ? 1.5 : 0)}%`,
                    backgroundColor: row.color,
                    opacity: isDeduction ? 0.85 : 1,
                  }}
                />
              </div>
              <div className="w-24 text-right shrink-0">
                <span
                  className="text-sm font-semibold"
                  style={{ color: isDeduction ? row.color : isLast ? POS : 'var(--text)' }}
                >
                  {row.sign}{formatINR(row.value)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
*/

/* ─── Revenue vs Spend Trend ────────────────────────────────── */
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
      title="Revenue vs Spend Trend"
      subtitle={`Daily · ${rangeLabel(range)}`}
      info={{ what: 'Daily Shopify revenue overlaid with daily Meta ad spend on a dual Y-axis.', source: 'Shopify Orders + Meta Ads', readIt: 'When revenue spikes lead spend spikes by 1–2 days, it signals organic demand. When spend spikes first, it confirms paid acquisition is driving sales.' }}
      ai={{ observation: 'Revenue and ad spend correlation reveals how efficiently paid campaigns drive orders.', insight: 'A high correlation (spend up → revenue up same day) indicates paid dependency. Low correlation suggests organic pull or attribution lag. Healthy brands show revenue continuing to grow after spend pauses.', actions: ['Pause spend for 48h occasionally to measure organic baseline', 'Compare day-of-week patterns: is weekend revenue paid or organic?', 'Track revenue/spend ratio weekly as a quick efficiency gauge'] }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 10, fill: MUTED }}
            tickLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis
            yAxisId="rev"
            orientation="left"
            tickFormatter={(v: number) => `₹${(v / 100000).toFixed(1)}L`}
            tick={{ fontSize: 10, fill: MUTED }}
            axisLine={false}
            tickLine={false}
            domain={[0, maxRevenue * 1.15]}
          />
          <YAxis
            yAxisId="spend"
            orientation="right"
            tickFormatter={(v: number) => `₹${(v / 100000).toFixed(1)}L`}
            tick={{ fontSize: 10, fill: MUTED }}
            axisLine={false}
            tickLine={false}
            domain={[0, maxSpend * 1.15]}
          />
          <Tooltip
            content={
              <CustomTooltip
                formatter={(v, name) =>
                  `${name === 'Ad spend' ? '₹' : '₹'}${Number(v).toLocaleString('en-IN')}`
                }
              />
            }
          />
          <Line
            yAxisId="rev"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={ACCENT}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="spend"
            type="monotone"
            dataKey="ad_spend"
            name="Ad spend"
            stroke="#c97d3a"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 inline-block rounded" style={{ backgroundColor: ACCENT }} />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 inline-block rounded border-dashed border-t-2" style={{ borderColor: '#c97d3a' }} />
          Ad spend
        </span>
      </div>
    </Panel>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export function DashboardPage() {
  const dispatch = useAppDispatch();
  const {
    kpis, prevKpis, revenueTrend, campaigns, abandonedCarts, recentOrders,
    revenueVsSpend, loading, error,
    topProducts, logistics, reviewsSummary, topRatedProducts,
  } = useAppSelector((s) => s.dashboard);
  const { topSkus } = useAppSelector((s) => s.analytics);
  const range = useAppSelector((s) => s.range);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchDashboard(range));
    dispatch(fetchMarketingData(range));
    dispatch(fetchOperationsData(range));
  }, [dispatch, range]);

  const displaySkus = topSkus;

  const codPct = kpis && (kpis.codOrders + kpis.prepaidOrders) > 0
    ? (kpis.codOrders / (kpis.codOrders + kpis.prepaidOrders)) * 100
    : 0;
  const prevCodPct = prevKpis && (prevKpis.codOrders + prevKpis.prepaidOrders) > 0
    ? (prevKpis.codOrders / (prevKpis.codOrders + prevKpis.prepaidOrders)) * 100
    : undefined;

  const mer = kpis && kpis.revenue > 0 ? kpis.adSpend / kpis.revenue : 0;
  const prevMer = prevKpis && prevKpis.revenue > 0 ? prevKpis.adSpend / prevKpis.revenue : undefined;
  const merDelta = prevMer ? ((mer - prevMer) / prevMer) * 100 : undefined;

  const cac = kpis && kpis.customers > 0 ? kpis.adSpend / kpis.customers : 0;
  const prevCac = prevKpis && prevKpis.customers > 0 ? prevKpis.adSpend / prevKpis.customers : 0;

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="bg-white rounded-xl border border-[var(--neg-soft)] p-8 text-center max-w-md">
          <p className="text-[var(--neg)] font-semibold mb-2">Connection Error</p>
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

          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard
              label="Revenue"
              value={formatINR(kpis?.revenue)}
              delta={delta(kpis?.revenue, prevKpis?.revenue)}
              sub={`${formatNum(kpis?.orders)} orders`}
              loading={loading}
            />
            <KpiCard
              label="Avg Order Value"
              value={formatINR(kpis?.aov)}
              delta={delta(kpis?.aov, prevKpis?.aov)}
              sub="per order"
              loading={loading}
            />
            <KpiCard
              label="Blended MER"
              value={`${mer.toFixed(2)}x`}
              delta={merDelta}
              sub={`${formatINR(kpis?.adSpend)} spend`}
              loading={loading}
            />
            <KpiCard
              label="New Customers"
              value={formatNum(kpis?.customers)}
              delta={delta(kpis?.customers, prevKpis?.customers)}
              sub={`CAC ${formatINR(cac)} ${prevCac > 0 ? `(was ${formatINR(prevCac)})` : ''}`}
              loading={loading}
            />
            <KpiCard
              label="RTO Rate"
              value={formatPct(kpis?.rtoRate)}
              delta={kpis && prevKpis && prevKpis.rtoRate
                ? -(((kpis.rtoRate - prevKpis.rtoRate) / prevKpis.rtoRate) * 100)
                : undefined}
              invertDelta
              sub={`${formatNum(kpis?.rto ?? 0)} returns`}
              loading={loading}
            />
          </div>

          {/* ── Hero: Revenue by Channel + Live Activity ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RevenueByChannelPanel data={revenueTrend} range={range} className="lg:col-span-2" />

            <Panel
              title="Recent Orders"
              subtitle="Last 5 orders this period"
              info={{ what: 'Total orders for the selected period and the 5 most recent orders.', source: 'Shopify Orders' }}
              ai={{ observation: 'Order velocity is the fastest real-time signal for campaign performance.', insight: 'Spikes in recent orders often correlate with email/SMS sends or social posts going viral. Use this to confirm paid campaign impact within minutes of launch.', actions: ['Monitor feed after every campaign launch', 'Alert on zero orders for > 2 hours during peak hours', 'Cross-reference high-value orders with campaign UTMs'] }}
            >
              <LiveActivityFeed orders={recentOrders} kpis={kpis} prevKpis={prevKpis} />
            </Panel>
          </div>

          {/* ── Revenue vs Spend Trend + COD vs Prepaid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RevenueVsSpendPanel data={revenueVsSpend} range={range} className="lg:col-span-2" />

            <Panel
              title="COD vs Prepaid"
              subtitle="Payment mix"
              info={{ what: 'Split between Cash on Delivery and Prepaid orders for the period.', source: 'Shopify Orders' }}
              ai={{ observation: `${codPct.toFixed(0)}% COD orders carry ~3× the RTO risk of prepaid.${prevCodPct !== undefined ? ` Previously ${prevCodPct.toFixed(0)}%.` : ''}`, insight: 'A 5% shift to prepaid meaningfully improves cash flow and RTO rate. Prepaid customers are also more intentional buyers.', actions: ['Offer ₹50–100 prepaid discount at checkout', 'Show trust signals (reviews, delivery guarantee) at checkout', 'Run prepaid-only flash sales monthly'] }}
            >
              <div className="flex flex-col h-full">
                <CodPrepaidDonut codPct={codPct} />
                <div className="flex justify-center gap-6 mt-2 shrink-0 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: WARN }} />COD {codPct.toFixed(1)}%</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: POS }} />Prepaid {(100 - codPct).toFixed(1)}%</span>
                </div>
              </div>
            </Panel>
          </div>

          {/* Revenue Waterfall — commented out pending iThink billed_total data quality review
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel
              title="Revenue Waterfall"
              subtitle="Gross → Net after logistics"
              info={{ what: 'How gross Shopify revenue reduces to net revenue after logistics cost and RTO waste.', source: 'Shopify + iThink' }}
              ai={{ observation: 'Logistics and RTO are the two biggest margin drains after COGS.', insight: 'Every 1% RTO reduction directly improves net margin. At ₹1Cr revenue, a 5% RTO drop is worth ₹2–3L in recovered margin.', metrics: [{ label: 'Gross Revenue', value: formatINR(netRevenue?.gross_revenue ?? 0) }, { label: 'Logistics Cost', value: formatINR(netRevenue?.logistics_cost ?? 0) }, { label: 'Net Revenue', value: formatINR(netRevenue?.net_revenue ?? 0) }], actions: ['Target sub-15% RTO as first milestone', 'Negotiate logistics rates above ₹5Cr monthly volume', 'Use weight reconciliation to catch billing errors'] }}
            >
              <WaterfallChart
                gross={netRevenue?.gross_revenue ?? 0}
                logistics={netRevenue?.logistics_cost ?? 0}
                rtoWaste={netRevenue?.rto_waste ?? 0}
              />
            </Panel>
          </div>
          */}

          {/* Channel Revenue — commented out until multi-channel attribution is live
          <Panel
            title="Channel Revenue"
            subtitle="Shopify · Meta attributed · Organic"
            info={{ what: 'Revenue split: total Shopify vs Meta-attributed vs organic (non-Meta) for the period.', source: 'Shopify + Meta Ads API' }}
            ai={{ observation: 'Organic revenue often exceeds Meta-attributed, signalling strong brand pull beyond paid ads.', insight: 'High organic share means earned demand — protect it by maintaining product quality and review velocity. Over-indexing on paid erodes organic margin.', actions: ['Track organic share month-over-month', 'Invest in SEO/UGC when organic share drops below 30%', 'Audit Meta attribution accuracy using UTM parameters'] }}
          >
            <ChannelRevenueChart data={channelRevenue} />
          </Panel>
          */}

          {/* ── Campaign Performance (left) + stacked right column ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            <Panel
              title="Campaign Performance"
              subtitle={`Meta Ads · ${rangeLabel(range)}`}
              className="lg:col-span-2"
              info={{ what: 'Meta ad campaigns ranked by spend. Status is computed from ROAS and CTR: Scale (ROAS ≥ 3×), Hold (1.5–3×), Cut (< 1.5×).', source: 'Meta Ads API', readIt: 'Scale winners by duplicating ad sets. Cut campaigns below 1.5× ROAS after 3+ days of data.' }}
              ai={{ observation: 'Campaign ROAS variance indicates some creatives significantly outperform others.', insight: 'Budget concentration in top 20% of campaigns yields 80% of returns. Rapidly pause underperformers and scale winners within the same ad set structure.', actions: ['Pause campaigns with ROAS < 1.5x for 3+ days', 'Duplicate top ad sets with 20% budget increase', 'Test new creatives against control at 10% budget'] }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
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
                      const statusStyle = status === 'Scale'
                        ? 'bg-[var(--pos-soft)] text-[var(--pos)]'
                        : status === 'Hold'
                          ? 'bg-[var(--warn-soft)] text-[var(--warn)]'
                          : 'bg-[var(--neg-soft)] text-[var(--neg)]';
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
                            <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold', statusStyle)}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Right column: Logistics Overview → Abandoned Carts */}
            <div className="flex flex-col gap-4">

              {/* Logistics Overview */}
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 flex-1 flex flex-col justify-center">
                <p className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-4">Logistics Overview</p>
                {(() => {
                  const statusMap: Record<string, { label: string; color: string }> = {
                    delivered:        { label: 'Delivered',  color: POS },
                    in_transit:       { label: 'In Transit', color: ACCENT },
                    out_for_delivery: { label: 'OFD',        color: WARN },
                    rto:              { label: 'RTO',        color: '#b8433a' },
                    ndr:              { label: 'NDR',        color: MUTED },
                  };
                  const total = logistics.reduce((s, l) => s + Number(l.count), 0);
                  const rtoItem = logistics.find((l) => l.current_status_code?.toLowerCase() === 'rto');
                  const rtoRate = total > 0 && rtoItem ? (Number(rtoItem.count) / total) * 100 : 0;
                  const slots = ['delivered', 'in_transit', 'out_for_delivery', 'rto', 'ndr'];
                  return (
                    <>
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {slots.map((code) => {
                          const item = logistics.find((l) => l.current_status_code?.toLowerCase() === code);
                          const { label, color } = statusMap[code] ?? { label: code, color: MUTED };
                          return (
                            <div key={code} className="text-center">
                              <p className="text-2xl font-bold" style={{ color }}>{item ? formatNum(Number(item.count)) : 0}</p>
                              <p className="text-[9px] text-[var(--text-muted)] flex items-center justify-center gap-0.5 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
                                <span className="truncate">{label}</span>
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="h-px bg-[var(--border)] mb-3" />
                      <div className="flex justify-between text-xs text-[var(--text-muted)]">
                        <span>Total Shipments <span className="font-semibold text-[var(--text)]">{formatNum(total)}</span></span>
                        <span>RTO Rate <span className="font-semibold" style={{ color: rtoRate > 10 ? '#b8433a' : POS }}>{rtoRate.toFixed(1)}%</span></span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Abandoned Carts */}
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 flex-1 flex flex-col justify-center">
                <p className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-4">Abandoned Carts</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-4xl font-semibold text-[var(--neg)]">{formatNum(abandonedCarts?.count ?? 0)}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">abandoned carts</p>
                  </div>
                  <div className="h-px bg-[var(--border)]" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xl font-semibold text-[var(--text)]">{formatINR(abandonedCarts?.total_value ?? 0)}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Cart Value Lost</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-[var(--text)]">{formatINR(abandonedCarts?.avg_value ?? 0)}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Avg Cart Value</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── Orders by Platform · Top Rated Products · Top 5 Products ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Orders by Platform */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
              <p className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-3">Orders by Platform</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text)]">Shopify D2C</span>
                  <span className="text-xl font-bold text-[var(--text)]">{formatNum(kpis?.orders ?? 0)}</span>
                </div>
                {['Amazon', 'Flipkart', 'Myntra'].map((platform) => (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-muted)]">{platform}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">Coming Soon</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Rated Products */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
              <p className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-3">Top Rated Products</p>
              {topRatedProducts.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center">No data</p>
              ) : (
                <div className="space-y-2">
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

            {/* Top 5 Products */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
              <p className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-3">Top 5 Products</p>
              <div className="space-y-0">
                <div className="grid grid-cols-[1.5rem_1fr_3rem_3.5rem] text-[10px] font-medium text-[var(--text-muted)] uppercase pb-1.5 border-b border-[var(--border)]">
                  <span>#</span><span>Product</span><span className="text-right">Units</span><span className="text-right">Revenue</span>
                </div>
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={p.product_id} className="grid grid-cols-[1.5rem_1fr_3rem_3.5rem] items-center py-1.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-xs text-[var(--text-muted)]">#{i + 1}</span>
                    <span className="text-xs font-medium text-[var(--text)] truncate pr-1">{p.title}</span>
                    <span className="text-xs text-[var(--text-muted)] text-right">{formatNum(p.units_sold)}</span>
                    <span className="text-xs font-semibold text-right" style={{ color: ACCENT }}>{formatINR(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Top 10 SKUs + Review Summary ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">

            {/* Top 10 SKUs */}
            <div className="lg:col-span-2 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 flex flex-col">
              <h3 className="font-semibold text-sm text-[var(--text)] mb-4 shrink-0">Top SKUs by Revenue</h3>
              <div className="overflow-auto flex-1">
                <table className="w-full text-xs min-w-[560px]">
                  <thead className="sticky top-0 bg-[var(--surface)] z-10">
                    <tr className="border-b border-[var(--border)]">
                      {['#', 'SKU', 'Product', 'Units', 'Orders', 'Revenue'].map((h, i) => (
                        <th key={h} className={cn('py-2 pr-3 text-[var(--text-muted)] font-medium text-xs', i < 3 ? 'text-left' : 'text-right')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displaySkus.slice(0, 5).map((s, i) => (
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
            </div>

            {/* Review Summary */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
              <h3 className="font-semibold text-sm text-[var(--text)] mb-4">Review Summary</h3>
              {reviewsSummary ? (
                <>
                  {/* Rating hero */}
                  <div className="flex items-center gap-3 mb-4">
                    <p className="text-5xl font-bold leading-none" style={{ color: WARN }}>{Number(reviewsSummary.store_rating).toFixed(1)}</p>
                    <div>
                      <div className="flex gap-0.5 mb-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <span key={s} className="text-lg leading-none" style={{ color: s <= Math.round(reviewsSummary.store_rating) ? WARN : '#e2ddd5' }}>★</span>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{formatNum(reviewsSummary.total_reviews)} reviews</p>
                    </div>
                  </div>

                  {/* Star breakdown */}
                  <div className="space-y-2 mb-4">
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

                  {/* Badges */}
                  <div className="space-y-2 mb-4 pt-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--text)]">{formatNum(reviewsSummary.verified_count)} verified</p>
                        <p className="text-[10px] text-[var(--text-subtle)]">Reviews from verified buyers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                        <Camera className="h-4 w-4 text-sky-500" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--text)]">{formatNum(reviewsSummary.with_photos)} with photos</p>
                        <p className="text-[10px] text-[var(--text-subtle)]">Customers shared product photos</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => navigate('/reviews')}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors text-xs font-medium text-[var(--text)]"
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

        </main>
      </div>
    </DrawerProvider>
  );
}
