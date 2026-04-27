import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchMarketingOverview } from '@store/slices/marketingSlice';
import { KpiCard } from '@components/shared/KpiCard';
import { Panel } from '@components/shared/Panel';
import { PageLoader } from '@components/shared/PageLoader';
import { formatINR, formatNum } from '@utils/formatters';
import { cn } from '@/lib/utils';

type Tab = 'campaigns' | 'codes' | 'gift-cards';

export function MarketingFinancePage() {
  const dispatch = useAppDispatch();
  const marketing = useAppSelector((s) => s.marketing);
  const [tab, setTab] = useState<Tab>('codes');

  useEffect(() => {
    dispatch(fetchMarketingOverview());
  }, [dispatch]);

  if (marketing.error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="bg-white rounded-xl border border-[var(--neg-soft)] p-8 text-center max-w-md">
          <p className="text-[var(--neg)] font-semibold mb-2">Connection Error</p>
          <p className="text-[var(--text-muted)] text-sm">{marketing.error}</p>
        </div>
      </div>
    );
  }

  const showPageLoader = marketing.loading && !marketing.kpis;
  const k = marketing.kpis;

  return (
    <>
      {showPageLoader && <PageLoader overlay />}
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">Marketing & Promotions</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Discount codes, price rules, gift card liability
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Active Discount Codes"
              value={formatNum(k?.active_discount_codes)}
              loading={marketing.loading}
            />
            <KpiCard
              label="Total Code Usage"
              value={formatNum(k?.total_discount_usage)}
              loading={marketing.loading}
            />
            <KpiCard
              label="Gift Card Liability"
              labelTooltip="Outstanding gift card balance — accounting liability"
              value={formatINR(k?.gift_card_liability)}
              loading={marketing.loading}
            />
            <KpiCard
              label="Gift Cards Outstanding"
              value={formatNum(k?.gift_cards_outstanding)}
              loading={marketing.loading}
            />
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
            <div className="flex border-b border-[var(--border)]">
              {(['campaigns', 'codes', 'gift-cards'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'px-5 py-3 text-sm font-medium capitalize transition-colors',
                    tab === t
                      ? 'border-b-2 border-[#8b6f3a] text-[var(--text)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                  )}
                >
                  {t.replace('-', ' ')}
                </button>
              ))}
            </div>

            <div className="p-4">
              {tab === 'campaigns' && (
                <Panel title="Price Rules" subtitle="Active and historical campaign rules">
                  {marketing.priceRules.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] p-4 text-center">
                      No price rules.
                    </p>
                  ) : (
                    <div className="border border-[var(--border)] rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--bg)]">
                          <tr>
                            <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                              Title
                            </th>
                            <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                              Type
                            </th>
                            <th className="text-right p-2 text-xs font-semibold uppercase tracking-wide">
                              Value
                            </th>
                            <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                              Starts
                            </th>
                            <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                              Ends
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {marketing.priceRules.map((r) => (
                            <tr key={r.id} className="border-t border-[var(--border)]">
                              <td className="p-2 font-medium">{r.title ?? '-'}</td>
                              <td className="p-2 text-xs text-[var(--text-muted)]">
                                {r.value_type ?? '-'}
                              </td>
                              <td className="p-2 text-right tabular-nums">
                                {r.value_type === 'percentage'
                                  ? `${(r.value ?? 0).toFixed(1)}%`
                                  : formatINR(r.value ?? 0)}
                              </td>
                              <td className="p-2 text-xs text-[var(--text-muted)]">
                                {r.starts_at?.slice(0, 10) ?? '-'}
                              </td>
                              <td className="p-2 text-xs text-[var(--text-muted)]">
                                {r.ends_at?.slice(0, 10) ?? 'open'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>
              )}

              {tab === 'codes' && (
                <Panel title="Discount Codes" subtitle="Codes by usage count">
                  {marketing.discountCodes.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] p-4 text-center">
                      No discount codes.
                    </p>
                  ) : (
                    <div className="border border-[var(--border)] rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--bg)]">
                          <tr>
                            <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                              Code
                            </th>
                            <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                              Rule
                            </th>
                            <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                              Type
                            </th>
                            <th className="text-right p-2 text-xs font-semibold uppercase tracking-wide">
                              Value
                            </th>
                            <th className="text-right p-2 text-xs font-semibold uppercase tracking-wide">
                              Usage
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {marketing.discountCodes.map((c) => (
                            <tr key={c.id} className="border-t border-[var(--border)]">
                              <td className="p-2 font-mono text-xs font-semibold">{c.code}</td>
                              <td className="p-2 text-[var(--text-muted)]">{c.rule_title ?? '-'}</td>
                              <td className="p-2 text-xs text-[var(--text-muted)]">
                                {c.value_type ?? '-'}
                              </td>
                              <td className="p-2 text-right tabular-nums">
                                {c.value_type === 'percentage'
                                  ? `${(c.value ?? 0).toFixed(1)}%`
                                  : formatINR(c.value ?? 0)}
                              </td>
                              <td className="p-2 text-right tabular-nums font-semibold">
                                {formatNum(c.usage_count)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>
              )}

              {tab === 'gift-cards' && (
                <Panel
                  title="Gift Cards"
                  subtitle={`Outstanding liability: ${formatINR(k?.gift_card_liability)}`}
                >
                  {marketing.giftCards.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] p-4 text-center">
                      No gift cards.
                    </p>
                  ) : (
                    <div className="border border-[var(--border)] rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--bg)]">
                          <tr>
                            <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                              Last 4
                            </th>
                            <th className="text-right p-2 text-xs font-semibold uppercase tracking-wide">
                              Initial
                            </th>
                            <th className="text-right p-2 text-xs font-semibold uppercase tracking-wide">
                              Balance
                            </th>
                            <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                              Expires
                            </th>
                            <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {marketing.giftCards.map((g) => (
                            <tr key={g.id} className="border-t border-[var(--border)]">
                              <td className="p-2 font-mono text-xs">
                                {g.code_last4 ? `••••${g.code_last4}` : '••••'}
                              </td>
                              <td className="p-2 text-right tabular-nums">
                                {formatINR(g.initial_value)}
                              </td>
                              <td className="p-2 text-right tabular-nums font-semibold">
                                {formatINR(g.balance)}
                              </td>
                              <td className="p-2 text-xs text-[var(--text-muted)]">
                                {g.expires_on ?? 'never'}
                              </td>
                              <td className="p-2">
                                <span
                                  className={cn(
                                    'text-xs px-2 py-0.5 rounded-full font-medium',
                                    g.status === 'enabled'
                                      ? 'bg-[var(--pos-soft)] text-[var(--pos)]'
                                      : 'bg-[var(--bg)] text-[var(--text-muted)]',
                                  )}
                                >
                                  {g.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
