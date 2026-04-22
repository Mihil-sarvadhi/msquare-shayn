import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchGA4Data, fetchGA4RealtimeWidgetData, refreshGA4Realtime } from '@store/slices/ga4Slice';
import { DrawerProvider } from '@components/shared/DrawerContext';
import { InfoDrawer } from '@components/shared/InfoDrawer';
import { KpiCard } from '@components/shared/KpiCard';
import { Panel } from '@components/shared/Panel';
import { CustomTooltip } from '@components/shared/CustomTooltip';
import { ModernLoader } from '@components/shared/ModernLoader';
import { formatINR, formatNum } from '@utils/formatters';
import { rangeLabel } from '@utils/common-functions/buildRangeParams';
import { cn } from '@/lib/utils';
import WorldMap, { type DataItem } from 'react-svg-worldmap';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type {
  GA4Summary, GA4SummaryInsights, GA4TrafficDaily, GA4Channel, GA4EcommerceDaily,
  GA4Product, GA4RealtimeWidget, GA4PageScreen, GA4CountryActiveUsers,
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
function AnalyticsSummaryCards({
  s,
  insights,
  loading,
}: {
  s: GA4Summary | null;
  insights: GA4SummaryInsights | null;
  loading: boolean;
}) {
  const bounce = s?.avg_bounce_rate ?? 0;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard
        label="Sessions"
        value={formatNum(s?.total_sessions)}
        sub="all visits · vs previous period"
        delta={insights?.sessions_delta_pct}
        loading={loading}
      />
      <KpiCard
        label="Active users"
        value={formatNum(s?.total_users)}
        sub="unique users · vs previous period"
        delta={insights?.users_delta_pct}
        loading={loading}
      />
      <KpiCard
        label="New Users"
        value={formatNum(s?.total_new_users)}
        sub="first-time · vs previous period"
        delta={insights?.new_users_delta_pct}
        loading={loading}
      />
      <KpiCard
        label="Page Views"
        value={formatNum(s?.total_page_views)}
        sub="total screens · vs previous period"
        delta={insights?.page_views_delta_pct}
        loading={loading}
      />
      <KpiCard
        label="Bounce Rate"
        value={`${(bounce * 100).toFixed(1)}%`}
        sub={(bounce > 0.6 ? 'High — action needed' : bounce > 0.4 ? 'Moderate' : 'Healthy') + ' · vs previous period'}
        delta={insights?.bounce_rate_delta_pct}
        invertDelta
        loading={loading}
      />
      <KpiCard
        label="Avg Session"
        value={fmtDuration(s?.avg_session_duration ?? 0)}
        sub="time on site · vs previous period"
        delta={insights?.avg_session_duration_delta_pct}
        loading={loading}
      />
    </div>
  );
}

