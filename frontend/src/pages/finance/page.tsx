import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchFinanceOverview } from '@store/slices/financeSlice';
import { fetchRefunds, setRefundsPage } from '@store/slices/refundsSlice';
import { Panel } from '@components/shared/Panel';
import { PageLoader } from '@components/shared/PageLoader';
import { formatINR, formatINRFull, formatNum, formatDate } from '@utils/formatters';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';

import { ACCENT, WARN, NEG, MUTED, POS, TEAL, INFO, AI } from '@utils/constants/palette';

const PALETTE = {
  gross:     ACCENT,
  discounts: WARN,
  refunds:   NEG,
  tax:       MUTED,
  net:       POS,
  cod:       WARN,
  prepaid:   POS,
};

function fmtAxisINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

function fmtAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' })}`;
}

function fmtRangeLabel(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  const fStr = `${f.toLocaleString('en-IN', { month: 'short' })} ${f.getDate()}`;
  const tStr = `${t.toLocaleString('en-IN', { month: 'short' })} ${t.getDate()}`;
  const year = t.getFullYear();
  return `${fStr} – ${tStr}, ${year}`;
}

/* ─────────────────── Total Sales Over Time Chart ─────────────────── */
interface BreakdownChartRow {
  date: string;
  gross: number;
  discounts: number;
  refunds: number;
  tax: number;
  total: number;
  prevDate: string | null;
  prevTotal: number | null;
}

function RevenueBreakdownTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: BreakdownChartRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const breakdownLines: Array<{ label: string; value: number; color: string }> = [
    { label: 'Gross',     value: row.gross,     color: PALETTE.gross },
    { label: 'Discounts', value: row.discounts, color: PALETTE.discounts },
    { label: 'Refunds',   value: row.refunds,   color: PALETTE.refunds },
    { label: 'Tax',       value: row.tax,       color: PALETTE.tax },
  ];
  return (
    <div className="bg-[var(--surface)] border border-[var(--line-2)] rounded-lg shadow-md p-2.5 text-xs space-y-1.5 min-w-[180px]">
      <div className="font-semibold text-[var(--ink)] text-[12px]">{formatDate(row.date)}</div>
      <div className="space-y-1">
        {breakdownLines.map((l) => (
          <div key={l.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
            <span className="tabular-nums text-[var(--ink)]">{formatINR(l.value)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 pt-0.5 border-t border-[var(--line)] mt-1">
          <span className="flex items-center gap-1.5 text-[var(--ink-2)] font-medium">
            <span
              className="inline-block w-2 h-2 rounded-sm"
              style={{ backgroundColor: TOTAL_LINE }}
            />
            Total sales
          </span>
          <span className="tabular-nums text-[var(--ink)] font-semibold">{formatINR(row.total)}</span>
        </div>
      </div>
      {row.prevDate && row.prevTotal !== null && (
        <div className="border-t border-[var(--line)] pt-1.5 space-y-0.5">
          <div className="text-[10.5px] text-[var(--muted-2)] uppercase tracking-widish">
            vs {formatDate(row.prevDate)}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <span
                className="inline-block w-3 h-0 border-t border-dashed"
                style={{ borderColor: TOTAL_LINE_PREV }}
              />
              Total
            </span>
            <span className="tabular-nums text-[var(--ink)]">{formatINR(row.prevTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const TOTAL_LINE      = '#1F8FE0'; // Shopify-blue solid current line
const TOTAL_LINE_PREV = '#A8D5F2'; // light blue dashed comparison line
const TOTAL_AREA_GRAD = 'revenueBreakdownTotalGrad';

function RevenueBreakdownChart() {
  const breakdown = useAppSelector((s) => s.finance.breakdown);
  if (!breakdown || breakdown.current.points.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-[var(--text-muted)]">
        No revenue data for this range.
      </div>
    );
  }
  // Align comparison series by index — day 1 of current ↔ day 1 of previous,
  // matching Shopify's "Total sales over time" overlay behaviour.
  const chartData: BreakdownChartRow[] = breakdown.current.points.map((curr, i) => {
    const prev = breakdown.previous.points[i];
    return {
      date: curr.date,
      gross: curr.gross,
      discounts: curr.discounts,
      refunds: curr.refunds,
      tax: curr.tax,
      total: curr.total,
      prevDate: prev?.date ?? null,
      prevTotal: prev?.total ?? null,
    };
  });

  const totalSales = chartData.reduce((s, r) => s + r.total, 0);
  const prevTotalSales = breakdown.previous.points.reduce((s, r) => s + r.total, 0);
  const totalDelta = prevTotalSales === 0
    ? (totalSales === 0 ? 0 : null)
    : ((totalSales - prevTotalSales) / Math.abs(prevTotalSales)) * 100;

  return (
    <div className="space-y-2">
      {/* Header — matches Shopify "Total sales over time" big number + delta.
          The total below equals the Sales Breakdown's Total sales row exactly:
          per-day total uses the period's effective tax rate (computed in
          backend) so the daily series sums to totals.total_sales. */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[10.5px] uppercase tracking-widish text-[var(--muted)]">
          Total sales
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-semibold tabular-nums text-[var(--ink)]">
            {formatINRFull(totalSales)}
          </span>
          {totalDelta !== null && (
            <span
              className={cn(
                'text-[12px] tabular-nums',
                totalDelta >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]',
              )}
            >
              {totalDelta >= 0 ? '↑' : '↓'} {Math.abs(totalDelta).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={TOTAL_AREA_GRAD} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TOTAL_LINE} stopOpacity={0.18} />
              <stop offset="100%" stopColor={TOTAL_LINE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeDasharray="2 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtAxisDate}
            fontSize={11}
            tick={{ fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
          />
          <YAxis
            tickFormatter={fmtAxisINR}
            fontSize={11}
            tick={{ fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            content={<RevenueBreakdownTooltip />}
            cursor={{ stroke: 'var(--line-2)', strokeWidth: 1 }}
          />
          {/* Comparison line first so the current line sits on top */}
          <Line
            type="monotone"
            dataKey="prevTotal"
            stroke={TOTAL_LINE_PREV}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 3, fill: TOTAL_LINE_PREV, stroke: 'var(--surface)', strokeWidth: 1 }}
            name="Total (prev)"
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke={TOTAL_LINE}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: TOTAL_LINE, stroke: 'var(--surface)', strokeWidth: 2 }}
            name="Total"
            isAnimationActive={false}
            fill={`url(#${TOTAL_AREA_GRAD})`}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap items-center justify-center gap-5 text-[11px] text-[var(--muted)] pt-1">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: TOTAL_LINE }}
          />
          {fmtRangeLabel(breakdown.current.from, breakdown.current.to)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: TOTAL_LINE_PREV }}
          />
          {fmtRangeLabel(breakdown.previous.from, breakdown.previous.to)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────── Total Sales by Channel Donut ─────────────────── */
const CHANNEL_PALETTE = [TEAL, AI, ACCENT, INFO, POS, WARN, NEG, MUTED];

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function SalesByChannelDonut() {
  const data = useAppSelector((s) => s.finance.salesByChannel);
  if (!data || data.current.channels.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-[var(--text-muted)]">
        No channel data for this range.
      </div>
    );
  }

  const prevByName = new Map(data.previous.channels.map((c) => [c.name, c.amount]));
  // Filter zero-amount channels out of the donut so it doesn't render slivers,
  // but still list them in the legend so users see they exist.
  const pieData = data.current.channels
    .filter((c) => c.amount > 0)
    .map((c, i) => ({
      name: c.name,
      value: c.amount,
      color: CHANNEL_PALETTE[i % CHANNEL_PALETTE.length],
    }));

  const totalDelta = pctDelta(data.current.total, data.previous.total);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 items-center">
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={80}
              paddingAngle={1}
              dataKey="value"
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [formatINR(v), name]}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid var(--line-2)',
                backgroundColor: 'var(--surface)',
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[18px] font-semibold tabular-nums text-[var(--ink)]">
            {formatINR(data.current.total)}
          </span>
          {totalDelta !== null && (
            <span
              className={cn(
                'text-[10.5px] mt-0.5 tabular-nums',
                totalDelta >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]',
              )}
            >
              {totalDelta >= 0 ? '↑' : '↓'} {Math.abs(totalDelta).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5 min-w-0">
        {data.current.channels.map((c, i) => {
          const prev = prevByName.get(c.name) ?? 0;
          const d = pctDelta(c.amount, prev);
          const swatchColor = c.amount > 0
            ? CHANNEL_PALETTE[pieData.findIndex((p) => p.name === c.name) % CHANNEL_PALETTE.length]
            : 'var(--line-2)';
          return (
            <div key={`${c.name}-${i}`} className="grid grid-cols-[10px_1fr_auto_auto] gap-2 items-center text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: swatchColor }}
              />
              <span className="text-[var(--ink-2)] truncate" title={c.name}>{c.name}</span>
              <span className="font-mono tabular-nums text-[var(--ink)]">{formatINR(c.amount)}</span>
              <span
                className={cn(
                  'text-[10.5px] tabular-nums w-12 text-right shrink-0',
                  d === null
                    ? 'text-[var(--muted-2)]'
                    : d >= 0
                      ? 'text-[var(--pos)]'
                      : 'text-[var(--neg)]',
                )}
              >
                {d === null ? '—' : `${d >= 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(0)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────── Average Order Value Chart ─────────────────── */
interface AovChartRow {
  date: string;
  aov: number | null;
  prevDate: string | null;
  prevAov: number | null;
}

function AovTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: AovChartRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-[var(--surface)] border border-[var(--line-2)] rounded-lg shadow-md p-2.5 text-xs space-y-1.5 min-w-[160px]">
      <div className="font-semibold text-[var(--ink)] text-[12px]">{formatDate(row.date)}</div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[var(--muted)]">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: TOTAL_LINE }} />
          AOV
        </span>
        <span className="tabular-nums text-[var(--ink)]">
          {row.aov !== null ? formatINR(row.aov) : '—'}
        </span>
      </div>
      {row.prevDate && row.prevAov !== null && (
        <div className="border-t border-[var(--line)] pt-1.5 space-y-0.5">
          <div className="text-[10.5px] text-[var(--muted-2)] uppercase tracking-widish">
            vs {formatDate(row.prevDate)}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <span
                className="inline-block w-3 h-0 border-t border-dashed"
                style={{ borderColor: TOTAL_LINE_PREV }}
              />
              AOV
            </span>
            <span className="tabular-nums text-[var(--ink)]">{formatINR(row.prevAov)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AvgOrderValueChart() {
  const breakdown = useAppSelector((s) => s.finance.breakdown);
  if (!breakdown || breakdown.current.points.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-[var(--text-muted)]">
        No data for this range.
      </div>
    );
  }

  // Shopify computes AOV as (gross_sales − discounts) / orders — the order's
  // value at placement (subtotal after discounts, before returns/tax). Using
  // total_sales here would subtract returns and produce a different number than
  // Shopify's "Average order value" report.
  const chartData: AovChartRow[] = breakdown.current.points.map((curr, i) => {
    const prev = breakdown.previous.points[i];
    return {
      date: curr.date,
      aov: curr.orders > 0 ? (curr.gross - curr.discounts) / curr.orders : null,
      prevDate: prev?.date ?? null,
      prevAov: prev && prev.orders > 0 ? (prev.gross - prev.discounts) / prev.orders : null,
    };
  });

  const periodGross = breakdown.current.points.reduce((s, p) => s + p.gross, 0);
  const periodDiscounts = breakdown.current.points.reduce((s, p) => s + p.discounts, 0);
  const totalOrders = breakdown.current.points.reduce((s, p) => s + p.orders, 0);
  const periodAov = totalOrders > 0 ? (periodGross - periodDiscounts) / totalOrders : 0;

  const prevGross = breakdown.previous.points.reduce((s, p) => s + p.gross, 0);
  const prevDiscounts = breakdown.previous.points.reduce((s, p) => s + p.discounts, 0);
  const prevTotalOrders = breakdown.previous.points.reduce((s, p) => s + p.orders, 0);
  const prevAov = prevTotalOrders > 0 ? (prevGross - prevDiscounts) / prevTotalOrders : 0;
  const aovDelta = prevAov === 0 ? null : ((periodAov - prevAov) / prevAov) * 100;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10.5px] uppercase tracking-widish text-[var(--muted)]">
          Average order value
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-semibold tabular-nums text-[var(--ink)]">
            {formatINRFull(periodAov)}
          </span>
          {aovDelta !== null && (
            <span
              className={cn(
                'text-[12px] tabular-nums',
                aovDelta >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]',
              )}
            >
              {aovDelta >= 0 ? '↑' : '↓'} {Math.abs(aovDelta).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="2 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtAxisDate}
            fontSize={11}
            tick={{ fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
          />
          <YAxis
            tickFormatter={fmtAxisINR}
            fontSize={11}
            tick={{ fill: 'var(--muted)' }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            content={<AovTooltip />}
            cursor={{ stroke: 'var(--line-2)', strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="prevAov"
            stroke={TOTAL_LINE_PREV}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 3, fill: TOTAL_LINE_PREV, stroke: 'var(--surface)', strokeWidth: 1 }}
            name="AOV (prev)"
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="aov"
            stroke={TOTAL_LINE}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: TOTAL_LINE, stroke: 'var(--surface)', strokeWidth: 2 }}
            name="AOV"
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap items-center justify-center gap-4 text-[10.5px] text-[var(--muted)] pt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: TOTAL_LINE }} />
          {fmtRangeLabel(breakdown.current.from, breakdown.current.to)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: TOTAL_LINE_PREV }} />
          {fmtRangeLabel(breakdown.previous.from, breakdown.previous.to)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────── Total Sales by Product ─────────────────── */
function SalesByProductBars() {
  const data = useAppSelector((s) => s.finance.salesByProduct);
  if (!data || data.current.products.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-[var(--text-muted)]">
        No product data for this range.
      </div>
    );
  }

  const prevByProduct = new Map(
    data.previous.products.map((p) => [p.product_id, p.amount]),
  );
  const maxAmount = Math.max(
    ...data.current.products.map((p) => p.amount),
    ...Array.from(prevByProduct.values()),
    1,
  );

  return (
    <div className="space-y-3">
      {data.current.products.map((p) => {
        const prev = prevByProduct.get(p.product_id) ?? 0;
        const d = pctDelta(p.amount, prev);
        const widthPct = (p.amount / maxAmount) * 100;
        const prevWidthPct = (prev / maxAmount) * 100;
        const subtitle = [p.vendor, p.product_type].filter(Boolean).join(' · ');
        return (
          <div key={p.product_id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-[var(--ink-2)] truncate min-w-0" title={p.title}>
                {p.title}
                {subtitle && (
                  <span className="text-[var(--muted-2)]"> · {subtitle}</span>
                )}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs tabular-nums text-[var(--ink)]">
                  {formatINR(p.amount)}
                </span>
                <span
                  className={cn(
                    'text-[10.5px] tabular-nums w-12 text-right',
                    d === null
                      ? 'text-[var(--muted-2)]'
                      : d >= 0
                        ? 'text-[var(--pos)]'
                        : 'text-[var(--neg)]',
                  )}
                >
                  {d === null ? '—' : `${d >= 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(0)}%`}
                </span>
              </span>
            </div>
            <div className="h-1.5 bg-[var(--bg-2)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${widthPct}%`, backgroundColor: TOTAL_LINE }}
              />
            </div>
            <div className="h-1 bg-[var(--bg-2)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${prevWidthPct}%`, backgroundColor: TOTAL_LINE_PREV }}
              />
            </div>
            <div className="flex justify-end text-[10px] text-[var(--muted-2)] tabular-nums">
              prev {formatINR(prev)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────── Payment Method Donut ─────────────────── */
function PaymentMethodDonut() {
  const split = useAppSelector((s) => s.finance.paymentSplit);
  if (!split) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-[var(--text-muted)]">
        No payment data.
      </div>
    );
  }
  const pieData = [
    { name: 'COD', value: split.cod.amount, color: PALETTE.cod },
    { name: 'Prepaid', value: split.prepaid.amount, color: PALETTE.prepaid },
  ];
  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value">
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => formatINR(v)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: PALETTE.cod }}
          />
          <span className="text-[var(--text-muted)]">COD</span>
          <span className="ml-auto font-semibold">{formatNum(split.cod.count)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: PALETTE.prepaid }}
          />
          <span className="text-[var(--text-muted)]">Prepaid</span>
          <span className="ml-auto font-semibold">{formatNum(split.prepaid.count)}</span>
        </div>
      </div>
      {split.breakdown_by_gateway.length > 0 && (
        <div className="border-t border-[var(--border)] pt-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-subtle)] mb-1.5 font-semibold">
            By Gateway
          </p>
          <div className="space-y-1">
            {split.breakdown_by_gateway.slice(0, 5).map((g) => (
              <div key={g.gateway} className="flex justify-between text-xs">
                <span className="text-[var(--text)] truncate">{g.gateway}</span>
                <span className="text-[var(--text-muted)] tabular-nums">
                  {formatINR(g.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Refund Rate Chart ─────────────────── */
function RefundRateChart() {
  const summary = useAppSelector((s) => s.finance.refundsSummary);
  if (!summary || summary.refund_rate_over_time.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-[var(--text-muted)]">
        No refund data.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={summary.refund_rate_over_time}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="date" tickFormatter={fmtAxisDate} fontSize={11} />
        <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} fontSize={11} />
        <Tooltip
          formatter={(v: number) => `${v.toFixed(2)}%`}
          labelFormatter={(l: string) => formatDate(l)}
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke={PALETTE.refunds}
          strokeWidth={2}
          dot={false}
          name="Refund Rate"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────── Refunds Table ─────────────────── */
function RefundsTable() {
  const dispatch = useAppDispatch();
  const { rows, pagination, loading, page, limit } = useAppSelector((s) => s.refunds);
  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 1;
  return (
    <div className="space-y-3">
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)]">
            <tr>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">
                Date
              </th>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">
                Order
              </th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">
                Amount
              </th>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">
                Reason
              </th>
              <th className="text-center p-2.5 text-xs font-semibold uppercase tracking-wide">
                Restocked
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[var(--text-muted)]">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[var(--text-muted)]">
                  No refunds in this range.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)] hover:bg-[var(--bg)]">
                  <td className="p-2.5 font-medium">{formatDate(row.refunded_at)}</td>
                  <td className="p-2.5 text-xs text-[var(--text-muted)] truncate max-w-[160px]">
                    {row.order_id.replace('gid://shopify/Order/', '#')}
                  </td>
                  <td className="p-2.5 text-right tabular-nums font-semibold text-[var(--neg)]">
                    {formatINR(row.refund_amount)}
                  </td>
                  <td className="p-2.5 text-xs text-[var(--text-muted)]">
                    {row.reason ?? 'Unspecified'}
                  </td>
                  <td className="p-2.5 text-center">{row.restocked ? '✓' : '–'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.total > limit && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">
            Page {page} of {totalPages} · {formatNum(pagination.total)} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dispatch(setRefundsPage(Math.max(1, page - 1)))}
              disabled={page === 1}
              className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-50 hover:bg-[var(--bg)]"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => dispatch(setRefundsPage(Math.min(totalPages, page + 1)))}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-50 hover:bg-[var(--bg)]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Top Refund Reasons / SKUs ─────────────────── */
function RefundsBreakdown() {
  const summary = useAppSelector((s) => s.finance.refundsSummary);
  if (!summary) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[var(--text-subtle)] mb-2 font-semibold">
          Top Refund Reasons
        </p>
        {summary.top_reasons.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No refunds recorded.</p>
        ) : (
          <div className="space-y-1.5">
            {summary.top_reasons.slice(0, 5).map((r) => (
              <div key={r.reason} className="flex justify-between text-sm">
                <span className="text-[var(--text)] truncate">{r.reason}</span>
                <span className="text-[var(--text-muted)] tabular-nums">
                  {formatINR(r.amount)} ({r.count})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[var(--text-subtle)] mb-2 font-semibold">
          Top Refunded SKUs
        </p>
        {summary.refunds_by_sku.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No SKU-level refund data.</p>
        ) : (
          <div className="space-y-1.5">
            {summary.refunds_by_sku.slice(0, 5).map((s) => (
              <div key={s.sku} className="flex justify-between text-sm">
                <span className="text-[var(--text)] truncate font-mono text-xs">{s.sku}</span>
                <span className="text-[var(--text-muted)] tabular-nums">
                  {formatINR(s.amount)} ({s.count})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Sales Breakdown (computed from synced data) ─────────────────── */
function SalesBreakdownPanel() {
  const sb = useAppSelector((s) => s.finance.salesBreakdown);

  if (!sb) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-[var(--text-muted)]">
        No sales data.
      </div>
    );
  }
  const cur = sb.current.totals;
  const prev = sb.previous.totals;
  const deltaPct = (a: number, b: number): string => {
    if (b === 0) return '—';
    const v = ((a - b) / Math.abs(b)) * 100;
    return `${v >= 0 ? '↑' : '↓'} ${Math.abs(v).toFixed(1)}%`;
  };
  const deltaClass = (a: number, b: number, neg = false): string => {
    if (b === 0) return 'text-[var(--text-subtle)]';
    const v = a - b;
    const positive = neg ? v <= 0 : v >= 0;
    return positive ? 'text-[var(--pos)]' : 'text-[var(--neg)]';
  };

  // Prepare daily rows aligned with prior-period rows (by index for now since spec just shows
  // current daily; prior totals are summary-only).
  const daily = sb.current.daily;

  const COLS: { key: keyof typeof cur; label: string; sign: 1 | -1 }[] = [
    { key: 'gross_sales',      label: 'Gross sales',     sign: 1  },
    { key: 'discounts',        label: 'Discounts',       sign: -1 },
    { key: 'returns',          label: 'Returns',         sign: -1 },
    { key: 'net_sales',        label: 'Net sales',       sign: 1  },
    { key: 'shipping_charges', label: 'Shipping',        sign: 1  },
    { key: 'return_fees',      label: 'Return fees',     sign: -1 },
    { key: 'taxes',            label: 'Taxes',           sign: 1  },
    { key: 'total_sales',      label: 'Total sales',     sign: 1  },
  ];

  const fmt = (n: number, sign: 1 | -1) => {
    const v = Math.abs(n);
    return `${sign === -1 && n > 0 ? '−' : ''}${formatINRFull(v)}`;
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-[var(--text-muted)]">
        <strong className="text-[var(--text)]">Current:</strong> {sb.current.from} → {sb.current.to}
        {' · '}
        <strong className="text-[var(--text)]">Previous:</strong> {sb.previous.from} → {sb.previous.to}
      </div>

      {/* Summary row */}
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)]">
            <tr>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide w-32">Metric</th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">Current</th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">Previous</th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">% Change</th>
            </tr>
          </thead>
          <tbody>
            {COLS.map((c) => {
              const isTotal = c.key === 'total_sales' || c.key === 'net_sales';
              return (
                <tr
                  key={c.key}
                  className={cn('border-t border-[var(--border)]', isTotal && 'bg-[var(--bg)] font-semibold')}
                >
                  <td className="p-2.5">{c.label}</td>
                  <td className={cn('p-2.5 text-right tabular-nums', c.sign === -1 && cur[c.key] > 0 && 'text-[var(--neg)]')}>
                    {fmt(cur[c.key], c.sign)}
                  </td>
                  <td className={cn('p-2.5 text-right tabular-nums text-[var(--text-muted)]', c.sign === -1 && prev[c.key] > 0 && 'text-[var(--neg)]')}>
                    {fmt(prev[c.key], c.sign)}
                  </td>
                  <td className={cn('p-2.5 text-right tabular-nums text-xs', deltaClass(cur[c.key], prev[c.key], c.sign === -1))}>
                    {deltaPct(cur[c.key], prev[c.key])}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Daily rows */}
      <details className="border border-[var(--border)] rounded-lg overflow-hidden" open>
        <summary className="bg-[var(--bg)] p-2.5 text-xs font-semibold uppercase tracking-wide cursor-pointer">
          Daily breakdown ({daily.length} days)
        </summary>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg)] sticky top-0">
              <tr>
                <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">Date</th>
                {COLS.map((c) => (
                  <th key={c.key} className="text-right p-2 text-xs font-semibold uppercase tracking-wide">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daily.map((row) => (
                <tr key={row.date} className="border-t border-[var(--border)] hover:bg-[var(--bg)]">
                  <td className="p-2 font-medium whitespace-nowrap">{row.date}</td>
                  {COLS.map((c) => {
                    const v = (row as unknown as Record<string, number>)[c.key] ?? 0;
                    return (
                      <td
                        key={c.key}
                        className={cn(
                          'p-2 text-right tabular-nums',
                          c.sign === -1 && v > 0 && 'text-[var(--neg)]',
                          c.key === 'total_sales' && 'font-semibold',
                        )}
                      >
                        {fmt(v, c.sign)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {daily.length === 0 && (
                <tr>
                  <td colSpan={COLS.length + 1} className="p-6 text-center text-[var(--text-muted)]">
                    No sales in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/* ─────────────────── PAGE ─────────────────── */
export function FinancePage() {
  const dispatch = useAppDispatch();
  const range = useAppSelector((s) => s.range);
  const finance = useAppSelector((s) => s.finance);
  const refunds = useAppSelector((s) => s.refunds);

  useEffect(() => {
    dispatch(fetchFinanceOverview(range));
  }, [dispatch, range]);

  useEffect(() => {
    dispatch(
      fetchRefunds({
        range,
        page: refunds.page,
        limit: refunds.limit,
      }),
    );
  }, [dispatch, range, refunds.page, refunds.limit]);

  const showPageLoader = finance.loading && !finance.kpis;

  if (finance.error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--red-soft)] p-8 text-center max-w-md">
          <p className="text-[var(--red)] font-semibold mb-2">Connection Error</p>
          <p className="text-[var(--muted)] text-sm">{finance.error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showPageLoader && <PageLoader overlay />}
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">
          {/* Total Sales Breakdown — 8 KPI tiles (Shopify-spec, with vs-prev deltas) */}
          {finance.salesBreakdown && (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] px-5 py-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[var(--text)]">Total Sales Breakdown</h3>
                <p className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                  Computed from synced orders · vs prior {finance.salesBreakdown.previous.from} → {finance.salesBreakdown.previous.to}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                  { key: 'gross_sales', label: 'Gross sales', sign: 1 as const },
                  { key: 'discounts', label: 'Discounts', sign: -1 as const },
                  { key: 'returns', label: 'Returns', sign: -1 as const },
                  { key: 'net_sales', label: 'Net sales', sign: 1 as const },
                  { key: 'shipping_charges', label: 'Shipping', sign: 1 as const },
                  { key: 'return_fees', label: 'Return fees', sign: -1 as const },
                  { key: 'taxes', label: 'Taxes', sign: 1 as const },
                  { key: 'total_sales', label: 'Total sales', sign: 1 as const, highlight: true },
                ].map((row) => {
                  const cur =
                    (finance.salesBreakdown!.current.totals as unknown as Record<string, number>)[row.key] ?? 0;
                  const prev =
                    (finance.salesBreakdown!.previous.totals as unknown as Record<string, number>)[row.key] ?? 0;
                  const deltaPct = prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null;
                  return (
                    <div
                      key={row.key}
                      className={cn(
                        'rounded-lg border px-3 py-2',
                        row.highlight
                          ? 'border-[var(--pos)] bg-[var(--pos-soft)]'
                          : 'border-[var(--border)] bg-[var(--bg)]',
                      )}
                    >
                      <p
                        className={cn(
                          'text-[10px] uppercase tracking-wide font-semibold',
                          row.highlight ? 'text-[var(--pos)]' : 'text-[var(--text-subtle)]',
                        )}
                      >
                        {row.label}
                      </p>
                      <p
                        className={cn(
                          'text-base font-semibold tabular-nums mt-0.5',
                          row.sign === -1 ? 'text-[var(--neg)]' : 'text-[var(--text)]',
                        )}
                      >
                        {row.sign === -1 && cur > 0 ? '−' : ''}
                        {formatINRFull(Math.abs(cur))}
                      </p>
                      {deltaPct !== null && (
                        <p
                          className={cn(
                            'text-[10px] mt-0.5',
                            deltaPct >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]',
                          )}
                        >
                          {deltaPct >= 0 ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}% vs prev
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sales Breakdown — detailed table view */}
          <Panel
            title="Sales Breakdown"
            subtitle="Shopify analytics formula · current vs previous period"
          >
            <SalesBreakdownPanel />
          </Panel>

          {/* Row 2: Revenue breakdown chart + Payment-method donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Panel
                title="Total sales over time"
                subtitle="Daily total sales · breakdown in tooltip"
              >
                <RevenueBreakdownChart />
              </Panel>
            </div>
            <Panel title="Payment Methods" subtitle="COD vs Prepaid + gateway split">
              <PaymentMethodDonut />
            </Panel>
          </div>

          {/* Row 2.5: Channel donut + AOV trend + top products (3-col on lg) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              title="Total sales by sales channel"
              subtitle="Shopify total sales · current vs prev"
            >
              <SalesByChannelDonut />
            </Panel>
            <Panel
              title="Average order value over time"
              subtitle="Daily AOV · current vs prev"
            >
              <AvgOrderValueChart />
            </Panel>
            <Panel
              title="Total sales by product"
              subtitle="Top 5 by total sales · current vs prev"
            >
              <SalesByProductBars />
            </Panel>
          </div>

          {/* Row 3: Refund rate chart + Refunds table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Refund Rate Trend" subtitle="Daily refund count / order count">
              <RefundRateChart />
            </Panel>
            <Panel title="Refund Breakdowns" subtitle="Top reasons + top SKUs">
              <RefundsBreakdown />
            </Panel>
          </div>

          {/* Row 4: Refunds detail table */}
          <Panel title="Refunds" subtitle="Per-refund detail">
            <RefundsTable />
          </Panel>
        </main>
      </div>
    </>
  );
}
