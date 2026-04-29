import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchRiskOverview } from '@store/slices/riskSlice';
import { KpiCard } from '@components/shared/KpiCard';
import { Panel } from '@components/shared/Panel';
import { PageLoader } from '@components/shared/PageLoader';
import { formatINR, formatNum, formatDate } from '@utils/formatters';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

function timeUntil(iso: string | null): string {
  if (!iso) return '-';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'Overdue';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `${hours}h`;
  return '<1h';
}

export function RiskPage() {
  const dispatch = useAppDispatch();
  const risk = useAppSelector((s) => s.risk);

  useEffect(() => {
    dispatch(fetchRiskOverview());
  }, [dispatch]);

  if (risk.error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--red-soft)] p-8 text-center max-w-md">
          <p className="text-[var(--red)] font-semibold mb-2">Connection Error</p>
          <p className="text-[var(--muted)] text-sm">{risk.error}</p>
        </div>
      </div>
    );
  }

  const showPageLoader = risk.loading && !risk.kpis;
  const k = risk.kpis;

  return (
    <>
      {showPageLoader && <PageLoader overlay />}
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">
          <div>
            <h1 className="text-[18px] font-semibold tracking-tightish text-[var(--ink)] leading-[1.25]">Risk · Disputes</h1>
            <p className="text-[11.5px] text-[var(--muted)] mt-0.5">
              Chargebacks, evidence deadlines, win/loss tracking
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Open Disputes"
              labelTooltip="Status: needs_response or under_review"
              value={formatNum(k?.open_disputes)}
              loading={risk.loading}
            />
            <KpiCard
              label="Amount at Risk"
              labelTooltip="Sum of open dispute amounts"
              value={formatINR(k?.amount_at_risk)}
              loading={risk.loading}
            />
            <KpiCard
              label="Win Rate (90d)"
              value={
                k?.win_rate_90d === null || k?.win_rate_90d === undefined
                  ? 'N/A'
                  : `${k.win_rate_90d.toFixed(1)}%`
              }
              loading={risk.loading}
            />
            <KpiCard
              label="Total Disputes"
              value={formatNum(k?.total_disputes)}
              loading={risk.loading}
            />
          </div>

          <Panel
            title="Active Disputes"
            subtitle="Sorted by evidence deadline · take action ASAP"
          >
            {risk.activeDisputes.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] p-4 text-center">
                🎉 No open disputes.
              </p>
            ) : (
              <div className="border border-[var(--border)] rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg)]">
                    <tr>
                      <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                        Order
                      </th>
                      <th className="text-right p-2 text-xs font-semibold uppercase tracking-wide">
                        Amount
                      </th>
                      <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                        Reason
                      </th>
                      <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                        Evidence Due
                      </th>
                      <th className="text-center p-2 text-xs font-semibold uppercase tracking-wide">
                        Time Left
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {risk.activeDisputes.map((d) => {
                      const left = timeUntil(d.evidence_due_by);
                      const overdue = left === 'Overdue';
                      return (
                        <tr
                          key={d.id}
                          className="border-t border-[var(--border)] hover:bg-[var(--bg)]"
                        >
                          <td className="p-2 text-xs text-[var(--text-muted)] font-mono truncate max-w-[140px]">
                            {d.order_id?.replace('gid://shopify/Order/', '#') ?? '-'}
                          </td>
                          <td className="p-2 text-right tabular-nums font-semibold text-[var(--neg)]">
                            {formatINR(d.amount)}
                          </td>
                          <td className="p-2 text-xs text-[var(--text-muted)]">
                            {d.reason ?? '-'}
                          </td>
                          <td className="p-2 text-xs">
                            <span className="bg-[var(--amber-soft)] text-[var(--amber)] px-2 py-0.5 rounded-full font-medium">
                              {d.status}
                            </span>
                          </td>
                          <td className="p-2 text-xs text-[var(--text-muted)]">
                            {d.evidence_due_by ? formatDate(d.evidence_due_by) : '-'}
                          </td>
                          <td
                            className={cn(
                              'p-2 text-center text-sm font-bold tabular-nums',
                              overdue
                                ? 'text-[var(--red)]'
                                : left.endsWith('h') || left === '<1h'
                                  ? 'text-[var(--amber)]'
                                  : 'text-[var(--ink)]',
                            )}
                          >
                            {left}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="All Disputes" subtitle="Complete history including resolved">
            {risk.allDisputes.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] p-4 text-center">No disputes.</p>
            ) : (
              <div className="border border-[var(--border)] rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg)]">
                    <tr>
                      <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                        Order
                      </th>
                      <th className="text-right p-2 text-xs font-semibold uppercase tracking-wide">
                        Amount
                      </th>
                      <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                        Reason
                      </th>
                      <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                        Finalized
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {risk.allDisputes.map((d) => (
                      <tr
                        key={d.id}
                        className="border-t border-[var(--border)] hover:bg-[var(--bg)]"
                      >
                        <td className="p-2 text-xs text-[var(--text-muted)] font-mono truncate max-w-[140px]">
                          {d.order_id?.replace('gid://shopify/Order/', '#') ?? '-'}
                        </td>
                        <td className="p-2 text-right tabular-nums">{formatINR(d.amount)}</td>
                        <td className="p-2 text-xs text-[var(--text-muted)]">
                          {d.reason ?? '-'}
                        </td>
                        <td className="p-2 text-xs">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full font-medium',
                              d.status === 'won'
                                ? 'bg-[var(--pos-soft)] text-[var(--pos)]'
                                : d.status === 'lost'
                                  ? 'bg-[var(--neg-soft)] text-[var(--neg)]'
                                  : 'bg-[var(--bg)] text-[var(--text-muted)]',
                            )}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="p-2 text-xs text-[var(--text-muted)]">
                          {d.finalized_on ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <p className="text-xs text-[var(--text-subtle)] text-center">
            Open detailed dispute in Shopify admin
            <ExternalLink size={10} className="inline ml-1" />
          </p>
        </main>
      </div>
    </>
  );
}
