import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchDashboard } from '@store/slices/dashboardSlice';
import { fetchCustomersData } from '@store/slices/analyticsSlice';
import { DrawerProvider } from '@components/shared/DrawerContext';
import { InfoDrawer } from '@components/shared/InfoDrawer';
import { Panel } from '@components/shared/Panel';
import { KpiCard } from '@components/shared/KpiCard';
import { CustomTooltip } from '@components/shared/CustomTooltip';
import { PageLoader } from '@components/shared/PageLoader';
import { formatINR, formatNum, formatPct } from '@utils/formatters';
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { CustomerOverview, CustomerSegmentItem, TopCustomerItem, GeoRevenueItem } from '@app/types/analytics';
import type { TopRatedProduct } from '@app/types/dashboard';

import { ACCENT, POS, MUTED } from '@utils/constants/palette';

function CustomerSegmentsChart({ data }: { data: CustomerSegmentItem[] }) {
  return (
    <div className="h-full min-h-[180px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} height={22} />
        <YAxis
          tickFormatter={(v: number) => formatNum(v)}
          tick={{ fontSize: 11, fill: MUTED }}
          axisLine={false}
          tickLine={false}
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
          allowDataOverflow={false}
          allowDecimals={false}
          padding={{ top: 0, bottom: 0 }}
        />
        <Tooltip content={<CustomTooltip formatter={(v) => formatNum(v)} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="count" name="Customers" fill={ACCENT} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}

function NewVsReturningChart({ data }: { data: CustomerOverview | null }) {
  if (!data) return <div className="h-44 flex items-center justify-center text-[var(--text-subtle)] text-sm">No data</div>;
  const bars = [
    { name: 'New', value: data.new_customers, fill: ACCENT },
    { name: 'Returning', value: data.returning_customers, fill: POS },
  ];
  return (
    <div className="h-full min-h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} height={22} />
          <YAxis
            tickFormatter={(v: number) => formatNum(v)}
            tick={{ fontSize: 11, fill: MUTED }}
            axisLine={false}
            tickLine={false}
            domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
            allowDataOverflow={false}
            allowDecimals={false}
            padding={{ top: 0, bottom: 0 }}
          />
          <Tooltip content={<CustomTooltip formatter={(v) => formatNum(v)} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="value" name="Customers" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {bars.map((b, i) => <Cell key={i} fill={b.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GeoStateTick(props: { x?: number; y?: number; payload?: { value: string } }) {
  const { x = 0, y = 0, payload } = props;
  const label = payload?.value ?? '';
  const words = label.split(' ');
  const lines = words.length > 2
    ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')]
    : words.length === 2
      ? words
      : [label];
  return (
    <g transform={`translate(${x},${y + 6})`}>
      {lines.map((line, i) => (
        <text key={i} x={0} y={i * 13} textAnchor="middle" fill={MUTED} fontSize={10}>
          {line}
        </text>
      ))}
    </g>
  );
}

function niceYMax(rawMax: number): number {
  const padded = rawMax * 1.15;
  const magnitude = Math.pow(10, Math.floor(Math.log10(padded)));
  const step = magnitude >= 100000 ? 50000 : magnitude >= 10000 ? 10000 : magnitude >= 1000 ? 1000 : 500;
  return Math.ceil(padded / step) * step;
}

function GeoRevenueChart({ data }: { data: GeoRevenueItem[] }) {
  if (!data.length) return (
    <div className="h-52 flex items-center justify-center text-[var(--text-subtle)] text-sm">No data</div>
  );
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 0);
  const yMax = niceYMax(maxRevenue);
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 24, right: 16, left: 4, bottom: 40 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="2 3" stroke="var(--line)" vertical={false} />
        <XAxis dataKey="state" tickLine={false} axisLine={false} interval={0} tick={<GeoStateTick />} />
        <YAxis
          tickFormatter={(v: number) => formatINR(v)}
          tick={{ fontSize: 10, fill: MUTED }}
          axisLine={false}
          tickLine={false}
          width={52}
          domain={[0, yMax]}
          allowDataOverflow={false}
        />
        <Tooltip content={<CustomTooltip formatter={(v) => formatINR(v)} />} />
        <Bar dataKey="revenue" name="Revenue" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}


function TopCustomersTable({ data }: { data: TopCustomerItem[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {['Customer', 'Location', 'Orders', 'Total Spent', 'Last Order'].map((h) => (
              <th key={h} className="text-left py-2 pr-3 text-[var(--text-muted)] font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.customer_id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
              <td className="py-2 pr-3">
                <p className="font-medium text-[var(--text)]">{c.name ?? 'Guest'}</p>
                <p className="text-[var(--text-subtle)]">{c.email}</p>
              </td>
              <td className="py-2 pr-3 text-[var(--text-muted)]">{c.city}, {c.state}</td>
              <td className="py-2 pr-3 text-[var(--text-muted)]">{formatNum(c.orders_count)}</td>
              <td className="py-2 pr-3 font-medium text-[var(--accent)]">{formatINR(c.total_spent)}</td>
              <td className="py-2 text-[var(--text-subtle)]">{c.last_order_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopRatedTable({ data }: { data: TopRatedProduct[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {['Product', 'Rating', 'Reviews'].map((h) => (
              <th key={h} className="text-left py-2 pr-3 text-[var(--text-muted)] font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 8).map((p) => (
            <tr key={p.product_id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
              <td className="py-2 pr-3 text-[var(--text)] max-w-[200px] truncate">{p.title}</td>
              <td className="py-2 pr-3">
                <span className="font-semibold text-[var(--warn)]">★ {Number(p.average_rating).toFixed(1)}</span>
              </td>
              <td className="py-2 text-[var(--text-muted)]">{formatNum(p.reviews_count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



function custPctDelta(curr: number | undefined, prev: number | undefined): number | undefined {
  if (curr === undefined || curr === null || prev === undefined || prev === null) return undefined;
  if (prev === 0) return undefined;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function CustomersPage() {
  const dispatch = useAppDispatch();
  const { reviewsSummary, topRatedProducts, kpis, prevKpis, loading } = useAppSelector((s) => s.dashboard);
  const {
    customerOverview, customerSegments, topCustomers, geoRevenue,
    loadingCustomers,
  } = useAppSelector((s) => s.analytics);
  const range = useAppSelector((s) => s.range);

  useEffect(() => {
    dispatch(fetchDashboard(range));
    dispatch(fetchCustomersData(range));
  }, [dispatch, range]);

  const isLoading = loading || loadingCustomers;

  /* Deltas — only customer total + repeat rate available from prevKpis */
  const hasPrevCust    = (prevKpis?.customers   ?? 0) > 0;
  const totalCustDelta = custPctDelta(kpis?.customers, prevKpis?.customers);

  /* Contextual insights */
  const repeatRate   = customerOverview?.repeat_rate  ?? 0;
  const newPct       = customerOverview && customerOverview.total_customers > 0
    ? (customerOverview.new_customers / customerOverview.total_customers) * 100 : 0;
  const returningPct = customerOverview && customerOverview.total_customers > 0
    ? (customerOverview.returning_customers / customerOverview.total_customers) * 100 : 0;
  const storeRating  = Number(reviewsSummary?.store_rating ?? 0);

  const showPageLoader = isLoading && !customerOverview;

  return (
    <DrawerProvider>
      <InfoDrawer />
      {showPageLoader && <PageLoader overlay />}
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard
              label="Total Customers"
              value={formatNum(customerOverview?.total_customers)}
              delta={hasPrevCust ? totalCustDelta : undefined}
              sub={hasPrevCust
                ? (totalCustDelta !== undefined
                  ? (totalCustDelta > 0 ? 'Growing customer base' : 'Fewer customers this period')
                  : 'vs prior period')
                : 'unique buyers this period'}
              loading={isLoading}
            />
            <KpiCard
              label="New Customers"
              value={formatNum(customerOverview?.new_customers)}
              sub={newPct > 60
                ? `${newPct.toFixed(0)}% of buyers — acquisition heavy`
                : newPct > 30
                  ? `${newPct.toFixed(0)}% of buyers`
                  : `${newPct.toFixed(0)}% of buyers — retention strong`}
              loading={isLoading}
            />
            <KpiCard
              label="Returning Customers"
              value={formatNum(customerOverview?.returning_customers)}
              sub={returningPct > 40
                ? `${returningPct.toFixed(0)}% — strong loyalty`
                : `${returningPct.toFixed(0)}% repeat visitors`}
              loading={isLoading}
            />
            <KpiCard
              label="Repeat Rate"
              value={formatPct(repeatRate)}
              sub={repeatRate >= 30
                ? 'Strong — above D2C benchmark'
                : repeatRate >= 15
                  ? 'Average — room to grow'
                  : 'Below benchmark — focus retention'}
              loading={isLoading}
            />
            <KpiCard
              label="Store Rating"
              value={`★ ${storeRating.toFixed(1)}`}
              sub={storeRating >= 4.5
                ? `${formatNum(reviewsSummary?.total_reviews ?? 0)} reviews · Excellent`
                : storeRating >= 4.0
                  ? `${formatNum(reviewsSummary?.total_reviews ?? 0)} reviews · Good`
                  : `${formatNum(reviewsSummary?.total_reviews ?? 0)} reviews · Needs work`}
              loading={isLoading}
            />
          </div>

          {/* Segments + New vs Returning + Top Rated Products */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Panel
              title="Customer Segments"
              subtitle="Buyers by order frequency"
              info={{ what: 'Customers grouped by total number of orders placed in the selected period.', source: 'Shopify Orders', readIt: 'A healthy brand sees growing 2–3 order and 4+ order buckets over time — signal of repeat purchase habits forming.' }}
              ai={{ observation: 'Most customers are one-time buyers — the classic D2C retention challenge.', insight: 'Moving customers from 1 order to 2+ orders is the highest-leverage retention play. A second purchase signals product satisfaction and dramatically increases LTV.', metrics: [{ label: 'Total Customers', value: formatNum(customerOverview?.total_customers) }, { label: 'Repeat Rate', value: formatPct(customerOverview?.repeat_rate) }], actions: ['Launch post-purchase email series targeting 1-order customers', 'Offer 10% loyalty discount for second purchase within 60 days', 'Build a replenishment reminder for consumable products'] }}
            >
              <CustomerSegmentsChart data={customerSegments} />
            </Panel>
            <Panel
              title="New vs Returning"
              subtitle="Customer mix this period"
              info={{ what: 'Comparison of new customers (first ever order) vs returning customers in the period.', source: 'Shopify Orders' }}
              ai={{ observation: 'New customer acquisition is healthy but retention drives long-term profitability.', insight: `Repeat rate of ${formatPct(customerOverview?.repeat_rate)} ${(customerOverview?.repeat_rate ?? 0) > 30 ? 'is strong for D2C' : 'is below the 30% D2C benchmark'}. Each returning customer costs ~10× less to serve than acquiring a new one.`, actions: ['Set retention target: 35% repeat rate in 90 days', 'Implement loyalty programme with points per purchase', 'Segment email list: send win-back campaign to lapsed 90+ day buyers'] }}
            >
              <NewVsReturningChart data={customerOverview} />
            </Panel>
            <Panel
              title="Top Rated Products"
              subtitle="Highest average ratings"
              info={{ what: 'Products with the highest average customer rating.', source: 'Judge.me Reviews', readIt: 'Products with 4.5★+ and 10+ reviews are reliable candidates for ad creative and bundles.' }}
              ai={{ observation: "Top-rated products are underutilised in marketing — they are the brand's social proof anchors.", insight: 'Feature your highest-rated products in Meta creatives, email headers, and homepage hero sections. Review velocity on these products directly supports search ranking on marketplaces.', actions: ['Use top-rated product reviews as ad testimonials', 'Bundle high-rated products with newer launches to drive trial', 'Create a "Best Reviewed" collection page for organic SEO'] }}
            >
              <TopRatedTable data={topRatedProducts} />
            </Panel>
          </div>

          {/* Top Customers Table */}
          <Panel
            title="Top Customers"
            subtitle="Highest lifetime value buyers this period"
            info={{ what: 'Top 10 customers by total revenue in the selected period.', source: 'Shopify Orders' }}
            ai={{ observation: 'Top customers are disproportionately valuable and deserve white-glove treatment.', insight: 'Your top 10 customers likely represent 5–10% of total revenue. Direct outreach, exclusive previews, and personalised gifting for this segment delivers outsized retention ROI.', actions: ['Create a VIP segment for top 50 lifetime customers', 'Send handwritten thank-you notes to top 10 buyers', 'Offer exclusive early access to new collections for VIP customers'] }}
          >
            <TopCustomersTable data={topCustomers} />
          </Panel>

          <Panel
            title="Geographic Revenue"
            subtitle="Revenue by state — all regions"
            info={{ what: 'Revenue contribution by customer state for the selected period.', source: 'Shopify Orders', readIt: 'Top 3 states typically contribute 40–60% of D2C revenue for India-focused brands.' }}
            ai={{ observation: 'Geographic concentration in top states presents both opportunity and risk.', insight: 'Heavy concentration in 1–2 states means brand reach is still limited. Geo-targeted campaigns in underserved states typically have lower CPAs due to less competition.', actions: ['Run geo-targeted Meta campaigns in top 5 underserved states', 'Partner with regional influencers in high-potential states', 'Analyse pincode-level RTO rates to identify high-risk zones'] }}
          >
            <GeoRevenueChart data={geoRevenue} />
          </Panel>

        </main>
      </div>
    </DrawerProvider>
  );
}
