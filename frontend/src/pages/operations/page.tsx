import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchDashboard } from '@store/slices/dashboardSlice';
import { fetchOperationsData } from '@store/slices/analyticsSlice';
import { DrawerProvider } from '@components/shared/DrawerContext';
import { InfoDrawer } from '@components/shared/InfoDrawer';
import { Panel } from '@components/shared/Panel';
import { KpiCard } from '@components/shared/KpiCard';
import { PageLoader } from '@components/shared/PageLoader';
import { formatNum, formatPct } from '@utils/formatters';
import {
  ComposedChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import type {
  RtoByStateItem, GeoRevenueItem,
} from '@app/types/analytics';
import type { LogisticsItem } from '@app/types/dashboard';

import { ACCENT, POS, NEG, WARN, MUTED, AI } from '@utils/constants/palette';

const STATUS_COLOR_MAP: Record<string, string> = {
  delivered:        POS,
  out_for_delivery: ACCENT,
  in_transit:       WARN,
  rto:              NEG,
  ndr:              AI,
};

function ShipmentStatusBreakdown({ data }: { data: LogisticsItem[] }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-sm text-[var(--text-subtle)]">No data</div>;

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const total  = sorted.reduce((s, r) => s + r.count, 0);
  const maxCount = sorted[0]?.count ?? 1;

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-3">
        Shipment Status Breakdown
      </p>
      {sorted.map((row) => {
        const pct   = total > 0 ? (row.count / total) * 100 : 0;
        const barW  = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
        const color = STATUS_COLOR_MAP[row.current_status_code] ?? MUTED;
        return (
          <div key={row.current_status_code} className="flex items-center gap-3">
            <span className="text-[11px] text-[var(--text-muted)] w-[120px] shrink-0 truncate"
                  title={row.current_status}>
              {row.current_status}
            </span>
            <div className="flex-1 h-[10px] bg-[var(--bg-2)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barW}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[11px] text-[var(--text-muted)] w-[64px] shrink-0 text-right font-medium tabular-nums">
              {row.count} <span className="text-[var(--text-subtle)] font-normal">({pct.toFixed(0)}%)</span>
            </span>
          </div>
        );
      })}

    </div>
  );
}

interface RtoStateRow {
  state: string;
  revenue: number;
  rto_rate: number;
  rto_count: number;
  total: number;
}

