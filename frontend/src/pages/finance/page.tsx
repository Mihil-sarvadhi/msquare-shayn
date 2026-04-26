import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchFinanceOverview } from '@store/slices/financeSlice';
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

  const kpis = finance.kpis;
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

          {/* Row 1: 6 KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Gross Revenue"
              value={formatINR(kpis?.gross_revenue)}
              sub={`${formatNum(kpis?.order_count)} orders`}
              loading={finance.loading}
            />
            <KpiCard
              label="Discounts"
              value={formatINR(kpis?.total_discounts)}
              loading={finance.loading}
            />
            <KpiCard label="Tax" value={formatINR(kpis?.total_tax)} loading={finance.loading} />
            <KpiCard
              label="Shipping"
              value={formatINR(kpis?.total_shipping)}
              loading={finance.loading}
            />
            <KpiCard
              label="Refunds"
              value={formatINR(kpis?.total_refunds)}
              sub={`${formatNum(kpis?.refund_count)} refunds`}
              loading={finance.loading}
            />
            <div className="bg-gradient-to-br from-[var(--pos-soft)] to-white rounded-xl border-2 border-[var(--pos)] px-5 py-4 flex flex-col justify-center">
              <span className="text-xs text-[var(--pos)] uppercase tracking-wide font-semibold">
                Net Revenue
              </span>
              <p className="text-2xl font-bold text-[var(--pos)] leading-tight mt-1">
                {formatINR(kpis?.net_revenue)}
              </p>
            </div>
          </div>

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
