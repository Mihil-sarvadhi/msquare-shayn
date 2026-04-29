import { useEffect, useMemo } from 'react';
import {
  ShoppingBag, IndianRupee, TrendingUp, XCircle, Undo2,
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
  return CHANNEL_COLORS[channel] ?? MUTED;
}

function statusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

/* Pivot trend rows by date with one column per channel for the line chart. */
function pivotTrendByChannel(rows: RevenueTrendRow[]): {
  data: Array<Record<string, number | string>>;
  channels: string[];
} {
  const byDate = new Map<string, Record<string, number | string>>();
  const channelSet = new Set<string>();

  for (const r of rows) {
    if (!r.date) continue;
    channelSet.add(r.channel);
    const existing = byDate.get(r.date) ?? { date: r.date };
    existing[r.channel] = (Number(existing[r.channel] ?? 0) as number) + Number(r.revenue ?? 0);
    byDate.set(r.date, existing);
  }

  const data = Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  return { data, channels: Array.from(channelSet) };
}

/* ── Page ────────────────────────────────────────────────────────────── */

export function MarketplacePage() {
  const dispatch = useAppDispatch();
  const range = useAppSelector((s) => s.range);
  const selectedChannel = useAppSelector((s) => s.unicommerce.selectedChannel);
  const loading = useAppSelector((s) => s.unicommerce.loading);
  const summary = useAppSelector((s) => s.unicommerce.summary);
  const revenueTrend = useAppSelector((s) => s.unicommerce.revenueTrend);
  const topProducts = useAppSelector((s) => s.unicommerce.topProducts);
  const orderStatus = useAppSelector((s) => s.unicommerce.orderStatus);
  const channelComparison = useAppSelector((s) => s.unicommerce.channelComparison);
  const returns = useAppSelector((s) => s.unicommerce.returns);
  const recentOrders = useAppSelector((s) => s.unicommerce.recentOrders);

  useEffect(() => {
    dispatch(fetchUnicommerceOverview({ range, channel: selectedChannel }));
  }, [dispatch, range, selectedChannel]);

  const totals = useMemo(() => aggregateSummary(summary), [summary]);
  const trendPivot = useMemo(() => pivotTrendByChannel(revenueTrend), [revenueTrend]);

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
              title="Revenue Trend"
              subtitle={
                selectedChannel === 'ALL'
                  ? 'Daily revenue per marketplace'
                  : `Daily revenue for ${TABS.find((t) => t.key === selectedChannel)?.label}`
              }
              className="lg:col-span-2"
            >
              {trendPivot.data.length === 0 ? (
                <EmptyState message="No revenue data in this range" />
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
                      tickFormatter={(v: number) => formatINR(v)}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_CONTENT_STYLE}
                      formatter={(value: number) => formatINR(value)}
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
                      width={70}
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

          {/* Row 4 — Top Products */}
          <Panel title="Top Products" subtitle="Best-sellers by revenue">
            {topProducts.length === 0 ? (
              <EmptyState message="No product data in this range" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] min-w-[640px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-widish text-[var(--muted)]">
                      <th className="py-2 w-[36px]">#</th>
                      <th className="py-2">SKU</th>
                      <th className="py-2">Product</th>
                      <th className="py-2">Channel</th>
                      <th className="py-2 text-right">Units</th>
                      <th className="py-2 text-right">Revenue</th>
                      <th className="py-2 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((row, i) => (
                      <tr key={`${row.sku}-${i}`} className="border-t border-[var(--line)]">
                        <td className="py-2 text-[var(--muted)] tabular-nums">{i + 1}</td>
                        <td className="py-2 text-[var(--ink)] font-mono">{row.sku}</td>
                        <td className="py-2 text-[var(--ink-2)] truncate max-w-[260px]">
                          {row.product_name ?? '—'}
                        </td>
                        <td className="py-2">
                          <ChannelChip channel={row.channel} />
                        </td>
                        <td className="py-2 text-right tabular-nums">{formatNum(row.units_sold)}</td>
                        <td className="py-2 text-right tabular-nums font-medium text-[var(--ink)]">
                          {formatINR(row.revenue)}
                        </td>
                        <td className="py-2 text-right tabular-nums">{formatNum(row.orders)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Row 5 — Returns */}
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
        </>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

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
