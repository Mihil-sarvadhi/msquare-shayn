import { useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag, IndianRupee, TrendingUp, XCircle, Undo2,
  Table as TableIcon, PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  fetchUnicommerceOverview,
  fetchUnicommerceTodaySnapshot,
  fetchUnicommerceInventory,
  setSelectedChannel,
  type ChannelTab,
} from '@store/slices/unicommerceSlice';
import { Panel } from '@components/shared/Panel';
import { KpiCard } from '@components/shared/KpiCard';
import { PageLoader } from '@components/shared/PageLoader';
import { formatINR, formatNum, formatPct, formatDate } from '@utils/formatters';
import {
  ACCENT, TEAL, INFO, POS, WARN, NEG, MUTED, AI,
  GRID_STROKE, GRID_DASHARRAY, AXIS_TICK_COLOR, AXIS_TICK_SIZE,
  TOOLTIP_CONTENT_STYLE,
} from '@utils/constants/palette';
import { cn } from '@/lib/utils';
import type { ChannelSummaryRow, RevenueTrendRow } from '@app/types/unicommerce-api';

type TabDef = { key: ChannelTab; label: string; color: string };

const TABS: TabDef[] = [
  { key: 'ALL',      label: 'All Channels', color: ACCENT },
  { key: 'FLIPKART', label: 'Flipkart',     color: INFO   },
  { key: 'AMAZON',   label: 'Amazon',       color: WARN   },
  { key: 'MYNTRA',   label: 'Myntra',       color: AI     },
  { key: 'ETERNZ',   label: 'Eternz',       color: TEAL   },
];

const CHANNEL_COLORS: Record<string, string> = {
  FLIPKART: INFO,
  AMAZON:   WARN,
  MYNTRA:   AI,
  ETERNZ:   TEAL,
  UNKNOWN:  MUTED,
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETE:          POS,
  COMPLETED:         POS,
  PROCESSING:        ACCENT,
  CREATED:           ACCENT,
  CONFIRMED:         INFO,
  CANCELLED:         NEG,
  RETURNED:          WARN,
  RETURN_REQUESTED:  WARN,
  RETURN_EXPECTED:   WARN,
  ON_HOLD:           AI,
  UNKNOWN:           MUTED,
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? MUTED;
}

function channelColor(channel: string | null | undefined): string {
  if (!channel) return MUTED;
  if (CHANNEL_COLORS[channel]) return CHANNEL_COLORS[channel];
  // Match by substring so SHOPIFY_SHAYN, FLIPKART_SHAYN, etc. pick up the
  // right colour without needing every tenant variant in the table.
  const upper = channel.toUpperCase();
  if (upper.includes('SHOPIFY')) return ACCENT;
  if (upper.includes('FLIPKART')) return INFO;
  if (upper.includes('AMAZON')) return WARN;
  if (upper.includes('MYNTRA')) return AI;
  if (upper.includes('ETERNZ')) return TEAL;
  return MUTED;
}

const CATEGORY_COLORS: Record<string, string> = {
  Earring: INFO,
  Ring: NEG,
  Necklace: POS,
  Bracelet: WARN,
  Pendant: AI,
  Other: MUTED,
};

function categoryColor(category: string | null | undefined): string {
  if (!category) return MUTED;
  return CATEGORY_COLORS[category] ?? MUTED;
}

function statusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Exact rupees with Indian comma grouping, no decimals — e.g. 5896 → "₹5,896". */
function formatINRExact(value: number): string {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

/* ── Aggregations ────────────────────────────────────────────────────── */

interface KpiTotals {
  orders: number;
  revenue: number;
  aov: number;
  cancelled: number;
  returned: number;
  cancelledPct: number;
  returnedPct: number;
  codOrders: number;
  prepaidOrders: number;
}

function aggregateSummary(rows: ChannelSummaryRow[]): KpiTotals {
  const orders = rows.reduce((s, r) => s + Number(r.orders ?? 0), 0);
  const revenue = rows.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
  const cancelled = rows.reduce((s, r) => s + Number(r.cancelled ?? 0), 0);
  const returned = rows.reduce((s, r) => s + Number(r.returned ?? 0), 0);
  const codOrders = rows.reduce((s, r) => s + Number(r.cod_orders ?? 0), 0);
  const prepaidOrders = rows.reduce((s, r) => s + Number(r.prepaid_orders ?? 0), 0);
  const aov = orders > 0 ? revenue / orders : 0;
  return {
    orders,
    revenue,
    aov,
    cancelled,
    returned,
    cancelledPct: orders > 0 ? (cancelled / orders) * 100 : 0,
    returnedPct: orders > 0 ? (returned / orders) * 100 : 0,
    codOrders,
    prepaidOrders,
  };
}

type TrendMetric = 'revenue' | 'units_sold';

/** Pivot trend rows by date with one column per channel for the line chart.
 *  `metric` toggles which numeric column is plotted (revenue ₹ vs units sold). */
function pivotTrendByChannel(
  rows: RevenueTrendRow[],
  metric: TrendMetric,
): {
  data: Array<Record<string, number | string>>;
  channels: string[];
  total: number;
} {
  const byDate = new Map<string, Record<string, number | string>>();
  const channelSet = new Set<string>();
  let total = 0;

  for (const r of rows) {
    if (!r.date) continue;
    channelSet.add(r.channel);
    const value = Number(r[metric] ?? 0);
    total += value;
    const existing = byDate.get(r.date) ?? { date: r.date };
    existing[r.channel] = (Number(existing[r.channel] ?? 0) as number) + value;
    byDate.set(r.date, existing);
  }

  const data = Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  return { data, channels: Array.from(channelSet), total };
}

/* ── Page ────────────────────────────────────────────────────────────── */

export function MarketplacePage() {
  const dispatch = useAppDispatch();
  const range = useAppSelector((s) => s.range);
  const selectedChannel = useAppSelector((s) => s.unicommerce.selectedChannel);
  const loading = useAppSelector((s) => s.unicommerce.loading);
  const summary = useAppSelector((s) => s.unicommerce.summary);
  const revenueTrend = useAppSelector((s) => s.unicommerce.revenueTrend);
  const orderStatus = useAppSelector((s) => s.unicommerce.orderStatus);
  const channelComparison = useAppSelector((s) => s.unicommerce.channelComparison);
  const returns = useAppSelector((s) => s.unicommerce.returns);
  const recentOrders = useAppSelector((s) => s.unicommerce.recentOrders);
  const topCategories = useAppSelector((s) => s.unicommerce.topCategories);
  const topProductsPct = useAppSelector((s) => s.unicommerce.topProductsPct);
  const topProductsByChannel = useAppSelector((s) => s.unicommerce.topProductsByChannel);
  const channelReturns = useAppSelector((s) => s.unicommerce.channelReturns);
  const todaySnapshot = useAppSelector((s) => s.unicommerce.todaySnapshot);
  const inventorySummary = useAppSelector((s) => s.unicommerce.inventorySummary);
  const fastMovingSkus = useAppSelector((s) => s.unicommerce.fastMovingSkus);
  const zeroOrderSkus = useAppSelector((s) => s.unicommerce.zeroOrderSkus);

  useEffect(() => {
    dispatch(fetchUnicommerceOverview({ range, channel: selectedChannel }));
  }, [dispatch, range, selectedChannel]);

  // Today/Yesterday cards are independent of the date-range filter and
  // refresh on a 5-minute timer so they stay live without a manual reload.
  useEffect(() => {
    dispatch(fetchUnicommerceTodaySnapshot());
    const id = setInterval(() => {
      dispatch(fetchUnicommerceTodaySnapshot());
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [dispatch]);

  // Inventory snapshot refreshes when the inventory sync runs (typically
  // hourly), so a 10-minute poll is plenty.
  useEffect(() => {
    dispatch(fetchUnicommerceInventory());
    const id = setInterval(() => {
      dispatch(fetchUnicommerceInventory());
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [dispatch]);

  const [trendMetric, setTrendMetric] = useState<TrendMetric>('revenue');

  const totals = useMemo(() => aggregateSummary(summary), [summary]);
  const trendPivot = useMemo(
    () => pivotTrendByChannel(revenueTrend, trendMetric),
    [revenueTrend, trendMetric],
  );

  const orderStatusData = useMemo(
    () =>
      orderStatus.map((row) => ({
        name: statusLabel(row.status),
        rawStatus: row.status,
        value: Number(row.count ?? 0),
      })),
    [orderStatus],
  );

  const codSplitData = useMemo(
    () => [
      { name: 'COD',     value: totals.codOrders,     color: WARN },
      { name: 'Prepaid', value: totals.prepaidOrders, color: POS  },
    ],
    [totals.codOrders, totals.prepaidOrders],
  );

  const topStates = useMemo(() => {
    const map = new Map<string, { state: string; orders: number; revenue: number }>();
    for (const o of recentOrders) {
      const state = o.state ?? 'Unknown';
      const existing = map.get(state) ?? { state, orders: 0, revenue: 0 };
      existing.orders += 1;
      existing.revenue += Number(o.total_price ?? 0);
      map.set(state, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [recentOrders]);

  const channelComparisonData = useMemo(
    () =>
      channelComparison.map((row) => ({
        channel: row.channel,
        orders: Number(row.orders ?? 0),
        revenue: Number(row.revenue ?? 0),
      })),
    [channelComparison],
  );

  /**
   * Build per-channel and per-category share rows for the
   * "Top Performing X" table/pie panels. Uses the same data the page
   * already fetches — no additional API calls.
   */
  const topChannelShares = useMemo<ShareRow[]>(() => {
    const totalRevenue = summary.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    return summary
      .map((row) => ({
        label: row.channel,
        revenue: Number(row.revenue ?? 0),
        pct: totalRevenue > 0 ? (Number(row.revenue ?? 0) / totalRevenue) * 100 : 0,
      }))
      .filter((r) => r.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [summary]);

  const topCategoryShares = useMemo<ShareRow[]>(
    () =>
      topCategories.map((row) => ({
        label: row.category,
        revenue: Number(row.revenue ?? 0),
        pct: Number(row.pct_of_total ?? 0),
      })),
    [topCategories],
  );

  const returnsByChannel = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of returns) {
      const key = r.channel ?? 'UNKNOWN';
      map.set(key, (map.get(key) ?? 0) + Number(r.count ?? 0));
    }
    return Array.from(map.entries()).map(([channel, count]) => ({ channel, count }));
  }, [returns]);

  const returnReasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of returns) {
      const key = r.return_reason ?? 'Unspecified';
      map.set(key, (map.get(key) ?? 0) + Number(r.count ?? 0));
    }
    return Array.from(map.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [returns]);

  const isInitial = loading && summary.length === 0 && recentOrders.length === 0;

  return (
    <div className="px-5 sm:px-7 py-5 flex flex-col gap-5">
      {/* Snapshot KPI strip — Today/Yesterday + Inventory, independent of the range picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SnapshotCard
          label="Today's Revenue"
          value={todaySnapshot ? formatINRExact(todaySnapshot.today_revenue) : '—'}
          comparison={
            todaySnapshot
              ? `Yesterday's Revenue: ${formatINRExact(todaySnapshot.yesterday_revenue)}`
              : ' '
          }
        />
        <SnapshotCard
          label="Today's Order Items"
          value={todaySnapshot ? formatNum(todaySnapshot.today_order_items) : '—'}
          comparison={
            todaySnapshot
              ? `Yesterday's Order Items: ${formatNum(todaySnapshot.yesterday_order_items)}`
              : ' '
          }
        />
        <SnapshotCard
          label="Total Counts of SKU's"
          value={inventorySummary ? formatNum(inventorySummary.total_skus) : '—'}
          comparison=" "
        />
        <SnapshotCard
          label="Out of Stock % of SKU's"
          value={
            inventorySummary ? `${inventorySummary.out_of_stock_pct.toFixed(2)}%` : '—'
          }
          comparison={
            inventorySummary
              ? `${formatNum(inventorySummary.out_of_stock_skus)} SKUs at zero`
              : ' '
          }
        />
      </div>

      {/* Channel tabs */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-2)] border border-[var(--line)] w-fit">
        {TABS.map(({ key, label, color }) => {
          const isActive = selectedChannel === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => dispatch(setSelectedChannel(key))}
              className={cn(
                'px-3 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap',
                'transition-all duration-200',
                isActive
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]',
              )}
              style={isActive ? { borderColor: color } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>

      {isInitial ? (
        <PageLoader />
      ) : (
        <>
          {/* Row 1 — KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard
              label="Total Orders"
              value={formatNum(totals.orders)}
              icon={ShoppingBag}
              loading={loading && summary.length === 0}
            />
            <KpiCard
              label="Total Revenue"
              value={formatINR(totals.revenue)}
              icon={IndianRupee}
              loading={loading && summary.length === 0}
            />
            <KpiCard
              label="Average Order Value"
              value={formatINR(totals.aov)}
              icon={TrendingUp}
              loading={loading && summary.length === 0}
            />
            <KpiCard
              label="Cancelled Orders"
              value={formatNum(totals.cancelled)}
              sub={`${formatPct(totals.cancelledPct)} of total`}
              icon={XCircle}
              loading={loading && summary.length === 0}
            />
            <KpiCard
              label="Returned Orders"
              value={formatNum(totals.returned)}
              sub={`${formatPct(totals.returnedPct)} of total`}
              icon={Undo2}
              loading={loading && summary.length === 0}
            />
          </div>

          {/* Row 2 — Revenue trend (2/3) + Channel comparison (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              title={trendMetric === 'revenue' ? 'Revenue Trend' : 'Order Item Trend'}
              subtitle={
                trendMetric === 'revenue'
                  ? `${formatINRExact(trendPivot.total)} total · daily ${selectedChannel === 'ALL' ? 'per marketplace' : `for ${TABS.find((t) => t.key === selectedChannel)?.label}`}`
                  : `${formatNum(trendPivot.total)} order items · daily ${selectedChannel === 'ALL' ? 'per marketplace' : `for ${TABS.find((t) => t.key === selectedChannel)?.label}`}`
              }
              action={
                <div className="flex items-center gap-1 p-0.5 rounded-full bg-[var(--bg-2)] border border-[var(--line)]">
                  {(
                    [
                      { key: 'revenue', label: 'Revenue' },
                      { key: 'units_sold', label: 'Order Item' },
                    ] as const
                  ).map(({ key, label }) => {
                    const isActive = trendMetric === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTrendMetric(key)}
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all',
                          isActive
                            ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)]'
                            : 'text-[var(--muted)] hover:text-[var(--ink)]',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              }
              className="lg:col-span-2"
            >
              {trendPivot.data.length === 0 ? (
                <EmptyState
                  message={
                    trendMetric === 'revenue'
                      ? 'No revenue data in this range'
                      : 'No order items in this range'
                  }
                />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trendPivot.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray={GRID_DASHARRAY} stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: AXIS_TICK_COLOR, fontSize: AXIS_TICK_SIZE }}
                      tickFormatter={(d: string) => formatDate(d)}
                    />
                    <YAxis
                      tick={{ fill: AXIS_TICK_COLOR, fontSize: AXIS_TICK_SIZE }}
                      tickFormatter={(v: number) =>
                        trendMetric === 'revenue' ? formatINR(v) : formatNum(v)
                      }
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_CONTENT_STYLE}
                      formatter={(value: number) =>
                        trendMetric === 'revenue'
                          ? formatINRExact(Number(value))
                          : formatNum(Number(value))
                      }
                      labelFormatter={(label: string) => formatDate(label)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: AXIS_TICK_COLOR }} />
                    {trendPivot.channels.map((ch) => (
                      <Line
                        key={ch}
                        type="monotone"
                        dataKey={ch}
                        stroke={channelColor(ch)}
                        strokeWidth={1.6}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Channel Comparison" subtitle="Orders by marketplace">
              {channelComparisonData.length === 0 ? (
                <EmptyState message="No channel data" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={channelComparisonData}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray={GRID_DASHARRAY} stroke={GRID_STROKE} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: AXIS_TICK_COLOR, fontSize: AXIS_TICK_SIZE }}
                      tickFormatter={(v: number) => formatNum(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="channel"
                      tick={{ fill: AXIS_TICK_COLOR, fontSize: AXIS_TICK_SIZE }}
                      width={120}
                      interval={0}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_CONTENT_STYLE}
                      formatter={(value: number, name: string) =>
                        name === 'revenue' ? formatINR(value) : formatNum(value)
                      }
                    />
                    <Bar dataKey="orders" radius={[0, 4, 4, 0]}>
                      {channelComparisonData.map((row) => (
                        <Cell key={row.channel} fill={channelColor(row.channel)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          {/* Row 3 — Order status / COD vs Prepaid / Top states */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Order Status" subtitle="Distribution by current status">
              {orderStatusData.length === 0 ? (
                <EmptyState message="No status data" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {orderStatusData.map((row) => (
                        <Cell key={row.rawStatus} fill={statusColor(row.rawStatus)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_CONTENT_STYLE}
                      formatter={(value: number) => formatNum(value)}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, color: AXIS_TICK_COLOR }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="COD vs Prepaid" subtitle="Payment mode split">
              {totals.codOrders + totals.prepaidOrders === 0 ? (
                <EmptyState message="No payment data" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={codSplitData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {codSplitData.map((row) => (
                        <Cell key={row.name} fill={row.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_CONTENT_STYLE}
                      formatter={(value: number) => formatNum(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Top States" subtitle="By recent order revenue">
              {topStates.length === 0 ? (
                <EmptyState message="No state data" />
              ) : (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widish text-[var(--muted)]">
                      <th className="py-1.5">State</th>
                      <th className="py-1.5 text-right">Orders</th>
                      <th className="py-1.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topStates.map((row) => (
                      <tr key={row.state} className="border-t border-[var(--line)]">
                        <td className="py-1.5 text-[var(--ink)] font-medium">{row.state}</td>
                        <td className="py-1.5 text-right tabular-nums text-[var(--ink-2)]">
                          {formatNum(row.orders)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-[var(--ink-2)]">
                          {formatINR(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>

          {/* Row 4 — Top Performing Channels + Top Performing Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopShareCard
              title="Top Performing Channels"
              labelKey="channel"
              rows={topChannelShares}
              colorFor={(label) => channelColor(label)}
            />
            <TopShareCard
              title="Top Performing Categories"
              labelKey="category"
              rows={topCategoryShares}
              colorFor={(label) => categoryColor(label)}
            />
          </div>

          {/* Row 5 — Top Performing Products (with % of total) */}
          <Panel title="Top Performing Products" subtitle="Best-sellers by revenue">
            {topProductsPct.length === 0 ? (
              <EmptyState message="No product data in this range" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] min-w-[640px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widish text-[var(--muted)]">
                      <th className="py-2">SKU Code</th>
                      <th className="py-2">SKU Name</th>
                      <th className="py-2 text-right">% of Total</th>
                      <th className="py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductsPct.map((row) => (
                      <tr key={row.sku} className="border-t border-[var(--line)]">
                        <td className="py-2 text-[var(--ink)] font-mono">{row.sku}</td>
                        <td className="py-2 text-[var(--ink-2)] truncate max-w-[420px]">
                          {row.product_name ?? '—'}
                        </td>
                        <td className="py-2 text-right tabular-nums text-[var(--muted)]">
                          {formatPct(row.pct_of_total, 2)}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium text-[var(--ink)]">
                          {formatINRExact(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Row 6 — Channel-wise Top Performing Products */}
          <Panel
            title="Channel-wise Top Performing Products"
            subtitle="Per-channel revenue for the top SKUs"
          >
            {topProductsByChannel.length === 0 ? (
              <EmptyState message="No channel revenue in this range" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] min-w-[820px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widish text-[var(--muted)]">
                      <th className="py-2">SKU Code</th>
                      <th className="py-2">Channel Product Name</th>
                      <th className="py-2 text-right">Shopify</th>
                      <th className="py-2 text-right">Amazon</th>
                      <th className="py-2 text-right">Flipkart</th>
                      <th className="py-2 text-right">Myntra</th>
                      <th className="py-2 text-right">Eternz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductsByChannel.map((row) => (
                      <tr key={row.sku} className="border-t border-[var(--line)]">
                        <td className="py-2 text-[var(--ink)] font-mono">{row.sku}</td>
                        <td className="py-2 text-[var(--ink-2)] truncate max-w-[360px]">
                          {row.product_name ?? '—'}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {row.shopify_revenue > 0 ? formatINRExact(row.shopify_revenue) : '—'}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {row.amazon_revenue > 0 ? formatINRExact(row.amazon_revenue) : '—'}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {row.flipkart_revenue > 0 ? formatINRExact(row.flipkart_revenue) : '—'}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {row.myntra_revenue > 0 ? formatINRExact(row.myntra_revenue) : '—'}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {row.eternz_revenue > 0 ? formatINRExact(row.eternz_revenue) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Row 6.5 — Channel Wise Return Percent (sold vs returned units, stacked) */}
          <Panel
            title="Channel Wise Return Percent"
            subtitle="Stacked: total units sold + returned units per channel"
          >
            {channelReturns.length === 0 ? (
              <EmptyState message="No channel data in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={channelReturns} margin={{ top: 16, right: 16, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray={GRID_DASHARRAY} stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="channel"
                    tick={{ fill: AXIS_TICK_COLOR, fontSize: AXIS_TICK_SIZE }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fill: AXIS_TICK_COLOR, fontSize: AXIS_TICK_SIZE }}
                    tickFormatter={(v: number) => formatNum(v)}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    formatter={(value: number, name: string) => {
                      const label =
                        name === 'units_sold'
                          ? 'Total Units Sold'
                          : name === 'return_units'
                            ? 'Returns Unit'
                            : name;
                      return [formatNum(Number(value)), label];
                    }}
                    labelFormatter={(label: string) => {
                      const row = channelReturns.find((r) => r.channel === label);
                      return row ? `${label} — ${row.return_pct.toFixed(2)}% return rate` : label;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: AXIS_TICK_COLOR }}
                    formatter={(value) =>
                      value === 'units_sold'
                        ? 'Total Unit Sold'
                        : value === 'return_units'
                          ? 'Returns Unit'
                          : value
                    }
                  />
                  <Bar dataKey="units_sold" stackId="u" fill={INFO} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="return_units" stackId="u" fill={NEG} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          {/* Row 7 — Returns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Returns by Channel" subtitle="Total returns initiated">
              {returnsByChannel.length === 0 ? (
                <EmptyState message="No returns in this range" />
              ) : (
                <div className="space-y-2">
                  {returnsByChannel.map((row) => (
                    <div key={row.channel} className="flex items-center gap-3">
                      <ChannelChip channel={row.channel} />
                      <div className="flex-1 h-[10px] bg-[var(--bg-2)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${
                              (row.count /
                                Math.max(...returnsByChannel.map((r) => r.count), 1)) *
                              100
                            }%`,
                            backgroundColor: channelColor(row.channel),
                          }}
                        />
                      </div>
                      <span className="text-[12px] tabular-nums text-[var(--ink)] w-10 text-right">
                        {formatNum(row.count)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Top Return Reasons" subtitle="What's driving returns">
              {returnReasons.length === 0 ? (
                <EmptyState message="No return reasons logged" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={returnReasons}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray={GRID_DASHARRAY} stroke={GRID_STROKE} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: AXIS_TICK_COLOR, fontSize: AXIS_TICK_SIZE }}
                    />
                    <YAxis
                      type="category"
                      dataKey="reason"
                      tick={{ fill: AXIS_TICK_COLOR, fontSize: AXIS_TICK_SIZE }}
                      width={140}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_CONTENT_STYLE}
                      formatter={(value: number) => formatNum(value)}
                    />
                    <Bar dataKey="count" fill={NEG} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          {/* Row 6 — Recent Orders */}
          <Panel title="Recent Orders" subtitle="Latest 20 orders in range">
            {recentOrders.length === 0 ? (
              <EmptyState message="No recent orders" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] min-w-[820px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widish text-[var(--muted)]">
                      <th className="py-2">Order ID</th>
                      <th className="py-2">Channel</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Customer</th>
                      <th className="py-2">City</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2 text-center">Pay</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((row) => (
                      <tr key={row.order_code} className="border-t border-[var(--line)]">
                        <td className="py-2 font-mono text-[var(--ink)]">
                          {row.display_order_code ?? row.order_code}
                        </td>
                        <td className="py-2">
                          <ChannelChip channel={row.channel} />
                        </td>
                        <td className="py-2 text-[var(--muted)] tabular-nums">
                          {row.order_date ? formatDate(row.order_date) : '—'}
                        </td>
                        <td className="py-2 text-[var(--ink-2)] truncate max-w-[160px]">
                          {row.customer_name ?? '—'}
                        </td>
                        <td className="py-2 text-[var(--ink-2)]">
                          {row.city ?? '—'}{row.state ? `, ${row.state}` : ''}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium text-[var(--ink)]">
                          {formatINR(row.total_price)}
                        </td>
                        <td className="py-2 text-center">
                          <span
                            className={cn(
                              'inline-block rounded-full px-2 py-[2px] text-[10px] font-medium',
                              row.cod
                                ? 'bg-[var(--amber-soft,rgba(200,120,11,0.12))] text-[var(--amber,#C8780B)]'
                                : 'bg-[var(--green-soft)] text-[var(--green)]',
                            )}
                          >
                            {row.cod ? 'COD' : 'Prepaid'}
                          </span>
                        </td>
                        <td className="py-2">
                          <span
                            className="inline-block rounded-full px-2 py-[2px] text-[10px] font-medium"
                            style={{
                              backgroundColor: `${statusColor(row.status ?? 'UNKNOWN')}1A`,
                              color: statusColor(row.status ?? 'UNKNOWN'),
                            }}
                          >
                            {statusLabel(row.status ?? 'UNKNOWN')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Inventory tables — Fast Moving (left) + Zero Orders (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Inventory Availability of Fast Moving SKUs">
              {fastMovingSkus.length === 0 ? (
                <EmptyState message="Inventory not synced yet — run npm run backfill:unicommerce:inventory" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widish text-[var(--muted)]">
                        <th className="py-2">SKU Code</th>
                        <th className="py-2">SKU Name</th>
                        <th className="py-2 text-right">Inventory</th>
                        <th className="py-2 text-right">Sale (30d)</th>
                        <th className="py-2 text-right">Days of Inv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fastMovingSkus.map((row) => (
                        <tr key={row.sku} className="border-t border-[var(--line)]">
                          <td className="py-2 text-[var(--ink)] font-mono">{row.sku}</td>
                          <td className="py-2 text-[var(--ink-2)] truncate max-w-[260px]">
                            {row.product_name ?? '—'}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {formatNum(row.inventory)}
                          </td>
                          <td className="py-2 text-right tabular-nums font-medium text-[var(--ink)]">
                            {formatNum(row.sales_last_30_days)}
                          </td>
                          <td className="py-2 text-right tabular-nums text-[var(--muted)]">
                            {row.days_of_inventory != null
                              ? Number(row.days_of_inventory).toFixed(0)
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Products with Zero Order">
              {zeroOrderSkus.length === 0 ? (
                <EmptyState message="No zero-order SKUs (or inventory not synced)" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widish text-[var(--muted)]">
                        <th className="py-2">SKU</th>
                        <th className="py-2">Name</th>
                        <th className="py-2 text-right">Inventory</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zeroOrderSkus.map((row) => (
                        <tr key={row.sku} className="border-t border-[var(--line)]">
                          <td className="py-2 text-[var(--ink)] font-mono">{row.sku}</td>
                          <td className="py-2 text-[var(--ink-2)] truncate max-w-[300px]">
                            {row.product_name ?? '—'}
                          </td>
                          <td className="py-2 text-right tabular-nums font-medium text-[var(--ink)]">
                            {formatNum(row.inventory)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

interface ShareRow {
  label: string;
  revenue: number;
  pct: number;
}

interface TopShareCardProps {
  title: string;
  labelKey: string;
  rows: ShareRow[];
  colorFor: (label: string) => string;
}

/**
 * Shared "Top X by share" panel — identical layout to Uniware's
 * `TOP PERFORMING CHANNELS` / `TOP PERFORMING CATEGORIES` cards. Toggles
 * between a sortable table and a pie chart of the same data.
 */
function TopShareCard({ title, labelKey, rows, colorFor }: TopShareCardProps) {
  const [view, setView] = useState<'table' | 'pie'>('pie');

  return (
    <Panel
      title={title}
      action={
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-[var(--bg-2)] border border-[var(--line)]">
          {(
            [
              { key: 'pie', label: 'Pie', icon: PieIcon },
              { key: 'table', label: 'Table', icon: TableIcon },
            ] as const
          ).map(({ key, icon: Icon }) => {
            const isActive = view === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                title={key === 'table' ? 'Table view' : 'Pie chart view'}
                className={cn(
                  'inline-flex items-center justify-center h-6 w-6 rounded-full transition-all',
                  isActive
                    ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]',
                )}
              >
                <Icon size={12} strokeWidth={1.6} />
              </button>
            );
          })}
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState message="No data in this range" />
      ) : view === 'table' ? (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widish text-[var(--muted)]">
              <th className="py-2">{labelKey}</th>
              <th className="py-2 text-right">% of Total</th>
              <th className="py-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-[var(--line)]">
                <td className="py-2 text-[var(--ink)] flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: colorFor(row.label) }}
                  />
                  {row.label}
                </td>
                <td className="py-2 text-right tabular-nums text-[var(--muted)]">
                  {row.pct.toFixed(2)}
                </td>
                <td className="py-2 text-right tabular-nums font-medium text-[var(--ink)]">
                  {formatINRExact(row.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={rows}
              dataKey="revenue"
              nameKey="label"
              cx="50%"
              cy="46%"
              outerRadius={82}
              paddingAngle={1}
              // Keep channel/category labels visible without clipping long names.
              label={({ name, percent }: { name: string; percent: number }) => {
                const shortName = name.length > 12 ? `${name.slice(0, 12)}...` : name;
                return `${shortName} ${(percent * 100).toFixed(0)}%`;
              }}
              labelLine
            >
              {rows.map((row) => (
                <Cell key={row.label} fill={colorFor(row.label)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              formatter={(value: number) => formatINRExact(Number(value))}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: 10, color: AXIS_TICK_COLOR, paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

interface SnapshotCardProps {
  label: string;
  value: string;
  comparison: string;
}

/** Today's vs Yesterday's snapshot card (matches Uniware's TENANT WISE
 *  SALES PERFORMANCE strip). Always renders; `comparison` is shown muted. */
function SnapshotCard({ label, value, comparison }: SnapshotCardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--surface)] rounded-[12px] border border-[var(--line)]',
        'px-4 py-3 flex flex-col gap-1',
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-widish text-[var(--muted)]">
        {label}
      </span>
      <span className="text-[26px] font-medium leading-none tracking-tightx tabular-nums text-[var(--ink)]">
        {value}
      </span>
      <span className="text-[11.5px] text-[var(--muted)] tabular-nums">{comparison}</span>
    </div>
  );
}

function ChannelChip({ channel }: { channel: string | null | undefined }) {
  const label = channel ?? 'Unknown';
  const color = channelColor(channel);
  return (
    <span
      className="inline-block rounded-full px-2 py-[2px] text-[10px] font-medium"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-[12px] text-[var(--muted)]">
      {message}
    </div>
  );
}