function RtoByStateChart({ rto, geo }: { rto: RtoByStateItem[]; geo: GeoRevenueItem[] }) {
  if (!rto.length) return <div className="h-56 flex items-center justify-center text-sm text-[var(--text-subtle)]">No data</div>;

  const geoMap = new Map(geo.map((g) => [g.state, g.revenue]));

  const merged: RtoStateRow[] = rto
    .slice(0, 10)
    .map((r) => ({
      state:     r.state,
      revenue:   (geoMap.get(r.state) ?? 0) / 100000,
      rto_rate:  Number(r.rto_rate),
      rto_count: Number(r.rto_count),
      total:     Number(r.total),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const maxRto     = Math.max(...merged.map((d) => d.rto_rate), 20);
  const rtoYMax    = Math.ceil((maxRto * 1.2) / 10) * 10;
  const maxRev     = Math.max(...merged.map((d) => d.revenue), 0.1);
  const revYMax    = Math.ceil((maxRev / 0.38) * 10) / 10;

  const formatRevAxis = (v: number) => v === 0 ? '₹0' : v < 1 ? `₹${(v * 100).toFixed(0)}K` : `₹${v.toFixed(1)}L`;
  const formatRtoAxis = (v: number) => `${v}%`;

  const CustomTooltipRto = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[var(--ink)] text-[var(--surface)] rounded-lg px-3 py-2 text-xs shadow-xl border border-[var(--line-3)]">
        <p className="font-semibold mb-1 uppercase tracking-wide">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
            <span>{p.name}</span>
            <span className="font-semibold">
              {p.name === 'Revenue' ? formatRevAxis(Number(p.value)) : `${Number(p.value).toFixed(1)}%`}
            </span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={merged} margin={{ top: 12, right: 52, left: 0, bottom: 16 }}>
        <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
        <XAxis
          dataKey="state"
          tick={{ fontSize: 10, fill: MUTED }}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          interval={0}
          height={44}
        />
        <YAxis
          yAxisId="rto"
          domain={[0, rtoYMax]}
          tickFormatter={formatRtoAxis}
          tick={{ fontSize: 10, fill: MUTED }}
          axisLine={false}
          tickLine={false}
          width={36}
          tickCount={5}
        />
        <YAxis
          yAxisId="rev"
          orientation="right"
          domain={[0, revYMax]}
          tickFormatter={formatRevAxis}
          tick={{ fontSize: 10, fill: MUTED }}
          axisLine={false}
          tickLine={false}
          width={44}
          tickCount={5}
        />
        <Tooltip content={<CustomTooltipRto />} />
        <Legend
          verticalAlign="bottom"
          height={20}
          iconSize={10}
          wrapperStyle={{ fontSize: '11px', color: MUTED }}
        />
        <ReferenceLine yAxisId="rto" y={20} stroke={NEG} strokeDasharray="4 3" strokeWidth={1.5} label={{ value: '20%', position: 'insideTopRight', fontSize: 10, fill: NEG }} />
        <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill={ACCENT} fillOpacity={0.45} radius={[3, 3, 0, 0]} maxBarSize={40} />
        <Line yAxisId="rto" type="monotone" dataKey="rto_rate" name="RTO %" stroke={NEG} strokeWidth={2} dot={{ r: 3, fill: NEG, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}


function opsPctDelta(curr: number | undefined, prev: number | undefined): number | undefined {
  if (curr === undefined || curr === null || prev === undefined || prev === null) return undefined;
  if (prev === 0) return undefined;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function OperationsPage() {
  const dispatch = useAppDispatch();
  const { logistics, kpis, prevKpis, loading, shipmentsTrend } = useAppSelector((s) => s.dashboard);
  const {
    rtoByState, geoRevenue, loadingOperations,
  } = useAppSelector((s) => s.analytics);
  const range = useAppSelector((s) => s.range);

  /* Sparkline series — daily counts from shipmentsTrend (oldest → newest). */
  const shipmentsSpark = useMemo(
    () => shipmentsTrend.map((d) => Number(d.total_shipments ?? 0)),
    [shipmentsTrend],
  );
  const rtoRateSpark = useMemo(
    () => shipmentsTrend.map((d) => {
      const t = Number(d.total_shipments ?? 0);
      return t > 0 ? (Number(d.rto ?? 0) / t) * 100 : 0;
    }),
    [shipmentsTrend],
  );
  const deliveredPctSpark = useMemo(
    () => shipmentsTrend.map((d) => {
      const t = Number(d.total_shipments ?? 0);
      return t > 0 ? (Number(d.delivered ?? 0) / t) * 100 : 0;
    }),
    [shipmentsTrend],
  );
  const ndrSpark = useMemo(
    () => shipmentsTrend.map((d) => Number(d.ndr ?? 0)),
    [shipmentsTrend],
  );
  const codMixSpark = useMemo(
    () => shipmentsTrend.map((d) => {
      const cod = Number(d.cod_orders ?? 0);
      const pre = Number(d.prepaid_orders ?? 0);
      return cod + pre > 0 ? (cod / (cod + pre)) * 100 : 0;
    }),
    [shipmentsTrend],
  );

  useEffect(() => {
    dispatch(fetchDashboard(range));
    dispatch(fetchOperationsData(range));
  }, [dispatch, range]);

  const isLoading = loading || loadingOperations;
  const deliveredCount = logistics.find((l) => l.current_status_code === 'DL')?.count ?? 0;
  const totalShipments = kpis?.totalShipments ?? 0;
  const deliveredPct   = totalShipments > 0 ? (deliveredCount / totalShipments) * 100 : 0;

  /* Previous-period derived values */
  const prevCodOrders    = prevKpis?.codOrders    ?? 0;
  const prevPrepaid      = prevKpis?.prepaidOrders ?? 0;
  const prevCodMix       = (prevCodOrders + prevPrepaid) > 0
    ? (prevCodOrders / (prevCodOrders + prevPrepaid)) * 100 : 0;
  const codOrders        = kpis?.codOrders    ?? 0;
  const prepaidOrders    = kpis?.prepaidOrders ?? 0;
  const codMix           = (codOrders + prepaidOrders) > 0
    ? (codOrders / (codOrders + prepaidOrders)) * 100 : 0;

  const hasPrevShipments = (prevKpis?.totalShipments ?? 0) > 0;
  const hasPrevCodMix    = prevCodMix > 0;
  const hasPrevNdr       = (prevKpis?.ndr ?? 0) > 0;

  const shipmentsDelta  = opsPctDelta(kpis?.totalShipments, prevKpis?.totalShipments);
  const rtoRateDelta    = opsPctDelta(kpis?.rtoRate,        prevKpis?.rtoRate);       // lower = better → invert
  const codMixDelta     = opsPctDelta(codMix,               prevCodMix);              // lower = better → invert
  const ndrDelta        = opsPctDelta(kpis?.ndr,            prevKpis?.ndr);           // lower = better → invert

  /* Contextual insight text */
  const rtoRate = kpis?.rtoRate ?? 0;

  const showPageLoader = isLoading && !kpis;

  return (
    <DrawerProvider>
      <InfoDrawer />
      {showPageLoader && <PageLoader overlay />}
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard
              label="Total Shipments"
              value={formatNum(kpis?.totalShipments)}
              delta={hasPrevShipments ? shipmentsDelta : undefined}
              sub={hasPrevShipments
                ? (shipmentsDelta !== undefined
                  ? (shipmentsDelta > 10 ? 'Volume scaling up' : shipmentsDelta < -10 ? 'Volume declined' : 'Stable volume')
                  : 'vs prior period')
                : 'dispatched this period'}
              trend={shipmentsSpark}
              loading={isLoading}
            />
            <KpiCard
              label="RTO Rate"
              value={formatPct(rtoRate)}
              delta={hasPrevShipments && rtoRateDelta !== undefined ? -rtoRateDelta : undefined}
              sub={`${formatNum(kpis?.rto ?? 0)} returns · ${rtoRate > 25 ? 'Critical — above 25%' : rtoRate > 15 ? 'High — needs action' : rtoRate > 8 ? 'Moderate' : 'Good'}`}
              trend={rtoRateSpark}
              invertDelta
              loading={isLoading}
            />
            <KpiCard
              label="COD Mix"
              value={formatPct(codMix)}
              delta={hasPrevCodMix && codMixDelta !== undefined ? -codMixDelta : undefined}
              sub={codMix > 60
                ? 'High COD — elevated RTO risk'
                : codMix > 40
                  ? 'Moderate COD exposure'
                  : 'Healthy prepaid mix'}
              trend={codMixSpark}
              invertDelta
              loading={isLoading}
            />
            <KpiCard
              label="Delivered"
              value={formatPct(deliveredPct)}
              sub={`${formatNum(deliveredCount)} delivered · ${deliveredPct > 70 ? 'Strong delivery rate' : deliveredPct > 50 ? 'Average' : 'Below target'}`}
              trend={deliveredPctSpark}
              loading={isLoading}
            />
            <KpiCard
              label="NDR Count"
              value={formatNum(kpis?.ndr ?? 0)}
              delta={hasPrevNdr && ndrDelta !== undefined ? -ndrDelta : undefined}
              sub={`pending delivery · ${(kpis?.ndr ?? 0) > 50 ? 'High — escalate' : (kpis?.ndr ?? 0) > 20 ? 'Monitor closely' : 'Under control'}`}
              trend={ndrSpark}
              invertDelta
              loading={isLoading}
            />
          </div>

          {/* Shipment Status + RTO by State */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel
              title="Shipment Status"
              subtitle="iThink · Current status breakdown"
              info={{ what: 'Distribution of all shipments by current logistics status.', source: 'iThink Logistics', readIt: 'Delivered % should be 60–70% for a healthy operations mix. High NDR indicates last-mile delivery issues.' }}
              ai={{ observation: 'Shipment status distribution reveals where bottlenecks exist in your fulfilment pipeline.', insight: 'High NDR (non-delivery report) counts usually mean incorrect addresses or customer unavailability. Pre-shipment address verification and IVR confirmation calls can cut NDR by 30–40%.', actions: ['Implement address validation at checkout using Pincode API', 'Set up automated NDR resolution flow with customer SMS', 'Monitor OFD-to-delivered conversion rate by courier'] }}
            >
              <ShipmentStatusBreakdown data={logistics} />
            </Panel>
            <Panel
              title="RTO by State"
              subtitle="iThink + Shopify · Geographic quality signal · flag states >20%"
              className="lg:col-span-2"
              info={{ what: 'RTO rate (returns / shipments) for each customer state, ranked highest first.', source: 'iThink Logistics', readIt: 'States above 25% RTO rate warrant courier reassignment or COD blocking.' }}
              ai={{ observation: 'Geographic RTO concentration reveals problem markets that inflate overall RTO rate.', insight: 'Blocking COD in the top 3 high-RTO states often reduces overall RTO by 5–8 percentage points with minimal revenue impact, since these markets have high fake-order rates.', actions: ['Block COD for pincodes with > 30% historical RTO rate', 'Switch to prepaid-only for top-3 high-RTO states as pilot', 'Run address verification IVR for all COD orders in high-risk zones'] }}
            >
              <RtoByStateChart rto={rtoByState} geo={geoRevenue} />
            </Panel>
          </div>


        </main>
      </div>
    </DrawerProvider>
  );
}
