import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchDashboard } from '@store/slices/dashboardSlice';
import { fetchMarketingData } from '@store/slices/analyticsSlice';
import { DrawerProvider } from '@components/shared/DrawerContext';
import { InfoDrawer } from '@components/shared/InfoDrawer';
import { Panel } from '@components/shared/Panel';
import { KpiCard } from '@components/shared/KpiCard';
import { PageLoader } from '@components/shared/PageLoader';
import { formatINR, formatNum } from '@utils/formatters';
import { rangeLabel } from '@utils/common-functions/buildRangeParams';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { MarketingTrendItem, CreativeFatigueItem } from '@app/types/analytics';
import type { Campaign } from '@app/types/dashboard';

import { ACCENT, POS, NEG, WARN, AI, MUTED, TEAL } from '@utils/constants/palette';

const OBJ_COLORS: Record<string, string> = {
  OUTCOME_SALES: ACCENT, OUTCOME_TRAFFIC: POS, OUTCOME_AWARENESS: AI,
  CONVERSIONS: WARN, LINK_CLICKS: NEG,
};
const FALLBACK_COLORS = [ACCENT, POS, AI, WARN, NEG, TEAL];

/* ── helpers ── */
function fmtTrendDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${dt.toLocaleString('en-IN', { month: 'short' })}`;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const step = mag >= 1000 ? mag / 2 : mag;
  return Math.ceil((v * 1.15) / step) * step;
}

function fmtShortINR(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

/* Anomaly: spend exists but revenue=0 → likely attribution sync gap */
function isAnomalyDay(d: MarketingTrendItem) {
  return d.spend !== null && Number(d.spend) > 0 &&
    (d.purchase_value === null || Number(d.purchase_value) === 0);
}

function MarketingTrendChart({ data }: { data: MarketingTrendItem[] }) {
  if (!data.length) return (
    <div className="h-72 flex items-center justify-center text-[var(--text-subtle)] text-sm">No data</div>
  );

  const todayKey = new Date().toISOString().slice(0, 10);

  /* Enrich each point: convert strings→numbers, mark anomalies, mark partial today */
  const enriched = data.map((d) => ({
    date: d.date.slice(0, 10),
    spend:          d.spend         !== null ? Number(d.spend)         : null,
    purchase_value: d.purchase_value !== null ? Number(d.purchase_value) : null,
    roas:           d.roas           !== null ? Number(d.roas)           : null,
    anomaly: isAnomalyDay(d),
    partial: d.date.slice(0, 10) === todayKey,
    noData:  d.spend === null,
  }));

  /* Y-axis domains with 15% headroom */
  const maxSpend = Math.max(...enriched.map((d) => d.spend ?? 0), 1);
  const maxRev   = Math.max(...enriched.map((d) => d.purchase_value ?? 0), 1);
  const maxLeft  = niceMax(Math.max(maxSpend, maxRev));
  const maxRoas  = Math.max(...enriched.map((d) => d.roas ?? 0), 1);
  const maxRight = niceMax(maxRoas);

  const xInterval = Math.max(1, Math.floor(enriched.length / 7) - 1);

  /* Custom dot: render anomaly marker */
  const AnomalyDot = (props: { cx?: number; cy?: number; payload?: { anomaly?: boolean; partial?: boolean } }) => {
    const { cx = 0, cy = 0, payload } = props;
    if (payload?.anomaly) return <circle cx={cx} cy={cy} r={4} fill={WARN} stroke="var(--surface)" strokeWidth={1.5} />;
    if (payload?.partial) return <circle cx={cx} cy={cy} r={3} fill={ACCENT} stroke="var(--surface)" strokeWidth={1} opacity={0.6} />;
    return <></>;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={enriched} margin={{ top: 10, right: 48, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtTrendDate}
            tick={{ fontSize: 10, fill: MUTED }}
            tickLine={false}
            interval={xInterval}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={fmtShortINR}
            tick={{ fontSize: 10, fill: MUTED }}
            axisLine={false}
            tickLine={false}
            domain={[0, maxLeft]}
            tickCount={5}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v: number) => `${v.toFixed(1)}x`}
            tick={{ fontSize: 10, fill: MUTED }}
            axisLine={false}
            tickLine={false}
            domain={[0, maxRight]}
            tickCount={5}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const pt = enriched.find((d) => d.date === label);
              return (
                <div className="bg-[var(--ink)] text-[var(--surface)] rounded-lg px-3 py-2 text-xs shadow-lg border border-[var(--line-3)] min-w-[160px]">
                  <p className="text-[#a39f92] mb-1.5 font-medium">{fmtTrendDate(label as string)}</p>
                  {pt?.noData ? (
                    <p className="text-amber-400">No Meta data for this date</p>
                  ) : (
                    <>
                      {pt?.anomaly && (
                        <p className="text-amber-400 mb-1">⚠ Spend with no attributed revenue</p>
                      )}
                      {pt?.partial && (
                        <p className="text-[#a39f92] mb-1 italic">Partial day (still syncing)</p>
                      )}
                      {payload.map((entry, i) => (
                        <p key={i} style={{ color: entry.color as string }} className="leading-snug">
                          <span className="text-[var(--surface)]/60">{entry.name}: </span>
                          {entry.name === 'ROAS'
                            ? `${Number(entry.value ?? 0).toFixed(2)}x`
                            : fmtShortINR(Number(entry.value ?? 0))}
                        </p>
                      ))}
                    </>
                  )}
                </div>
              );
            }}
            cursor={{ stroke: 'rgba(184,137,62,0.15)', strokeWidth: 1 }}
          />
          {/* Ad Spend — solid red */}
          <Line
            yAxisId="left"
            type="linear"
            dataKey="spend"
            stroke={NEG}
            strokeWidth={1.5}
            dot={<AnomalyDot />}
            activeDot={{ r: 4 }}
            connectNulls={false}
            name="Ad Spend"
          />
          {/* Revenue — solid gold, thicker */}
          <Line
            yAxisId="left"
            type="linear"
            dataKey="purchase_value"
            stroke={ACCENT}
            strokeWidth={2}
            dot={<AnomalyDot />}
            activeDot={{ r: 4 }}
            connectNulls={false}
            name="Revenue"
          />
          {/* ROAS — dashed green on right axis */}
          <Line
            yAxisId="right"
            type="linear"
            dataKey="roas"
            stroke={POS}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
            name="ROAS"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-1 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 inline-block rounded" style={{ backgroundColor: NEG }} />
          Ad Spend
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 inline-block rounded" style={{ backgroundColor: ACCENT }} />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 inline-block" style={{ borderTop: `2px dashed ${POS}` }} />
          ROAS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: WARN }} />
          Anomaly
        </span>
      </div>
    </div>
  );
}

interface FunnelStage {
  label: string;
  value: number;
  formatted: string;
  stepPct: number | null;   // conversion from previous step
  barPct: number;           // bar width relative to impressions
  color: string;
  note?: string;            // optional footnote
}

function MetaFunnelChart({
  data, orders, abandonedCount,
}: {
  data: { impressions: number; clicks: number; purchases: number } | null;
  orders: number;
  abandonedCount: number;
}) {
  if (!data) return <div className="h-44 flex items-center justify-center text-[var(--text-subtle)] text-sm">No data</div>;

  const imp       = data.impressions;
  const clicks    = data.clicks;
  const checkouts = orders + abandonedCount;   // completed + abandoned
  const purchases = orders;                    // actual Shopify orders (reliable)

  const ctr      = imp       > 0 ? (clicks    / imp)       * 100 : 0;
  const clickToC = clicks    > 0 ? (checkouts / clicks)    * 100 : 0;
  const cToP     = checkouts > 0 ? (purchases / checkouts) * 100 : 0;
  const overall  = imp       > 0 ? (purchases / imp)       * 100 : 0;

  const stages: FunnelStage[] = [
    { label: 'Impressions',         value: imp,       formatted: formatNum(imp),       stepPct: null,    barPct: 100,                                color: ACCENT },
    { label: 'Clicks',              value: clicks,    formatted: formatNum(clicks),    stepPct: ctr,     barPct: Math.max(ctr, 0.5),                 color: POS },
    { label: 'Checkout Initiated',  value: checkouts, formatted: formatNum(checkouts), stepPct: clickToC, barPct: Math.max((checkouts / imp) * 100, checkouts > 0 ? 0.5 : 0), color: AI,   note: 'Completed + abandoned checkouts' },
    { label: 'Purchases',           value: purchases, formatted: formatNum(purchases), stepPct: cToP,    barPct: Math.max((purchases / imp) * 100, purchases > 0 ? 0.5 : 0),  color: WARN },
  ];

  return (
    <div className="space-y-3 pt-1">
      {stages.map((s, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">{s.label}</span>
            <div className="flex items-baseline gap-2">
              {s.stepPct !== null && (
                <span className="text-[var(--text-subtle)] text-[10px]">{s.stepPct.toFixed(2)}%</span>
              )}
              <span className="font-semibold text-[var(--text)]">{s.formatted}</span>
            </div>
          </div>
          <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, s.barPct)}%`, backgroundColor: s.color }}
            />
          </div>
          {s.note && (
            <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">{s.note}</p>
          )}
        </div>
      ))}
      <div className="pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
        Overall conversion: <span className="font-semibold text-[var(--text)]">{overall.toFixed(3)}%</span>
        <span className="ml-1 text-[var(--text-subtle)]">impressions → purchase</span>
      </div>
    </div>
  );
}