/* ─── 2 · Traffic trend ────────────────────────────────────── */
function TrafficTrendChart({ data }: { data: GA4TrafficDaily[] }) {
  if (!data.length) return <div className="h-full min-h-[260px] flex items-center justify-center text-sm text-[var(--text-subtle)]">No data</div>;
  return (
    <div className="h-full min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtAxisDate}
          tick={{ fontSize: 10, fill: MUTED }}
          tickLine={false}
          interval={Math.max(0, Math.floor(data.length / 7) - 1)}
          padding={{ left: 12, right: 12 }}
        />
        <YAxis tickFormatter={formatNum} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={(v) => formatNum(Number(v))} />} />
        <Line type="monotone" dataKey="sessions"     name="Sessions"     stroke={ACCENT} strokeWidth={2}   dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="active_users" name="Active Users" stroke={POS}    strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="new_users"    name="New Users"    stroke={INFO}   strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
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
              <Tooltip
                formatter={(v: number) => formatNum(v)}
                contentStyle={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '12px',
                }}
                itemStyle={{ fontSize: '12px', padding: 0, margin: 0 }}
                labelStyle={{ fontSize: '12px', marginBottom: 2 }}
              />
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
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize: 10, fill: MUTED }} tickLine={false} interval={Math.max(0, Math.floor(data.length / 7) - 1)} />
        <YAxis yAxisId="rev"   tickFormatter={(v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="txn"   orientation="right" tickFormatter={formatNum} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={30} />
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
  const topViewedProducts = [...data].sort((a, b) => b.items_viewed - a.items_viewed);
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
          {topViewedProducts.slice(0, 10).map((p, i) => {
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

function TopPagesScreensTable({ data }: { data: GA4PageScreen[] }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-sm text-[var(--text-subtle)]">No page/screen data</div>;
  return (
    <div className="overflow-x-auto rounded-lg">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="sticky top-0 bg-[var(--surface)] z-10">
          <tr className="border-b border-[var(--border)]">
            <th className="py-3 pr-3 pl-2 text-left text-[11px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">Page</th>
            <th className="py-3 pr-3 text-right text-[11px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">Views</th>
            <th className="py-3 pr-3 text-right text-[11px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">Users</th>
            <th className="py-3 pr-3 text-right text-[11px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">Views / user</th>
            <th className="py-3 pr-3 text-right text-[11px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">Avg time</th>
            <th className="py-3 pr-3 text-right text-[11px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">Events</th>
            <th className="py-3 pr-2 text-right text-[11px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">Bounce</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, i) => (
            <tr
              key={row.page_title}
              className={cn(
                'transition-colors hover:bg-[#F8FAFC] border-b border-[var(--border)]/60 last:border-0',
                i % 2 === 1 && 'bg-[#FAFBFC]',
              )}
            >
              <td className="py-3 pr-3 pl-2 text-[var(--text)] max-w-[440px] truncate font-medium" title={row.page_title}>
                {row.page_title}
              </td>
              <td className="py-3 pr-3 text-right tabular-nums font-semibold text-[var(--text)]">{formatNum(row.screen_page_views)}</td>
              <td className="py-3 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(row.active_users)}</td>
              <td className="py-3 pr-3 text-right tabular-nums text-[var(--text-muted)]">{row.views_per_active_user.toFixed(2)}</td>
              <td className="py-3 pr-3 text-right tabular-nums text-[var(--text-muted)]">{Math.round(row.avg_engagement_time_per_active_user)}s</td>
              <td className="py-3 pr-3 text-right tabular-nums text-[var(--text-muted)]">{formatNum(row.event_count)}</td>
              <td className="py-3 pr-2 text-right tabular-nums">
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-semibold"
                  style={{
                    color: row.bounce_rate > 0.6 ? '#DC2626' : row.bounce_rate > 0.4 ? '#D97706' : '#059669',
                    backgroundColor: row.bounce_rate > 0.6 ? '#FEE2E2' : row.bounce_rate > 0.4 ? '#FEF3C7' : '#D1FAE5',
                  }}
                >
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

function normalizeCountry(value: string): string {
  return value.trim().toLowerCase();
}

const COUNTRY_TO_ISO2: Record<string, string> = {
  india: 'IN',
  china: 'CN',
  'united states': 'US',
  singapore: 'SG',
  indonesia: 'ID',
  'united kingdom': 'GB',
  philippines: 'PH',
  canada: 'CA',
  australia: 'AU',
  germany: 'DE',
  france: 'FR',
  japan: 'JP',
  italy: 'IT',
  spain: 'ES',
  brazil: 'BR',
  mexico: 'MX',
  russia: 'RU',
  'south korea': 'KR',
  uae: 'AE',
  'saudi arabia': 'SA',
  thailand: 'TH',
  malaysia: 'MY',
  vietnam: 'VN',
  pakistan: 'PK',
  bangladesh: 'BD',
  nepal: 'NP',
  'sri lanka': 'LK',
  'new zealand': 'NZ',
};

function ActiveUsersCountryMapCard({
  data,
  loading,
  subtitle,
}: {
  data: GA4CountryActiveUsers[];
  loading: boolean;
  subtitle: string;
}) {
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

  const body = (() => {
    if (loading) {
      return (
        <div className="h-[340px] flex items-center justify-center">
          <ModernLoader size="md" label="Loading" />
        </div>
      );
    }
    if (!data.length) {
      return (
        <div className="h-[340px] flex items-center justify-center text-sm text-[var(--text-subtle)]">
          No country data
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-center">
        {/* Map — 60% */}
        <div className="ga4-worldmap relative bg-[#F8FAFC] rounded-xl p-4">
          <WorldMap
            color="#3B82F6"
            valueSuffix=" users"
            size="responsive"
            backgroundColor="#F8FAFC"
            tooltipBgColor="#1A1208"
            tooltipTextColor="#FDFAF4"
            data={mapPoints}
            tooltipTextFunction={({ countryName, countryValue }) =>
              `${countryName}: ${formatNum(countryValue ?? 0)} users`
            }
          />
        </div>

        {/* Country list — 40% */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold pb-2 border-b border-[var(--border)]">
            <span>Country</span>
            <span>Active Users</span>
          </div>
          <div className="flex-1 overflow-y-auto mt-1">
            {data.slice(0, 8).map((row) => {
              const pct = maxUsers > 0 ? (row.activeUsers / maxUsers) * 100 : 0;
              return (
                <div
                  key={row.country}
                  className="py-2.5 transition-colors hover:bg-[#F8FAFC] rounded px-2 -mx-2"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-[var(--text)] truncate font-medium">{row.country}</span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--text)]">
                      {formatNum(row.activeUsers)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: '#3B82F6' }}
                    />
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
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <style>{`
        .ga4-worldmap svg { max-width: 100%; height: auto; }
      `}</style>
      <div className="flex items-start justify-between mb-5">
        <h3 className="text-[16px] font-semibold text-[var(--text)] leading-tight">
          Active Users by Country
        </h3>
        <span className="text-xs text-[var(--text-subtle)] mt-0.5">{subtitle}</span>
      </div>
      {body}
    </div>
  );
}

/* ─── 9 · Realtime widget ──────────────────────────────────── */
function RealtimeWidget({
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
  const metricLabel = metric === 'newUsers' ? 'new users' : 'Active Users';
  const locationLabel = location === 'city' ? 'City' : 'Country';
  const metricLabelTitle = metric === 'newUsers' ? 'New users' : 'Active users';

  return (
    <div>
      <div className="mb-2">
        <p className="inline-block text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold border-b border-dashed border-[#D7D0C3] pb-0.5">
          Active users in last 30 minutes
        </p>
      </div>
      <div className="mb-3 flex items-start justify-between">
        <p className="text-4xl font-bold text-[var(--text)]">{formatNum(total)}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">Live</span>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2">
        {metric === 'newUsers' ? 'New users per minute' : 'Active users per minute'}
      </p>
      <div className="mb-3">
        <ResponsiveContainer width="100%" height={72}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e6df" vertical={false} />
            <XAxis
              dataKey="minute"
              tick={{ fontSize: 10, fill: MUTED }}
              tickLine={false}
              axisLine={false}
              interval={4}
              minTickGap={12}
              padding={{ left: 20, right: 20 }}
              allowDataOverflow
            />
            <YAxis hide />
            <Tooltip
              content={
                <CustomTooltip
                  formatter={(v) => formatNum(Number(v))}
                  labelFormatter={(label) => `${label}`}
                />
              }
            />
            <Bar dataKey="value" name={metricLabelTitle} fill={INFO} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select
          className="h-8 rounded-md border border-[var(--border)] bg-white px-2 text-xs text-[var(--text)]"
          value={location}
          onChange={(e) => onLocationChange(e.target.value as 'country' | 'city')}
        >
          <option value="country">Country</option>
          <option value="city">City</option>
        </select>
        <select
          className="h-8 rounded-md border border-[var(--border)] bg-white px-2 text-xs text-[var(--text)]"
          value={metric}
          onChange={(e) => onMetricChange(e.target.value as 'activeUsers' | 'newUsers')}
        >
          <option value="activeUsers">Active users</option>
          <option value="newUsers">New users</option>
        </select>
      </div>
      {breakdown.length > 0 && (
        <div className="max-h-[180px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-1 pr-3 text-left  text-[var(--text-muted)] font-medium">{locationLabel}</th>
                <th className="py-1      text-right text-[var(--text-muted)] font-medium">{metricLabel}</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.slice(0, 5).map((r) => (
                <tr key={r.location} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1 pr-3 text-[var(--text)]">{r.location}</td>
                  <td className="py-1      text-right tabular-nums font-semibold">{formatNum(r.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
export function AnalyticsPage() {
  const dispatch = useAppDispatch();
  const {
    summary,
    summaryInsights,
    overview,
    channels,
    ecommerce,
    products,
    countryActiveUsers,
    realtimeWidget,
    pagesScreens,
    realtimeWidgetLoading,
    loading,
    error,
  } =
    useAppSelector((s) => s.ga4);
  const range = useAppSelector((s) => s.range);
  const [realtimeLocation, setRealtimeLocation] = useState<'country' | 'city'>('country');
  const [realtimeMetric, setRealtimeMetric] = useState<'activeUsers' | 'newUsers'>('activeUsers');

  useEffect(() => { dispatch(fetchGA4Data(range)); }, [dispatch, range]);

  useEffect(() => {
    dispatch(fetchGA4RealtimeWidgetData({ location: realtimeLocation, metric: realtimeMetric }));
  }, [dispatch, realtimeLocation, realtimeMetric]);

  // Auto-refresh realtime card every 1 min (card-only live behavior)
  useEffect(() => {
    const id = window.setInterval(() => {
      dispatch(refreshGA4Realtime());
      dispatch(fetchGA4RealtimeWidgetData({ location: realtimeLocation, metric: realtimeMetric }));
    }, 60 * 1000);
    return () => window.clearInterval(id);
  }, [dispatch, realtimeLocation, realtimeMetric]);

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
      {realtimeWidgetLoading && (
        <div className="fixed inset-0 z-50 bg-[#FDFAF4]/70 backdrop-blur-[1px] flex items-center justify-center">
          <ModernLoader size="lg" label="Loading" />
        </div>
      )}
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">

          <AnalyticsSummaryCards s={summary} insights={summaryInsights} loading={loading} />

          {/* Traffic trend + Realtime */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              title="Traffic Trend"
              subtitle={`Sessions · Users · New Users · ${rangeLabel(range)}`}
              className="lg:col-span-2"
            >
              <TrafficTrendChart data={overview} />
            </Panel>
            <Panel title="">
              <RealtimeWidget
                data={realtimeWidget}
                location={realtimeLocation}
                metric={realtimeMetric}
                onLocationChange={setRealtimeLocation}
                onMetricChange={setRealtimeMetric}
              />
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
          <Panel title="Top Viewed Products" subtitle="Ranked by views · Added · Purchased · Revenue">
            <TopProductsGA4 data={products} />
          </Panel>

          <Panel title="Top pages/screens" subtitle="Views · Active users · Event count · Bounce rate">
            <TopPagesScreensTable data={pagesScreens} />
          </Panel>

          <ActiveUsersCountryMapCard data={countryActiveUsers} loading={loading} subtitle={rangeLabel(range)} />

        </main>
      </div>
    </DrawerProvider>
  );
}
