import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  fetchFinanceOverview,
  fetchSalesBreakdownOnly,
  setSalesBreakdownMode,
} from '@store/slices/financeSlice';
import { fetchPayouts, fetchPayoutDetail, closeDetail, setPage } from '@store/slices/payoutsSlice';
import { fetchRefunds, setRefundsPage } from '@store/slices/refundsSlice';
import { KpiCard } from '@components/shared/KpiCard';
import { Panel } from '@components/shared/Panel';
import { PageLoader } from '@components/shared/PageLoader';
import { formatINR, formatNum, formatDate } from '@utils/formatters';
import { rangeLabel } from '@utils/common-functions/buildRangeParams';
import {
  Bar,
  BarChart,
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
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PayoutSummaryApi } from '@app/types/finance-api';

const PALETTE = {
  gross: '#8b6f3a',
  discounts: '#c4871f',
  refunds: '#b8433a',
  tax: '#a39f92',
  net: '#2d7a5f',
  cod: '#c4871f',
  prepaid: '#2d7a5f',
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

/* ─────────────────── Revenue Breakdown Chart ─────────────────── */
function RevenueBreakdownChart() {
  const breakdown = useAppSelector((s) => s.finance.breakdown);
  if (breakdown.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-[var(--text-muted)]">
        No revenue data for this range.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={breakdown}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="date" tickFormatter={fmtAxisDate} fontSize={11} />
        <YAxis tickFormatter={fmtAxisINR} fontSize={11} />
        <Tooltip
          formatter={(v: number) => formatINR(v)}
          labelFormatter={(l: string) => formatDate(l)}
        />
        <Bar dataKey="gross" stackId="a" fill={PALETTE.gross} name="Gross" />
        <Bar dataKey="discounts" stackId="b" fill={PALETTE.discounts} name="Discounts" />
        <Bar dataKey="refunds" stackId="b" fill={PALETTE.refunds} name="Refunds" />
        <Bar dataKey="tax" stackId="b" fill={PALETTE.tax} name="Tax" />
        <Bar dataKey="net" fill={PALETTE.net} name="Net" />
      </BarChart>
    </ResponsiveContainer>
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

/* ─────────────────── Payout Detail Modal ─────────────────── */
function PayoutDetailModal() {
  const dispatch = useAppDispatch();
  const { detail, loadingDetail } = useAppSelector((s) => s.payouts);
  if (!detail && !loadingDetail) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={() => dispatch(closeDetail())}
    >
      <div
        className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-semibold">Payout Detail</h3>
          <button
            type="button"
            onClick={() => dispatch(closeDetail())}
            className="text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {loadingDetail || !detail ? (
          <div className="p-8">
            <PageLoader label="Loading payout..." />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                label="Net Amount"
                value={formatINR(detail.payout.amount)}
                sub={detail.payout.payout_date ?? '-'}
              />
              <KpiCard label="Charges" value={formatINR(detail.payout.charges_gross ?? 0)} />
              <KpiCard label="Refunds" value={formatINR(detail.payout.refunds_gross ?? 0)} />
              <KpiCard label="Fees" value={formatINR(detail.payout.fees_total ?? 0)} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-subtle)] mb-2 font-semibold">
                Balance Transactions ({detail.balance_transactions.length})
              </p>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg)]">
                    <tr>
                      <th className="text-left p-2 text-xs font-semibold">Type</th>
                      <th className="text-right p-2 text-xs font-semibold">Amount</th>
                      <th className="text-right p-2 text-xs font-semibold">Fee</th>
                      <th className="text-right p-2 text-xs font-semibold">Net</th>
                      <th className="text-left p-2 text-xs font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.balance_transactions.map((bt) => (
                      <tr key={bt.id} className="border-t border-[var(--border)]">
                        <td className="p-2">{bt.type}</td>
                        <td className="p-2 text-right tabular-nums">{formatINR(bt.amount)}</td>
                        <td className="p-2 text-right tabular-nums">{formatINR(bt.fee ?? 0)}</td>
                        <td className="p-2 text-right tabular-nums font-semibold">
                          {formatINR(bt.net ?? 0)}
                        </td>
                        <td className="p-2 text-xs text-[var(--text-muted)]">
                          {bt.processed_at ? formatDate(bt.processed_at) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Payouts Table ─────────────────── */
function PayoutsTable() {
  const dispatch = useAppDispatch();
  const { rows, pagination, loading, page, limit } = useAppSelector((s) => s.payouts);
  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 1;
  return (
    <div className="space-y-3">
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)]">
            <tr>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">Date</th>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">Net Amount</th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">Charges</th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">Fees</th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">Refunds</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">
                  No payouts in this range.
                </td>
              </tr>
            ) : (
              rows.map((row: PayoutSummaryApi) => (
                <tr
                  key={row.id}
                  onClick={() => dispatch(fetchPayoutDetail(row.id))}
                  className="border-t border-[var(--border)] hover:bg-[var(--bg)] cursor-pointer transition-colors"
                >
                  <td className="p-2.5 font-medium">{row.payout_date ?? '-'}</td>
                  <td className="p-2.5">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        row.status === 'paid'
                          ? 'bg-[var(--pos-soft)] text-[var(--pos)]'
                          : row.status === 'failed' || row.status === 'cancelled'
                            ? 'bg-[var(--neg-soft)] text-[var(--neg)]'
                            : 'bg-[var(--bg)] text-[var(--text-muted)]',
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-right tabular-nums font-semibold">
                    {formatINR(row.amount)}
                  </td>
                  <td className="p-2.5 text-right tabular-nums">
                    {formatINR(row.charges_gross ?? 0)}
                  </td>
                  <td className="p-2.5 text-right tabular-nums">
                    {formatINR(row.fees_total ?? 0)}
                  </td>
                  <td className="p-2.5 text-right tabular-nums">
                    {formatINR(row.refunds_gross ?? 0)}
                  </td>
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
              onClick={() => dispatch(setPage(Math.max(1, page - 1)))}
              disabled={page === 1}
              className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-50 hover:bg-[var(--bg)]"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => dispatch(setPage(Math.min(totalPages, page + 1)))}
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

/* ─────────────────── Sales Breakdown (Shopify-spec) ─────────────────── */
function SalesBreakdownPanel() {
  const dispatch = useAppDispatch();
  const range = useAppSelector((s) => s.range);
  const sb = useAppSelector((s) => s.finance.salesBreakdown);
  const mode = useAppSelector((s) => s.finance.salesBreakdownMode);
  const loadingSB = useAppSelector((s) => s.finance.loadingSalesBreakdown);

  const handleToggle = (): void => {
    const next = mode === 'shopify_native' ? 'computed' : 'shopify_native';
    dispatch(setSalesBreakdownMode(next));
    dispatch(fetchSalesBreakdownOnly({ range, mode: next }));
  };

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
    return `${sign === -1 && n > 0 ? '−' : ''}${formatINR(v)}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] gap-3">
        <span>
          <strong className="text-[var(--text)]">Current:</strong> {sb.current.from} → {sb.current.to}
          {' · '}
          <strong className="text-[var(--text)]">Previous:</strong> {sb.previous.from} → {sb.previous.to}
        </span>
        <button
          type="button"
          onClick={handleToggle}
          disabled={loadingSB}
          title="Toggle between locally-computed numbers and Shopify Analytics' exact numbers"
          className={cn(
            'flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50',
            mode === 'shopify_native'
              ? 'bg-[var(--pos-soft)] text-[var(--pos)] border-[var(--pos)]'
              : 'bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]',
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              mode === 'shopify_native' ? 'bg-[var(--pos)]' : 'bg-[var(--text-subtle)]',
            )}
          />
          {loadingSB
            ? 'Refreshing...'
            : mode === 'shopify_native'
              ? 'Verified'
              : 'Verify with Shopify'}
        </button>
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
  const payouts = useAppSelector((s) => s.payouts);
  const refunds = useAppSelector((s) => s.refunds);

  // Local filter state for tables
  const [payoutsStatus] = useState<string>('');

  useEffect(() => {
    dispatch(fetchFinanceOverview(range));
  }, [dispatch, range]);

  useEffect(() => {
    dispatch(
      fetchPayouts({
        range,
        page: payouts.page,
        limit: payouts.limit,
        status: payoutsStatus,
      }),
    );
  }, [dispatch, range, payouts.page, payouts.limit, payoutsStatus]);

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
        <div className="bg-white rounded-xl border border-[var(--neg-soft)] p-8 text-center max-w-md">
          <p className="text-[var(--neg)] font-semibold mb-2">Connection Error</p>
          <p className="text-[var(--text-muted)] text-sm">{finance.error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showPageLoader && <PageLoader overlay />}
      <PayoutDetailModal />
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text)]">Finance</h1>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                {rangeLabel(range)} · True net revenue, payouts, refunds
              </p>
            </div>
          </div>

          {/* Total Sales Breakdown — 8 KPI tiles (Shopify-spec, with vs-prev deltas) */}
          {finance.salesBreakdown && (
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] px-5 py-4">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">Total Sales Breakdown</h3>
                  <p className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                    {finance.salesBreakdownMode === 'shopify_native'
                      ? 'Verified by Shopify Analytics · '
                      : 'Computed from synced orders · '}
                    vs prior {finance.salesBreakdown.previous.from} → {finance.salesBreakdown.previous.to}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next =
                      finance.salesBreakdownMode === 'shopify_native' ? 'computed' : 'shopify_native';
                    dispatch(setSalesBreakdownMode(next));
                    dispatch(fetchSalesBreakdownOnly({ range, mode: next }));
                  }}
                  disabled={finance.loadingSalesBreakdown}
                  title="Toggle between locally-computed numbers and Shopify Analytics' exact numbers"
                  className={cn(
                    'flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50',
                    finance.salesBreakdownMode === 'shopify_native'
                      ? 'bg-[var(--pos-soft)] text-[var(--pos)] border-[var(--pos)]'
                      : 'bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]',
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      finance.salesBreakdownMode === 'shopify_native'
                        ? 'bg-[var(--pos)]'
                        : 'bg-[var(--text-subtle)]',
                    )}
                  />
                  {finance.salesBreakdownMode === 'shopify_native' ? 'Verified' : 'Verify with Shopify'}
                </button>
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
                        {formatINR(Math.abs(cur))}
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
                title="Revenue Breakdown"
                subtitle="Daily gross / discounts / refunds / tax / net"
              >
                <RevenueBreakdownChart />
              </Panel>
            </div>
            <Panel title="Payment Methods" subtitle="COD vs Prepaid + gateway split">
              <PaymentMethodDonut />
            </Panel>
          </div>

          {/* Row 3: Payouts table */}
          <Panel
            title="Payouts"
            subtitle="Shopify Payments deposits to bank · click row for breakdown"
          >
            <PayoutsTable />
          </Panel>

          {/* Row 4: Refund rate chart + Refunds table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Refund Rate Trend" subtitle="Daily refund count / order count">
              <RefundRateChart />
            </Panel>
            <Panel title="Refund Breakdowns" subtitle="Top reasons + top SKUs">
              <RefundsBreakdown />
            </Panel>
          </div>

          {/* Row 5: Refunds detail table */}
          <Panel title="Refunds" subtitle="Per-refund detail">
            <RefundsTable />
          </Panel>
        </main>
      </div>
    </>
  );
}