// Attribution Gap card disabled — re-enable by uncommenting this component and its usages below
// function AttributionGapChart({ data }: { data: { meta_purchases: number; shopify_orders: number; attribution_rate: number; gap: number } | null }) {
//   if (!data) return <div className="h-44 flex items-center justify-center text-[var(--text-subtle)] text-sm">No data</div>;
//   const bars = [
//     { name: 'Meta Reported', value: data.meta_purchases, fill: AI },
//     { name: 'Shopify Actual', value: data.shopify_orders, fill: ACCENT },
//   ];
//   return (
//     <div>
//       <ResponsiveContainer width="100%" height={150}>
//         <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
//           <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} />
//           <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={110} />
//           <Tooltip content={<CustomTooltip formatter={(v) => formatNum(v)} />} />
//           <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Count">
//             {bars.map((b, i) => <Cell key={i} fill={b.fill} />)}
//           </Bar>
//         </BarChart>
//       </ResponsiveContainer>
//       <p className="text-xs text-[var(--text-muted)] text-center">Attribution rate: {data.attribution_rate.toFixed(0)}%</p>
//     </div>
//   );
// }

function SpendByObjectiveDonut({ campaigns }: { campaigns: Campaign[] }) {
  const grouped: Record<string, number> = {};
  for (const c of campaigns) {
    const obj = c.objective || 'Other';
    grouped[obj] = (grouped[obj] ?? 0) + Number(c.spend);
  }
  const data = Object.entries(grouped).map(([name, value]) => ({ name, value }));
  return (
    <div className="h-full flex flex-col min-h-[180px]">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={72} dataKey="value" paddingAngle={2}>
              {data.map((d, i) => <Cell key={i} fill={OBJ_COLORS[d.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatINR(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: OBJ_COLORS[d.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}


/* ── Creative Fatigue Chart ── */
function CreativeFatigueChart({ data }: { data: CreativeFatigueItem[] }) {
  if (!data.length) return (
    <div className="h-56 flex items-center justify-center text-[var(--text-subtle)] text-sm">No data</div>
  );

  const enriched = data.map((d, i) => ({
    label: `D${i + 1}`,
    frequency: d.frequency,
    ctr:       d.ctr,
  }));

  const maxFreq = Math.max(...enriched.map((d) => d.frequency ?? 0), 1);
  const maxCtr  = Math.max(...enriched.map((d) => d.ctr       ?? 0), 1);
  const xInterval = Math.max(1, Math.floor(enriched.length / 7) - 1);

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={enriched} margin={{ top: 10, right: 48, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: MUTED }}
            tickLine={false}
            interval={xInterval}
          />
          <YAxis
            yAxisId="freq"
            tickFormatter={(v: number) => v.toFixed(1)}
            tick={{ fontSize: 10, fill: MUTED }}
            axisLine={false}
            tickLine={false}
            domain={[0, niceMax(maxFreq)]}
            tickCount={5}
          />
          <YAxis
            yAxisId="ctr"
            orientation="right"
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            tick={{ fontSize: 10, fill: MUTED }}
            axisLine={false}
            tickLine={false}
            domain={[0, niceMax(maxCtr)]}
            tickCount={5}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-[var(--ink)] text-[var(--surface)] rounded-lg px-3 py-2 text-xs shadow-lg border border-[var(--line-3)] min-w-[140px]">
                  <p className="text-[#a39f92] mb-1.5 font-medium">{label as string}</p>
                  {payload.map((entry, i) => (
                    <p key={i} style={{ color: entry.color as string }} className="leading-snug">
                      <span className="text-[var(--surface)]/60">{entry.name}: </span>
                      {entry.name === 'Frequency'
                        ? Number(entry.value ?? 0).toFixed(2)
                        : `${Number(entry.value ?? 0).toFixed(2)}%`}
                    </p>
                  ))}
                </div>
              );
            }}
            cursor={{ stroke: 'rgba(184,137,62,0.15)', strokeWidth: 1 }}
          />
          <Line
            yAxisId="freq"
            type="monotone"
            dataKey="frequency"
            stroke={WARN}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
            name="Frequency"
          />
          <Line
            yAxisId="ctr"
            type="monotone"
            dataKey="ctr"
            stroke={AI}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
            name="CTR %"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-1 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 inline-block rounded" style={{ backgroundColor: WARN }} />
          Frequency
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 inline-block rounded" style={{ backgroundColor: AI }} />
          CTR %
        </span>
      </div>
    </div>
  );
}


type SortKey = 'revenue' | 'roas' | 'spend';
type ShowLimit = 10 | 20 | 'all';

function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  const [sortBy, setSortBy]       = useState<SortKey>('revenue');
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc');
  const [showLimit, setShowLimit] = useState<ShowLimit>(10);

  const handleSort = useCallback((col: SortKey) => {
    setSortBy((prev) => {
      if (prev === col) { setSortDir((d) => d === 'desc' ? 'asc' : 'desc'); return prev; }
      setSortDir('desc');
      return col;
    });
  }, []);

  const rows = useMemo(() => {
    const enriched = campaigns.map((c) => {
      const roas     = Number(c.roas);
      const ctr      = c.impressions > 0 ? (c.clicks    / c.impressions) * 100  : 0;
      const cpm      = c.impressions > 0 ? (c.spend     / c.impressions) * 1000 : 0;
      const freq     = c.reach       > 0 ?  c.impressions / c.reach              : 0;
      const inactive = c.spend === 0 && c.purchase_value === 0 && c.impressions === 0;
      const noRevenue = !inactive && c.purchase_value === 0;
      const status: 'Scale' | 'Hold' | 'Cut' | 'Inactive' =
        inactive  ? 'Inactive'
        : noRevenue ? 'Cut'
        : roas >= 3 ? 'Scale'
        : roas >= 1.5 ? 'Hold'
        : 'Cut';
      return { ...c, roas, ctr, cpm, freq, status, inactive, noRevenue };
    });

    const sorted = [...enriched].sort((a, b) => {
      const av = sortBy === 'revenue' ? a.purchase_value : sortBy === 'roas' ? a.roas : a.spend;
      const bv = sortBy === 'revenue' ? b.purchase_value : sortBy === 'roas' ? b.roas : b.spend;
      return sortDir === 'desc' ? bv - av : av - bv;
    });

    return showLimit === 'all' ? sorted : sorted.slice(0, showLimit);
  }, [campaigns, sortBy, sortDir, showLimit]);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-0.5 text-[9px] opacity-50">
      {sortBy === col ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
    </span>
  );

  const thSort = (col: SortKey, label: string) => (
    <th
      className="py-2.5 pr-3 text-right text-[var(--text-muted)] font-medium cursor-pointer select-none hover:text-[var(--text)] transition-colors whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      {label}<SortIcon col={col} />
    </th>
  );

  const limitButtons = (
    <div className="flex items-center gap-1">
      {([10, 'all'] as ShowLimit[]).map((n) => (
        <button
          key={String(n)}
          onClick={() => setShowLimit(n)}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
            showLimit === n
              ? 'bg-[var(--accent-soft,#f5f0e8)] text-[var(--accent,#8b6f3a)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
          }`}
        >
          {n === 'all' ? 'All' : `Top ${n}`}
        </button>
      ))}
    </div>
  );

  return (
    <Panel
      title="Campaign Performance"
      subtitle="Meta Ads"
      action={limitButtons}
      info={{ what: 'Meta ad campaigns sorted by revenue. Status: Scale (ROAS ≥ 3×), Hold (1.5–3×), Cut (< 1.5×), Inactive (no spend/data). CTR, CPM and Freq computed from Meta impressions.', source: 'Meta Ads API', readIt: 'Scale winners by duplicating ad sets. Cut campaigns below 1.5× ROAS after 3+ days of data.' }}
      ai={{ observation: 'Top 2–3 campaigns typically drive 80% of total purchase revenue.', insight: 'Identify your top creative-audience combination and build new campaigns around the same formula. Budget should follow performance, not be distributed evenly.', actions: ['Scale top 3 ROAS campaigns by 15% weekly', 'Create lookalike audiences from top purchasers', 'Archive campaigns with zero purchases after 7 days'] }}
    >
      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <div className="max-h-[420px] overflow-y-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-xs min-w-[620px]">
            <thead className="sticky top-0 bg-[var(--surface)] z-10">
              <tr className="border-b border-[var(--border)]">
                <th className="py-2.5 pl-3 pr-3 text-left text-[var(--text-muted)] font-medium w-[220px]">Campaign</th>
                {thSort('spend',   'Spend')}
                {thSort('revenue', 'Revenue')}
                {thSort('roas',    'ROAS')}
                <th className="py-2.5 pr-3 text-right text-[var(--text-muted)] font-medium">CTR</th>
                <th className="py-2.5 pr-3 text-right text-[var(--text-muted)] font-medium">CPM</th>
                <th className="py-2.5 pr-3 text-right text-[var(--text-muted)] font-medium">Freq</th>
                <th className="py-2 pr-3 text-center text-[var(--text-muted)] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const statusStyle =
                  c.status === 'Scale'    ? 'bg-[var(--pos-soft)]  text-[var(--pos)]'
                  : c.status === 'Hold'   ? 'bg-[var(--warn-soft)] text-[var(--warn)]'
                  : c.status === 'Inactive' ? 'bg-[var(--surface-2)] text-[var(--text-subtle)]'
                  : 'bg-[var(--neg-soft)] text-[var(--neg)]';
                const roasStyle =
                  c.inactive              ? 'text-[var(--text-subtle)]'
                  : c.roas >= 3           ? 'text-[var(--pos)] font-semibold'
                  : c.roas >= 1.5         ? 'text-[var(--warn)] font-semibold'
                  : 'text-[var(--neg)] font-semibold';
                const revStyle = c.purchase_value > 0
                  ? 'text-[var(--text)] font-medium'
                  : 'text-[var(--text-subtle)]';
                return (
                  <tr
                    key={c.campaign_id}
                    className={`border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors ${c.inactive ? 'opacity-50' : ''}`}
                  >
                    <td className="py-2 pl-3 pr-3 text-[var(--text)] max-w-[220px]">
                      <span className="block truncate" title={c.campaign_name}>{c.campaign_name}</span>
                    </td>
                    <td className="py-2 pr-3 text-[var(--text-muted)] text-right tabular-nums">{formatINR(c.spend)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${revStyle}`}>
                      {c.purchase_value > 0 ? formatINR(c.purchase_value) : <span className="text-[10px] italic">No data</span>}
                    </td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${roasStyle}`}>
                      {c.inactive ? '—' : c.noRevenue ? <span className="text-[10px] text-[var(--text-subtle)] italic">No attr.</span> : `${c.roas.toFixed(2)}x`}
                    </td>
                    <td className="py-2 pr-3 text-[var(--text-muted)] text-right tabular-nums">{c.ctr.toFixed(2)}%</td>
                    <td className="py-2 pr-3 text-[var(--text-muted)] text-right tabular-nums">₹{Math.round(c.cpm)}</td>
                    <td className="py-2 pr-3 text-[var(--text-muted)] text-right tabular-nums">{c.freq.toFixed(1)}</td>
                    <td className="py-2 pr-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${statusStyle}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[var(--text-subtle)]">No campaigns found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

/* ── KPI delta helper ── */
function pctDelta(curr: number | undefined, prev: number | undefined): number | undefined {
  // Only skip when there is genuinely no previous data (null/undefined), not when it's zero
  if (curr === undefined || curr === null) return undefined;
  if (prev === undefined || prev === null) return undefined;
  // Can't compute % change from zero baseline — caller should decide how to display
  if (prev === 0) return undefined;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

/* Contextual insight lines for each marketing KPI */
function spendInsight(delta?: number): string {
  if (delta === undefined) return 'vs previous period';
  if (delta > 30) return 'Large spend jump — monitor ROAS closely';
  if (delta > 10) return 'Spend scaling up';
  if (delta < -30) return 'Sharp spend cut — check campaigns';
  if (delta < -10) return 'Spend reduced this period';
  return 'Spend stable vs prior period';
}
function revenueInsight(roas: number, delta?: number): string {
  if (delta === undefined) return roas >= 2.5 ? 'Strong return on spend' : 'Revenue below target';
  if (delta > 20 && roas >= 2.5) return `↑ ${delta.toFixed(0)}% · Good scaling momentum`;
  if (delta > 20) return `↑ ${delta.toFixed(0)}% · Revenue up but ROAS needs watch`;
  if (delta < -20) return `Revenue dropped ${Math.abs(delta).toFixed(0)}% — investigate`;
  return roas >= 2.5 ? 'Stable · above breakeven' : 'Stable · below breakeven';
}
function roasInsight(roas: number, delta?: number): string {
  const trend = delta !== undefined
    ? (delta > 5 ? '· improving' : delta < -5 ? '· declining' : '· stable')
    : '';
  if (roas >= 3) return `Strong ROAS ${trend}`;
  if (roas >= 2) return `Near breakeven ${trend}`;
  if (roas >= 1) return `Below breakeven ${trend}`;
  return `Unprofitable — pause & review`;
}
function merInsight(mer: number, delta?: number): string {
  const note = delta !== undefined
    ? (delta > 5 ? ' · efficiency dropping' : delta < -5 ? ' · efficiency improving' : '')
    : '';
  if (mer < 0.1) return `Very efficient spend${note}`;
  if (mer < 0.2) return `Healthy efficiency${note}`;
  if (mer < 0.35) return `Moderate efficiency${note}`;
  return `High spend ratio${note}`;
}
function cacInsight(cac: number, delta?: number): string {
  const tier = cac > 500 ? ' · high CAC' : cac > 200 ? '' : ' · efficient';
  if (delta === undefined) return `per new customer${tier}`;
  if (delta > 20) return `↑ ${delta.toFixed(0)}% — acquisition harder${tier}`;
  if (delta < -20) return `↓ ${Math.abs(delta).toFixed(0)}% — more efficient${tier}`;
  return `Stable acquisition cost${tier}`;
}

export function MarketingPage() {
  const dispatch = useAppDispatch();
  const { campaigns, kpis, prevKpis, metaFunnel, abandonedCarts, loading } = useAppSelector((s) => s.dashboard);
  const {
    marketingTrend, creativeFatigue, loadingMarketing,
  } = useAppSelector((s) => s.analytics);
  const range = useAppSelector((s) => s.range);

  useEffect(() => {
    dispatch(fetchDashboard(range));
    dispatch(fetchMarketingData(range));
  }, [dispatch, range]);

  const isLoading = loading || loadingMarketing;

  const mer     = kpis     && kpis.revenue     > 0 ? kpis.adSpend     / kpis.revenue     : 0;
  const prevMer = prevKpis && prevKpis.revenue  > 0 ? prevKpis.adSpend / prevKpis.revenue  : undefined;
  const cac     = kpis     && kpis.customers    > 0 ? kpis.adSpend     / kpis.customers    : 0;
  const prevCac = prevKpis && prevKpis.customers > 0 ? prevKpis.adSpend / prevKpis.customers : undefined;

  const spendDelta   = pctDelta(kpis?.adSpend,  prevKpis?.adSpend);
  const revDelta     = pctDelta(kpis?.revenue,  prevKpis?.revenue);
  const roasDelta    = pctDelta(kpis?.roas,     prevKpis?.roas);
  const merDelta     = pctDelta(mer,            prevMer);
  const cacDelta     = pctDelta(cac,            prevCac);

  const roas = Number(kpis?.roas ?? 0);

  // Determine if we have a meaningful previous period to compare against
  const hasPrevSpend    = (prevKpis?.adSpend    ?? 0) > 0;
  const hasPrevRevenue  = (prevKpis?.revenue    ?? 0) > 0;
  const hasPrevCustomers = (prevKpis?.customers ?? 0) > 0;
  const prevMerValid    = hasPrevSpend && (prevKpis?.revenue ?? 0) > 0;

  // Sparklines for the top KPI strip — derived from marketingTrend (per-day Meta Ads data).
  // CAC has no daily series (depends on per-day customer acquisition data not exposed here).
  const spendSpark   = useMemo(() => marketingTrend.map((d) => Number(d.spend          ?? 0)), [marketingTrend]);
  const revenueSpark = useMemo(() => marketingTrend.map((d) => Number(d.purchase_value ?? 0)), [marketingTrend]);
  const roasSpark    = useMemo(() => marketingTrend.map((d) => Number(d.roas           ?? 0)), [marketingTrend]);
  const merSpark     = useMemo(
    () => marketingTrend.map((d) => {
      const r = Number(d.purchase_value ?? 0);
      const s = Number(d.spend ?? 0);
      return r > 0 ? s / r : 0;
    }),
    [marketingTrend],
  );

  const showPageLoader = isLoading && !kpis;

  return (
    <DrawerProvider>
      <InfoDrawer />
      {showPageLoader && <PageLoader overlay />}
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-5">

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard
              label="Ad Spend"
              value={formatINR(kpis?.adSpend)}
              delta={hasPrevSpend ? spendDelta : undefined}
              sub={hasPrevSpend ? spendInsight(spendDelta) : 'vs prior period'}
              trend={spendSpark}
              loading={isLoading}
            />
            <KpiCard
              label="Revenue"
              value={formatINR(kpis?.revenue)}
              delta={hasPrevRevenue ? revDelta : undefined}
              sub={hasPrevRevenue ? revenueInsight(roas, revDelta) : (roas >= 2.5 ? 'Strong return on spend' : 'Below breakeven')}
              trend={revenueSpark}
              loading={isLoading}
            />
            <KpiCard
              label="ROAS"
              value={`${roas.toFixed(2)}x`}
              delta={hasPrevSpend ? roasDelta : undefined}
              sub={roasInsight(roas, hasPrevSpend ? roasDelta : undefined)}
              trend={roasSpark}
              loading={isLoading}
            />
            <KpiCard
              label="MER"
              value={`${mer.toFixed(2)}x`}
              delta={prevMerValid ? (merDelta !== undefined ? -merDelta : undefined) : undefined}
              sub={merInsight(mer, prevMerValid ? merDelta : undefined)}
              trend={merSpark}
              invertDelta
              loading={isLoading}
            />
            <KpiCard
              label="CAC"
              value={formatINR(cac)}
              delta={hasPrevCustomers ? (cacDelta !== undefined ? -cacDelta : undefined) : undefined}
              sub={cacInsight(cac, hasPrevCustomers ? cacDelta : undefined)}
              loading={isLoading}
            />
          </div>

          {/* ── Row 1: Marketing Trend (wide) + Meta Funnel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Panel
              title="Marketing Trend"
              subtitle="Spend · Revenue · ROAS over time"
              className="lg:col-span-2"
              info={{ what: 'Daily ad spend, Meta-attributed revenue, and ROAS over the selected period.', source: 'Meta Ads API', readIt: 'When the ROAS line rises while spend holds flat, efficiency is improving.' }}
              ai={{ observation: 'ROAS fluctuations often correlate with creative fatigue or audience saturation mid-period.', insight: 'Consistent ROAS decline over 5+ days signals creative fatigue. Refresh creatives before ROAS drops below 1.5x to avoid wasted spend.', actions: ['Refresh creatives when ROAS drops >20% from peak for 3 consecutive days', 'Scale spend only on days when ROAS > 2.5x', 'Set automated rules to pause campaigns at ROAS < 1x'] }}
            >
              <MarketingTrendChart data={marketingTrend} />
            </Panel>
            <Panel
              title="Meta Funnel"
              subtitle="Impression → Click → Purchase"
              info={{ what: 'Conversion funnel from Meta ad impressions to purchases.', how: 'CTR = Clicks / Impressions × 100. CVR = Purchases / Clicks × 100.', source: 'Meta Ads API', readIt: 'Healthy CTR is 1–3%. CVR > 2% indicates strong landing page performance.' }}
              ai={{ observation: 'A high CTR with low CVR signals strong creative but weak landing page or offer.', insight: 'Mid-funnel drop between click and purchase is a landing page or checkout friction issue — not an ad problem. Fix the page before increasing spend.', actions: ['A/B test landing page headlines and hero images', 'Reduce checkout steps to improve CVR', 'Add social proof (reviews, UGC) above the fold'] }}
            >
              <MetaFunnelChart
                data={metaFunnel}
                orders={kpis?.orders ?? 0}
                abandonedCount={abandonedCarts?.count ?? 0}
              />
            </Panel>
          </div>

          {/* ── Row 2: Creative Fatigue (wide) + Spend by Objective ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Panel
              title="Creative Fatigue — top spenders"
              subtitle={`Frequency vs CTR · ${rangeLabel(range)}`}
              className="lg:col-span-2"
              info={{ what: 'Tracks frequency (avg impressions per person) and CTR for the top 5 campaigns by spend. Both are 7-day rolling averages to smooth daily noise.', how: 'Frequency = SUM(impressions) / SUM(reach). CTR = SUM(clicks) / SUM(impressions) × 100.', source: 'Meta Ads API', readIt: 'Rising frequency + falling CTR = creative fatigue. Audience has seen the ad too many times and is tuning it out. Refresh creatives or expand audience when frequency > 3 and CTR drops > 20%.' }}
              ai={{ observation: 'CTR typically drops 30–50% once frequency crosses 3× on a cold audience.', insight: 'Frequency above 3.5 with declining CTR is the clearest signal of creative burnout. The fix is new creative, not more budget — scaling spend into a fatigued audience multiplies waste.', actions: ['Refresh top creative when frequency > 3 for 5+ consecutive days', 'Duplicate winning ad sets with new creative variants', 'Expand lookalike audience size to lower frequency organically'] }}
            >
              <CreativeFatigueChart data={creativeFatigue} />
            </Panel>
            <Panel
              title="Spend by Objective"
              subtitle="Budget allocation by campaign type"
              info={{ what: 'Breakdown of total ad spend by Meta campaign objective.', source: 'Meta Ads API', readIt: 'Conversion campaigns should dominate — 60–70% of total spend for D2C.' }}
              ai={{ observation: 'Over-investment in awareness campaigns dilutes direct revenue attribution.', insight: '70% conversion + 20% retargeting + 10% awareness is the optimal D2C allocation. Awareness builds equity but rarely converts in-session.', actions: ['Allocate 70% to conversion campaigns', 'Run retargeting at 20% for cart abandonments', 'Limit awareness to 10% and measure brand search lift separately'] }}
            >
              <SpendByObjectiveDonut campaigns={campaigns} />
            </Panel>
          </div>

          {/* Attribution Gap card disabled — uncomment to re-enable */}
          {/* <Panel
            title="Attribution Gap"
            subtitle="Meta reported vs Shopify actual"
            info={{ what: "Compares Meta's reported purchase count to actual Shopify orders.", how: 'Attribution rate = Meta purchases / Shopify orders × 100.', source: 'Meta Ads API + Shopify Orders' }}
            ai={{ observation: 'Attribution gap reveals how much of Shopify revenue Meta can credibly claim.', insight: 'Over-attribution (>100%) usually means view-through conversions are inflating numbers. Switch to click-only attribution for accuracy.', actions: ['Set attribution to 7-day click only in Meta Ads Manager', 'Cross-reference with UTM-based revenue in Shopify Analytics', 'Use blended MER as north star instead of ROAS'] }}
          >
            <AttributionGapChart data={attributionGap} />
          </Panel> */}

          {/* ── Campaign Performance — full width ── */}
          <CampaignTable campaigns={campaigns} />


        </main>
      </div>
    </DrawerProvider>
  );
}
