import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchDashboard } from '@store/slices/dashboardSlice';
import { fetchOperationsData } from '@store/slices/analyticsSlice';
import KPICard from './components/KPICard';
import RevenueChart from './components/RevenueChart';
import MetaFunnel from './components/MetaFunnel';
import OrderStatus from './components/OrderStatus';
import CODSplit from './components/CODSplit';
import LogisticsSummary from './components/LogisticsSummary';
import TopProducts from './components/TopProducts';
import AbandonedCart from './components/AbandonedCart';
import CampaignTable from './components/CampaignTable';
import CustomerMetrics from './components/CustomerMetrics';
import PlatformOrders from './components/PlatformOrders';
import ConnectorStatus from './components/ConnectorStatus';
import ReviewsSummary from './components/ReviewsSummary';
import TopRatedProducts from './components/TopRatedProducts';
import RecentReviews from './components/RecentReviews';
import { TopSkus } from './components/TopSkus';
import { formatINR, formatNum, formatPct } from '@utils/formatters';
import { IndianRupee, ShoppingCart, Receipt, Megaphone, TrendingUp, PackageX } from 'lucide-react';

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { kpis, revenueTrend, metaFunnel, campaigns, topProducts,
    abandonedCarts, health, reviewsSummary, topRatedProducts, recentReviews,
    loading, error } = useAppSelector((s) => s.dashboard);
  const { topSkus } = useAppSelector((s) => s.analytics);
  const range = useAppSelector((s) => s.range);

  useEffect(() => {
    dispatch(fetchDashboard(range));
  }, [dispatch, range]);

  useEffect(() => {
    dispatch(fetchOperationsData(range));
  }, [dispatch, range]);

  if (error) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="bg-white rounded-xl border border-ruby/30 p-8 text-center max-w-md">
          <p className="text-ruby font-semibold mb-2">Connection Error</p>
          <p className="text-muted text-sm">{error}</p>
          <p className="text-xs text-muted mt-3">Make sure the backend is running on port 4000</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory font-sans">
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-30 space-y-4">

        {/* Row 1 — KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-20 animate-pulse border border-parch" />
            ))
          ) : (
            <>
              <KPICard label="Total Revenue"   value={formatINR(kpis?.revenue)}  accent="#B8860B" icon={IndianRupee} />
              <KPICard label="Total Orders"    value={formatNum(kpis?.orders)}   accent="#2D7D46" icon={ShoppingCart} />
              <KPICard label="Avg Order Value" value={formatINR(kpis?.aov)}      accent="#B8860B" icon={Receipt} />
              <KPICard label="Ad Spend"        value={formatINR(kpis?.adSpend)}  accent="#9B2235" icon={Megaphone} />
              <KPICard label="ROAS"            value={`${parseFloat(String(kpis?.roas || 0)).toFixed(2)}x`} accent="#2D7D46" icon={TrendingUp} />
              <KPICard label="RTO Rate"        value={formatPct(kpis?.rtoRate)}  accent={(kpis?.rtoRate ?? 0) > 20 ? '#9B2235' : '#2D7D46'} icon={PackageX} />
            </>
          )}
        </div>

        {/* Row 2 — Revenue Trend + Meta Funnel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          <div className="md:col-span-2 bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-ink mb-3 text-sm uppercase tracking-wide text-muted">Revenue Trend</h3>
            <RevenueChart data={revenueTrend} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-ink mb-3 text-sm uppercase tracking-wide text-muted">Meta Ads Funnel</h3>
            <MetaFunnel data={metaFunnel} loading={loading} />
          </div>
        </div>

        {/* Row 3 — Campaigns (scrollable, capped) + Order Status + Connector Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Campaign table — flex col so inner scroll works; capped at 520px */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-parch shadow-card p-4 flex flex-col"
            style={{ maxHeight: 390 }}>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3 shrink-0">
              Meta Campaigns Performance
            </h3>
            <CampaignTable campaigns={campaigns} loading={loading} />
          </div>

          {/* Right column — Order Status on top, COD vs Prepaid fills remainder */}
          <div className="flex flex-col gap-4" style={{ maxHeight: 380 }}>
            <div className="bg-white rounded-xl border border-parch shadow-card p-4 shrink-0">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Order Status</h3>
              <OrderStatus kpis={kpis} loading={loading} />
            </div>
            <div className="bg-white rounded-xl border border-parch shadow-card p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">COD vs Prepaid</h3>
              <CODSplit kpis={kpis} loading={loading} />
            </div>
          </div>
        </div>

        {/* Row 4 — Compact metric strip: Connector Status | Logistics | Abandoned Carts | Customer Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Connector Status</h3>
            <ConnectorStatus health={health} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Logistics Overview</h3>
            <LogisticsSummary kpis={kpis} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Abandoned Carts</h3>
            <AbandonedCart data={abandonedCarts} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Customer Metrics</h3>
            <CustomerMetrics kpis={kpis} />
          </div>
        </div>

        {/* Row 5 — Orders by Platform + Top Rated Products + Top 5 Products */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Orders by Platform</h3>
            <PlatformOrders kpis={kpis} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4 flex flex-col overflow-hidden">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3 shrink-0">Top Rated Products</h3>
            <TopRatedProducts products={topRatedProducts} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Top 5 Products</h3>
            <TopProducts products={topProducts} loading={loading} />
          </div>
        </div>

        {/* Row 6 — Top SKUs full width */}
        <div className="bg-white rounded-xl border border-parch shadow-card p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-4">Top 10 SKUs by Revenue</h3>
          <TopSkus data={topSkus} loading={loading} />
        </div>

        {/* Row 7 — Review Summary + Recent Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4 flex flex-col">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3 shrink-0">Review Summary</h3>
            <ReviewsSummary data={reviewsSummary} loading={loading} />
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Recent Reviews</h3>
            <RecentReviews reviews={recentReviews} loading={loading} />
          </div>
        </div>


      </main>
    </div>
  );
}
