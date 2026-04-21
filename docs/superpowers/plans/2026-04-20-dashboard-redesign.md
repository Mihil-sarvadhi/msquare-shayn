# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder dashboard cards by business priority and add a global custom date-range picker that applies consistently across all pages.

**Architecture:** A new shared `rangeSlice` holds the selected date range (preset or custom); every page and API call reads from it. On the backend, a single `resolveDateRange` util replaces the duplicated `getDateRange` function in both services, and both controllers are extended to accept `startDate`/`endDate` query params. The dashboard card layout is a pure JSX reorder in one file.

**Tech Stack:** React 19, Redux Toolkit, TypeScript 5.9, Tailwind CSS, Express, Sequelize, Zod (backend validation lives in controllers).

---

## File Map

| File | Action |
|------|--------|
| `frontend/src/pages/dashboard/page.tsx` | Edit — reorder cards, remove Header, read from rangeSlice |
| `frontend/src/pages/dashboard/components/Header.tsx` | **Delete** |
| `frontend/src/store/slices/rangeSlice.ts` | **Create** — shared preset/custom range state |
| `frontend/src/store/rootReducer.ts` | Edit — register rangeSlice |
| `frontend/src/types/dashboard.ts` | Edit — remove `range` from DashboardState |
| `frontend/src/types/analytics.ts` | Edit — remove `range` from AnalyticsState |
| `frontend/src/store/slices/dashboardSlice.ts` | Edit — remove range, thunk takes RangeState |
| `frontend/src/store/slices/analyticsSlice.ts` | Edit — remove range, thunks take RangeState |
| `frontend/src/services/dashboard/dashboard.query.ts` | Edit — useRefetchDashboard reads from rangeSlice |
| `frontend/src/utils/common-functions/buildRangeParams.ts` | **Create** — RangeState → query params |
| `frontend/src/services/dashboard/dashboard.api.ts` | Edit — accept RangeState, use buildRangeParams |
| `frontend/src/services/analytics/analytics.api.ts` | Edit — accept RangeState, use buildRangeParams |
| `frontend/src/components/layout/TopNav.tsx` | Edit — add range selector + custom date popover |
| `frontend/src/pages/analytics/AnalyticsHeader.tsx` | Edit — remove range selector, keep title/subtitle |
| `frontend/src/pages/marketing/page.tsx` | Edit — read range from rangeSlice |
| `frontend/src/pages/customers/page.tsx` | Edit — read range from rangeSlice |
| `frontend/src/pages/operations/page.tsx` | Edit — read range from rangeSlice |
| `backend/src/utils/resolveDateRange.ts` | **Create** — unified date range resolver |
| `backend/src/modules/dashboard/dashboard.service.ts` | Edit — delete getDateRange, import resolveDateRange |
| `backend/src/modules/analytics/analytics.service.ts` | Edit — delete getDateRange, import resolveDateRange |
| `backend/src/modules/dashboard/dashboard.controller.ts` | Edit — pass startDate/endDate from req.query |
| `backend/src/modules/analytics/analytics.controller.ts` | Edit — pass startDate/endDate from req.query |

---

### Task 1: Dashboard card reorder + delete sub-header

**Files:**
- Modify: `frontend/src/pages/dashboard/page.tsx`
- Delete: `frontend/src/pages/dashboard/components/Header.tsx`

- [ ] **Step 1: Delete Header.tsx**

```bash
rm /Users/apple/Documents/Projects/Shayn/frontend/src/pages/dashboard/components/Header.tsx
```

- [ ] **Step 2: Rewrite `frontend/src/pages/dashboard/page.tsx`**

Replace the entire `return` block's `<main>` content with the new card order. Also remove the `Header` import, `handleRangeChange`, `setRange` import, and the `<Header>` JSX call. The file should look like this after the edit:

```tsx
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

  useEffect(() => {
    dispatch(fetchDashboard('30d' as any));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchOperationsData('30d' as any));
  }, [dispatch]);

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
    <div className="min-h-full bg-ivory font-sans">
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-ink mb-3 text-sm uppercase tracking-wide text-muted">Revenue Trend</h3>
            <RevenueChart data={revenueTrend} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-ink mb-3 text-sm uppercase tracking-wide text-muted">Meta Ads Funnel</h3>
            <MetaFunnel data={metaFunnel} loading={loading} />
          </div>
        </div>

        {/* Row 3 — Campaigns + Order Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Meta Campaigns Performance</h3>
            <CampaignTable campaigns={campaigns} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Order Status</h3>
            <OrderStatus kpis={kpis} loading={loading} />
          </div>
        </div>

        {/* Row 4 — COD Split + Logistics + Abandoned Carts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">COD vs Prepaid</h3>
            <CODSplit kpis={kpis} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Logistics Overview</h3>
            <LogisticsSummary kpis={kpis} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Abandoned Carts</h3>
            <AbandonedCart data={abandonedCarts} loading={loading} />
          </div>
        </div>

        {/* Row 5 — Customer Metrics + Platform Orders + Top 5 Products */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Customer Metrics</h3>
            <CustomerMetrics kpis={kpis} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Orders by Platform</h3>
            <PlatformOrders kpis={kpis} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Top 5 Products</h3>
            <TopProducts products={topProducts} loading={loading} />
          </div>
        </div>

        {/* Row 6 — Reviews consolidated */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4 flex flex-col overflow-hidden h-[420px] md:h-[480px]">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3 shrink-0">Review Summary</h3>
            <ReviewsSummary data={reviewsSummary} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4 flex flex-col overflow-hidden h-[420px] md:h-[480px]">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3 shrink-0">Top Rated Products</h3>
            <TopRatedProducts products={topRatedProducts} loading={loading} />
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-parch shadow-card p-4 flex flex-col h-[420px] md:h-[480px]">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Recent Reviews</h3>
            <div className="flex-1 overflow-hidden">
              <RecentReviews reviews={recentReviews} loading={loading} />
            </div>
          </div>
        </div>

        {/* Row 7 — SKUs + Connector Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-4">Top 10 SKUs by Revenue</h3>
            <TopSkus data={topSkus} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">Connector Status</h3>
            <ConnectorStatus health={health} />
          </div>
        </div>

      </main>
    </div>
  );
}
```

Note: the `fetchDashboard('30d' as any)` and `fetchOperationsData('30d' as any)` are temporary — they'll be fixed in Task 7 when the thunk signatures are updated.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/apple/Documents/Projects/Shayn/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: warnings about `as any` — acceptable for now, fixed in Task 7.

---

### Task 2: Backend — create `resolveDateRange` util

**Files:**
- Create: `backend/src/utils/resolveDateRange.ts`

- [ ] **Step 1: Create the file**

```typescript
export interface DateRange {
  since: string;
  until: string;
}

interface DateRangeQuery {
  range?: string;
  startDate?: string;
  endDate?: string;
}

export function resolveDateRange(query: DateRangeQuery): DateRange {
  const today = new Date().toISOString().split('T')[0];

  if (query.startDate && query.endDate) {
    if (query.startDate > query.endDate) {
      throw new Error('startDate must be before or equal to endDate');
    }
    return { since: query.startDate, until: query.endDate };
  }

  const end = new Date();
  const start = new Date();
  if (query.range === '7d') {
    start.setDate(start.getDate() - 7);
  } else if (query.range === 'all') {
    return { since: '2020-01-01', until: today };
  } else {
    start.setDate(start.getDate() - 30);
  }

  return {
    since: start.toISOString().split('T')[0],
    until: today,
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/apple/Documents/Projects/Shayn/backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 3: Backend — update both services

**Files:**
- Modify: `backend/src/modules/dashboard/dashboard.service.ts`
- Modify: `backend/src/modules/analytics/analytics.service.ts`

- [ ] **Step 1: Replace `dashboard.service.ts`**

```typescript
import type { AllReviewsQuery } from './dashboard.types';
import { resolveDateRange } from '@utils/resolveDateRange';
import type { DateRange } from '@utils/resolveDateRange';
import * as repo from './dashboard.repository';

export { resolveDateRange };
export type { DateRange };

export const getKpis           = (since: string, until: string) => repo.getKpis(since, until);
export const getRevenueTrend   = (since: string, until: string) => repo.getRevenueTrend(since, until);
export const getMetaFunnel     = (since: string, until: string) => repo.getMetaFunnel(since, until);
export const getCampaigns      = (since: string, until: string) => repo.getCampaigns(since, until);
export const getTopProducts    = (since: string, until: string) => repo.getTopProducts(since, until);
export const getLogistics      = (since: string, until: string) => repo.getLogistics(since, until);
export const getAbandonedCarts = (since: string, until: string) => repo.getAbandonedCarts(since, until);
export const getReviewsSummary = (since: string, until: string) => repo.getReviewsSummary(since, until);
export const getReviewsTrend   = (since: string, until: string) => repo.getReviewsTrend(since, until);
export const getTopRatedProducts = (since: string, until: string) => repo.getTopRatedProducts(since, until);
export const getRecentReviews  = (since: string, until: string) => repo.getRecentReviews(since, until);

export function getAllReviews(query: AllReviewsQuery) {
  const page   = Math.max(1, parseInt(query.page   || '1',  10));
  const limit  = Math.min(50, Math.max(1, parseInt(query.limit  || '20', 10)));
  const rating = parseInt(query.rating || '0', 10);
  const search = (query.search || '').trim();
  return repo.getAllReviews(page, limit, rating, search);
}
```

- [ ] **Step 2: Replace `analytics.service.ts`**

```typescript
import { resolveDateRange } from '@utils/resolveDateRange';
import * as repo from './analytics.repository';

export { resolveDateRange };

export const getNetRevenue      = (s: string, u: string) => repo.getNetRevenue(s, u);
export const getRtoByState      = (s: string, u: string) => repo.getRtoByState(s, u);
export const getCodVsPrepaidRto = (s: string, u: string) => repo.getCodVsPrepaidRto(s, u);
export const getGeoRevenue      = (s: string, u: string) => repo.getGeoRevenue(s, u);
export const getLogisticsCosts  = (s: string, u: string) => repo.getLogisticsCosts(s, u);
export const getCodCashFlow     = (s: string, u: string) => repo.getCodCashFlow(s, u);
export const getCustomerOverview  = (s: string, u: string) => repo.getCustomerOverview(s, u);
export const getCustomerSegments  = (s: string, u: string) => repo.getCustomerSegments(s, u);
export const getTopCustomers    = (s: string, u: string) => repo.getTopCustomers(s, u);
export const getDiscountAnalysis = (s: string, u: string) => repo.getDiscountAnalysis(s, u);
export const getMarketingTrend  = (s: string, u: string) => repo.getMarketingTrend(s, u);
export const getAttributionGap  = (s: string, u: string) => repo.getAttributionGap(s, u);
export const getTopSkus         = (s: string, u: string) => repo.getTopSkus(s, u);
export const getMoneyStuck      = (s: string, u: string) => repo.getMoneyStuck(s, u);
export const getChannelRevenue  = (s: string, u: string) => repo.getChannelRevenue(s, u);
```

- [ ] **Step 3: Verify**

```bash
cd /Users/apple/Documents/Projects/Shayn/backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 4: Backend — update both controllers

**Files:**
- Modify: `backend/src/modules/dashboard/dashboard.controller.ts`
- Modify: `backend/src/modules/analytics/analytics.controller.ts`

- [ ] **Step 1: Replace `dashboard.controller.ts`**

The only change is replacing every `service.getDateRange((req.query as { range?: string }).range)` call with `service.resolveDateRange(req.query as { range?: string; startDate?: string; endDate?: string })`.

```typescript
import { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import * as service from './dashboard.service';
import type { AllReviewsQuery } from './dashboard.types';

type RangeQuery = { range?: string; startDate?: string; endDate?: string };

function errOpts(err: unknown) {
  return { statusCode: 500, message: (err as Error).message, error: err };
}

function resolve(req: Request) {
  return service.resolveDateRange(req.query as RangeQuery);
}

export async function kpisHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getKpis(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function revenueTrendHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getRevenueTrend(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function metaFunnelHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getMetaFunnel(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function campaignsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getCampaigns(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function topProductsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getTopProducts(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function logisticsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getLogistics(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function abandonedCartsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getAbandonedCarts(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function reviewsSummaryHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getReviewsSummary(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function reviewsTrendHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getReviewsTrend(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function topRatedProductsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getTopRatedProducts(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function recentReviewsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = resolve(req);
    handleApiResponse(res, { data: await service.getRecentReviews(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}

export async function allReviewsHandler(req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await service.getAllReviews(req.query as AllReviewsQuery) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}
```

- [ ] **Step 2: Replace `analytics.controller.ts`**

Same pattern — replace `service.getDateRange(...)` with `service.resolveDateRange(req.query as RangeQuery)`:

```typescript
import type { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import * as service from './analytics.service';

type RangeQuery = { range?: string; startDate?: string; endDate?: string };

function resolve(req: Request) {
  return service.resolveDateRange(req.query as RangeQuery);
}
function errOpts(err: unknown) {
  return { statusCode: 500, message: (err as Error).message, error: err };
}

export async function netRevenueHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getNetRevenue(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function rtoByStateHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getRtoByState(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function codVsPrepaidRtoHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getCodVsPrepaidRto(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function geoRevenueHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getGeoRevenue(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function logisticsCostsHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getLogisticsCosts(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function codCashFlowHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getCodCashFlow(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function customerOverviewHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getCustomerOverview(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function customerSegmentsHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getCustomerSegments(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function topCustomersHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getTopCustomers(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function discountAnalysisHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getDiscountAnalysis(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function marketingTrendHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getMarketingTrend(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function attributionGapHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getAttributionGap(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function topSkusHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getTopSkus(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function moneyStuckHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getMoneyStuck(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function channelRevenueHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = resolve(req); handleApiResponse(res, { data: await service.getChannelRevenue(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
```

- [ ] **Step 3: Verify backend compiles**

```bash
cd /Users/apple/Documents/Projects/Shayn/backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

---

### Task 5: Frontend — create `rangeSlice` + update types + register

**Files:**
- Create: `frontend/src/store/slices/rangeSlice.ts`
- Modify: `frontend/src/types/dashboard.ts` (remove `range`)
- Modify: `frontend/src/types/analytics.ts` (remove `range`)
- Modify: `frontend/src/store/rootReducer.ts`

- [ ] **Step 1: Create `frontend/src/store/slices/rangeSlice.ts`**

```typescript
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface RangeState {
  preset: '7d' | '30d' | 'custom';
  startDate: string;
  endDate: string;
}

const initialState: RangeState = { preset: '30d', startDate: '', endDate: '' };

const rangeSlice = createSlice({
  name: 'range',
  initialState,
  reducers: {
    setPreset(state, action: PayloadAction<'7d' | '30d'>) {
      state.preset = action.payload;
      state.startDate = '';
      state.endDate = '';
    },
    setCustomRange(state, action: PayloadAction<{ startDate: string; endDate: string }>) {
      state.preset = 'custom';
      state.startDate = action.payload.startDate;
      state.endDate = action.payload.endDate;
    },
  },
});

export const { setPreset, setCustomRange } = rangeSlice.actions;
export default rangeSlice.reducer;
```

- [ ] **Step 2: Remove `range` from `DashboardState` in `frontend/src/types/dashboard.ts`**

Find the `DashboardState` interface and remove the `range: string;` line:

```typescript
export interface DashboardState {
  kpis: KPIs | null;
  revenueTrend: RevenueTrendItem[];
  metaFunnel: MetaFunnel | null;
  campaigns: Campaign[];
  topProducts: Product[];
  logistics: LogisticsItem[];
  abandonedCarts: AbandonedCarts | null;
  health: ConnectorHealth[];
  reviewsSummary: ReviewsSummary | null;
  topRatedProducts: TopRatedProduct[];
  recentReviews: RecentReview[];
  loading: boolean;
  error: string | null;
}
```

- [ ] **Step 3: Remove `range` from `AnalyticsState` in `frontend/src/types/analytics.ts`**

Read the file first, then remove the `range: string;` field from `AnalyticsState`. Keep all other fields exactly as they are.

- [ ] **Step 4: Register `rangeSlice` in `frontend/src/store/rootReducer.ts`**

```typescript
import { combineReducers } from '@reduxjs/toolkit';
import dashboardReducer from './slices/dashboardSlice';
import analyticsReducer from './slices/analyticsSlice';
import rangeReducer from './slices/rangeSlice';

const rootReducer = combineReducers({
  dashboard: dashboardReducer,
  analytics: analyticsReducer,
  range: rangeReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/apple/Documents/Projects/Shayn/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors in slices/pages that still reference `s.dashboard.range` or `s.analytics.range` — those are expected and will be fixed in upcoming tasks.

---

### Task 6: Frontend — create `buildRangeParams` utility

**Files:**
- Create: `frontend/src/utils/common-functions/buildRangeParams.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { RangeState } from '@store/slices/rangeSlice';

export function buildRangeParams(range: RangeState): Record<string, string> {
  if (range.preset === 'custom') {
    return { startDate: range.startDate, endDate: range.endDate };
  }
  return { range: range.preset };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/apple/Documents/Projects/Shayn/frontend && npx tsc --noEmit 2>&1 | grep buildRangeParams
```

Expected: no errors for this file.

---

### Task 7: Frontend — update `dashboardSlice` + `analyticsSlice`

**Files:**
- Modify: `frontend/src/store/slices/dashboardSlice.ts`
- Modify: `frontend/src/store/slices/analyticsSlice.ts`

- [ ] **Step 1: Replace `frontend/src/store/slices/dashboardSlice.ts`**

```typescript
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchAllDashboard } from '@services/dashboard/dashboard.api';
import type { DashboardState } from '@app/types/dashboard';
import type { RangeState } from './rangeSlice';

const initialState: DashboardState = {
  kpis: null, revenueTrend: [], metaFunnel: null, campaigns: [],
  topProducts: [], logistics: [], abandonedCarts: null, health: [],
  reviewsSummary: null, topRatedProducts: [], recentReviews: [],
  loading: false, error: null,
};

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchAll',
  async (range: RangeState) => fetchAllDashboard(range)
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDashboard.fulfilled, (state, action) => { Object.assign(state, action.payload); state.loading = false; })
      .addCase(fetchDashboard.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Failed to load dashboard'; });
  },
});

export default dashboardSlice.reducer;
```

- [ ] **Step 2: Replace `frontend/src/store/slices/analyticsSlice.ts`**

```typescript
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchOperations, fetchCustomers, fetchMarketing } from '@services/analytics/analytics.api';
import type { AnalyticsState } from '@app/types/analytics';
import type { RangeState } from './rangeSlice';

const initialState: AnalyticsState = {
  netRevenue: null, rtoByState: [], codVsPrepaidRto: [], geoRevenue: [],
  logisticsCosts: null, codCashFlow: null,
  customerOverview: null, customerSegments: [], topCustomers: [], discountAnalysis: [],
  marketingTrend: [], attributionGap: null, topSkus: [], moneyStuck: null, channelRevenue: null,
  loadingOperations: false, loadingCustomers: false, loadingMarketing: false, error: null,
};

export const fetchOperationsData = createAsyncThunk(
  'analytics/fetchOperations',
  async (range: RangeState) => fetchOperations(range)
);

export const fetchCustomersData = createAsyncThunk(
  'analytics/fetchCustomers',
  async (range: RangeState) => fetchCustomers(range)
);

export const fetchMarketingData = createAsyncThunk(
  'analytics/fetchMarketing',
  async (range: RangeState) => fetchMarketing(range)
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOperationsData.pending,   (s) => { s.loadingOperations = true;  s.error = null; })
      .addCase(fetchOperationsData.fulfilled, (s, a) => { Object.assign(s, a.payload); s.loadingOperations = false; })
      .addCase(fetchOperationsData.rejected,  (s, a) => { s.loadingOperations = false; s.error = a.error.message ?? 'Failed'; })
      .addCase(fetchCustomersData.pending,    (s) => { s.loadingCustomers = true;   s.error = null; })
      .addCase(fetchCustomersData.fulfilled,  (s, a) => { Object.assign(s, a.payload); s.loadingCustomers = false; })
      .addCase(fetchCustomersData.rejected,   (s, a) => { s.loadingCustomers = false;  s.error = a.error.message ?? 'Failed'; })
      .addCase(fetchMarketingData.pending,    (s) => { s.loadingMarketing = true;   s.error = null; })
      .addCase(fetchMarketingData.fulfilled,  (s, a) => { Object.assign(s, a.payload); s.loadingMarketing = false; })
      .addCase(fetchMarketingData.rejected,   (s, a) => { s.loadingMarketing = false;  s.error = a.error.message ?? 'Failed'; });
  },
});

export default analyticsSlice.reducer;
```

- [ ] **Step 3: Update `frontend/src/services/dashboard/dashboard.query.ts`**

Change `useRefetchDashboard` to read from `s.range` (rangeSlice) instead of `s.dashboard.range`:

```typescript
import { useMutation } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchDashboard } from '@store/slices/dashboardSlice';
import baseService from '@services/configs/baseService';
import { toast } from '@/components/ui/toast';

function useRefetchDashboard() {
  const dispatch = useAppDispatch();
  const range = useAppSelector((s) => s.range);
  return () => { dispatch(fetchDashboard(range)); };
}

function triggerSync(connector: string) {
  return baseService.post(`/sync/${connector}`).then((r) => r.data);
}

export function useSyncShopify() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('shopify'),
    onSuccess: () => { toast.success('Shopify sync triggered'); refetch(); },
    onError: () => { toast.error('Failed to trigger Shopify sync'); },
  });
}

export function useSyncMeta() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('meta'),
    onSuccess: () => { toast.success('Meta sync triggered'); refetch(); },
    onError: () => { toast.error('Failed to trigger Meta sync'); },
  });
}

export function useSyncIthink() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('ithink'),
    onSuccess: () => { toast.success('iThink sync triggered'); refetch(); },
    onError: () => { toast.error('Failed to trigger iThink sync'); },
  });
}

export function useSyncJudgeme() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('judgeme'),
    onSuccess: () => { toast.success('Judge.me sync triggered'); refetch(); },
    onError: () => { toast.error('Failed to trigger Judge.me sync'); },
  });
}

export function useSyncAll() {
  const refetch = useRefetchDashboard();
  return useMutation({
    mutationFn: () => triggerSync('all'),
    onSuccess: (res: unknown) => {
      const data = res as { results?: Record<string, string> } | undefined;
      const failed = Object.values(data?.results ?? {}).filter((v) => v !== 'ok').length;
      if (failed === 0) {
        toast.success('All connectors synced successfully');
      } else {
        toast.warning(`Sync done — ${failed} connector(s) had errors`);
      }
      refetch();
    },
    onError: () => { toast.error('Full sync failed'); },
  });
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/apple/Documents/Projects/Shayn/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only in api files and page files (not yet updated).

---

### Task 8: Frontend — update API services

**Files:**
- Modify: `frontend/src/services/dashboard/dashboard.api.ts`
- Modify: `frontend/src/services/analytics/analytics.api.ts`

- [ ] **Step 1: Replace `frontend/src/services/dashboard/dashboard.api.ts`**

```typescript
import baseService from '@services/configs/baseService';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import type { RangeState } from '@store/slices/rangeSlice';
import type {
  KPIs, RevenueTrendItem, MetaFunnel, Campaign, Product,
  LogisticsItem, AbandonedCarts, ConnectorHealth,
  ReviewsSummary, TopRatedProduct, RecentReview,
} from '@app/types/dashboard';

const get = <T>(url: string, params?: Record<string, string>) =>
  baseService.get<{ data: T }>(url, { params }).then((r) => r.data.data);

const safe = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);

export async function fetchAllDashboard(range: RangeState) {
  const params = buildRangeParams(range);
  const [kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics, abandonedCarts,
    health, reviewsSummary, topRatedProducts, recentReviews] = await Promise.all([
    get<KPIs>('/dashboard/kpis', params),
    get<RevenueTrendItem[]>('/dashboard/revenue-trend', params),
    get<MetaFunnel>('/dashboard/meta-funnel', params),
    get<Campaign[]>('/dashboard/campaigns', params),
    get<Product[]>('/dashboard/top-products', params),
    get<LogisticsItem[]>('/dashboard/logistics', params),
    get<AbandonedCarts>('/dashboard/abandoned-carts', params),
    get<ConnectorHealth[]>('/health'),
    safe(get<ReviewsSummary>('/dashboard/reviews-summary', params), null as unknown as ReviewsSummary),
    safe(get<TopRatedProduct[]>('/dashboard/top-rated-products', params), []),
    safe(get<RecentReview[]>('/dashboard/recent-reviews', params), []),
  ]);
  return {
    kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics,
    abandonedCarts, health, reviewsSummary, topRatedProducts, recentReviews,
  };
}
```

- [ ] **Step 2: Replace `frontend/src/services/analytics/analytics.api.ts`**

```typescript
import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import { buildRangeParams } from '@utils/common-functions/buildRangeParams';
import type { RangeState } from '@store/slices/rangeSlice';
import type {
  NetRevenue, RtoByStateItem, CodVsPrepaidItem, GeoRevenueItem,
  LogisticsCosts, CodCashFlow, CustomerOverview, CustomerSegmentItem,
  TopCustomerItem, DiscountItem, MarketingTrendItem, AttributionGap, TopSkuItem,
  MoneyStuck, ChannelRevenue,
} from '@app/types/analytics';

const get = <T>(url: string, params: Record<string, string>) =>
  baseService.get<{ data: T }>(url, { params }).then((r) => r.data.data);

export async function fetchOperations(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.analytics;
  const [netRevenue, rtoByState, codVsPrepaidRto, geoRevenue, logisticsCosts, codCashFlow, topSkus, moneyStuck] =
    await Promise.all([
      get<NetRevenue>(e.netRevenue, params),
      get<RtoByStateItem[]>(e.rtoByState, params),
      get<CodVsPrepaidItem[]>(e.codVsPrepaidRto, params),
      get<GeoRevenueItem[]>(e.geoRevenue, params),
      get<LogisticsCosts>(e.logisticsCosts, params),
      get<CodCashFlow>(e.codCashFlow, params),
      get<TopSkuItem[]>(e.topSkus, params),
      get<MoneyStuck>(e.moneyStuck, params),
    ]);
  return { netRevenue, rtoByState, codVsPrepaidRto, geoRevenue, logisticsCosts, codCashFlow, topSkus, moneyStuck };
}

export async function fetchCustomers(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.analytics;
  const [customerOverviewRaw, customerSegments, topCustomers, discountAnalysis] = await Promise.all([
    get<CustomerOverview>(e.customerOverview, params),
    get<CustomerSegmentItem[]>(e.customerSegments, params),
    get<TopCustomerItem[]>(e.topCustomers, params),
    get<DiscountItem[]>(e.discountAnalysis, params),
  ]);
  const customerOverview: CustomerOverview = {
    total_customers:     Number(customerOverviewRaw.total_customers ?? 0),
    new_customers:       Number(customerOverviewRaw.new_customers ?? 0),
    returning_customers: Number(customerOverviewRaw.returning_customers ?? 0),
    repeat_rate:         Number(customerOverviewRaw.repeat_rate ?? 0),
  };
  return { customerOverview, customerSegments, topCustomers, discountAnalysis };
}

export async function fetchMarketing(range: RangeState) {
  const params = buildRangeParams(range);
  const e = API_ENDPOINTS.analytics;
  const [marketingTrend, attributionGapRaw, channelRevenueRaw] = await Promise.all([
    get<MarketingTrendItem[]>(e.marketingTrend, params),
    get<{ meta_purchases: number; shopify_orders: number }>(e.attributionGap, params),
    get<{ shopify_revenue: number; meta_revenue: number; organic_revenue: number }>(e.channelRevenue, params),
  ]);
  const meta    = Number(attributionGapRaw.meta_purchases ?? 0);
  const shopify = Number(attributionGapRaw.shopify_orders ?? 0);
  const attributionGap: AttributionGap = {
    meta_purchases: meta,
    shopify_orders: shopify,
    attribution_rate: shopify > 0 ? Math.round((meta / shopify) * 100) : 0,
    gap: meta - shopify,
  };
  const channelRevenue: ChannelRevenue = {
    shopify_revenue: Number(channelRevenueRaw.shopify_revenue ?? 0),
    meta_revenue:    Number(channelRevenueRaw.meta_revenue ?? 0),
    organic_revenue: Number(channelRevenueRaw.organic_revenue ?? 0),
  };
  return { marketingTrend, attributionGap, channelRevenue };
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/apple/Documents/Projects/Shayn/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only in page files and TopNav (not yet updated).

---

### Task 9: Frontend — update `TopNav.tsx` with range selector

**Files:**
- Modify: `frontend/src/components/layout/TopNav.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { RefreshCw, CalendarDays } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setPreset, setCustomRange } from '@store/slices/rangeSlice';
import { useSyncAll } from '@services/dashboard/dashboard.query';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard',  to: '/dashboard'  },
  { label: 'Marketing',  to: '/marketing'  },
  { label: 'Customers',  to: '/customers'  },
  { label: 'Operations', to: '/operations' },
  { label: 'Reviews',    to: '/reviews'    },
];

const DOT_COLOR: Record<string, string> = {
  green: 'bg-[#2D7D46]',
  amber: 'bg-[#B45309]',
  red:   'bg-[#9B2235]',
};

export function TopNav() {
  const dispatch   = useAppDispatch();
  const health     = useAppSelector((s) => s.dashboard.health);
  const range      = useAppSelector((s) => s.range);
  const syncAll    = useSyncAll();

  const [tooltip,    setTooltip]    = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [localStart, setLocalStart] = useState('');
  const [localEnd,   setLocalEnd]   = useState('');

  const handlePreset = useCallback((p: '7d' | '30d') => {
    dispatch(setPreset(p));
    setShowPicker(false);
  }, [dispatch]);

  const handleApply = useCallback(() => {
    dispatch(setCustomRange({ startDate: localStart, endDate: localEnd }));
    setShowPicker(false);
  }, [dispatch, localStart, localEnd]);

  const customLabel = range.preset === 'custom'
    ? `${range.startDate} → ${range.endDate}`
    : 'Custom';

  return (
    <header className="bg-white border-b border-[#F0EBE0] px-4 sm:px-6 flex items-center gap-4 h-[52px] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#B8860B]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[#B8860B] font-bold text-[14px] tracking-wider">SHAYN</span>
          <span className="text-[10px] text-[#8C7B64] uppercase tracking-widest">MIS</span>
        </div>
      </div>

      {/* Nav tabs */}
      <nav className="flex items-stretch gap-1 flex-1 overflow-x-auto h-full">
        {NAV.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors h-full',
                isActive
                  ? 'border-[#B8860B] text-[#1A1208] font-semibold'
                  : 'border-transparent text-[#8C7B64] hover:text-[#1A1208]'
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right — range selector + health dots + sync */}
      <div className="flex items-center gap-3 ml-auto shrink-0">

        {/* Range selector */}
        <div className="flex gap-1 bg-[#F5F0E8] rounded-lg p-1">
          {(['7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                range.preset === p
                  ? 'bg-white text-[#1A1208] shadow-sm font-semibold'
                  : 'text-[#8C7B64] hover:text-[#1A1208]'
              )}
            >
              {p === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}

          {/* Custom date button + popover */}
          <div className="relative">
            <button
              onClick={() => setShowPicker((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                range.preset === 'custom'
                  ? 'bg-[#B8860B] text-white font-semibold'
                  : 'text-[#8C7B64] hover:text-[#1A1208]'
              )}
            >
              <CalendarDays size={11} strokeWidth={2} />
              {customLabel}
            </button>

            {showPicker && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-[#E8E0D0] rounded-xl shadow-xl p-4 z-50 w-64">
                <p className="text-[10px] font-bold text-[#8C7B64] uppercase tracking-wider mb-3">
                  Select date range
                </p>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-[#8C7B64] font-semibold block mb-1">From</label>
                    <input
                      type="date"
                      value={localStart}
                      onChange={(e) => setLocalStart(e.target.value)}
                      className="w-full border border-[#E8E0D0] rounded-lg px-2 py-1.5 text-xs text-[#1A1208] bg-[#FDFAF4] focus:outline-none focus:border-[#B8860B]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-[#8C7B64] font-semibold block mb-1">To</label>
                    <input
                      type="date"
                      value={localEnd}
                      onChange={(e) => setLocalEnd(e.target.value)}
                      className="w-full border border-[#E8E0D0] rounded-lg px-2 py-1.5 text-xs text-[#1A1208] bg-[#FDFAF4] focus:outline-none focus:border-[#B8860B]"
                    />
                  </div>
                </div>
                <button
                  onClick={handleApply}
                  disabled={!localStart || !localEnd || localStart > localEnd}
                  className="w-full bg-[#B8860B] text-white rounded-lg py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#B8860B]/90 transition-all"
                >
                  Apply Range
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Health dots */}
        <div className="hidden sm:flex items-center gap-3">
          {health.map((h) => (
            <div
              key={h.connector_name}
              className="relative flex items-center gap-1 cursor-pointer"
              onMouseEnter={() => setTooltip(h.connector_name)}
              onMouseLeave={() => setTooltip(null)}
            >
              <span className={cn('w-2 h-2 rounded-full', DOT_COLOR[h.status] ?? 'bg-gray-400')} />
              <span className="text-xs text-[#8C7B64] capitalize">{h.connector_name.replace(/_/g, ' ')}</span>
              {tooltip === h.connector_name && (
                <div className="absolute top-6 right-0 bg-[#1A1208] text-white text-xs rounded px-2 py-1 w-48 z-10">
                  {h.error_message
                    ? h.error_message
                    : h.last_sync_at
                    ? `Last sync: ${new Date(h.last_sync_at).toLocaleTimeString()}`
                    : 'Never synced'}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sync All */}
        <button
          onClick={() => syncAll.mutate()}
          disabled={syncAll.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B8860B] text-white hover:bg-[#B8860B]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw size={12} strokeWidth={2} className={syncAll.isPending ? 'animate-spin' : ''} />
          {syncAll.isPending ? 'Syncing…' : 'Sync All'}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/apple/Documents/Projects/Shayn/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only in page files (not yet updated).

---

### Task 10: Frontend — update `AnalyticsHeader.tsx`

**Files:**
- Modify: `frontend/src/pages/analytics/AnalyticsHeader.tsx`

- [ ] **Step 1: Replace the file — remove range selector, keep title/subtitle**

```tsx
interface AnalyticsHeaderProps {
  title: string;
  subtitle: string;
}

export function AnalyticsHeader({ title, subtitle }: AnalyticsHeaderProps) {
  return (
    <div className="px-4 sm:px-6 py-4 border-b border-parch bg-white sticky top-0 z-10">
      <h1 className="text-lg font-bold text-ink">{title}</h1>
      <p className="text-xs text-muted mt-0.5">{subtitle}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/apple/Documents/Projects/Shayn/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors only in page files.

---

### Task 11: Frontend — update all pages to use `rangeSlice`

**Files:**
- Modify: `frontend/src/pages/dashboard/page.tsx`
- Modify: `frontend/src/pages/marketing/page.tsx`
- Modify: `frontend/src/pages/customers/page.tsx`
- Modify: `frontend/src/pages/operations/page.tsx`

- [ ] **Step 1: Fix `DashboardPage` — remove `as any`, use rangeSlice**

In `frontend/src/pages/dashboard/page.tsx`, update the `useAppSelector` and `useEffect` calls:

```tsx
// Replace these two lines (currently using 'as any'):
//   const { kpis, ... } = useAppSelector((s) => s.dashboard);
//   const range = ... (doesn't exist yet)
//   useEffect(() => { dispatch(fetchDashboard('30d' as any)); }, [dispatch]);
//   useEffect(() => { dispatch(fetchOperationsData('30d' as any)); }, [dispatch]);

// With:
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
```

The rest of the file (JSX layout) stays exactly as written in Task 1.

- [ ] **Step 2: Replace `frontend/src/pages/marketing/page.tsx`**

```tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchMarketingData } from '@store/slices/analyticsSlice';
import { AnalyticsHeader } from '../analytics/AnalyticsHeader';
import { MarketingKPIs }   from './components/MarketingKPIs';
import { RoasTrend }       from './components/RoasTrend';
import { CppTrend }        from './components/CppTrend';
import { AttributionGap }  from './components/AttributionGap';
import { CtrTrend }        from './components/CtrTrend';
import { ChannelRevenue }  from './components/ChannelRevenue';

export function MarketingPage() {
  const dispatch = useAppDispatch();
  const { marketingTrend, attributionGap, channelRevenue, loadingMarketing } =
    useAppSelector((s) => s.analytics);
  const range = useAppSelector((s) => s.range);

  useEffect(() => {
    dispatch(fetchMarketingData(range));
  }, [dispatch, range]);

  const L = loadingMarketing;

  return (
    <div className="min-h-full bg-ivory font-sans">
      <AnalyticsHeader
        title="Marketing"
        subtitle="ROAS trends, attribution gap, and campaign efficiency"
      />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
        <MarketingKPIs trend={marketingTrend} attribution={attributionGap} loading={L} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Revenue by Channel</h3>
            <ChannelRevenue data={channelRevenue} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">ROAS Trend</h3>
            <RoasTrend data={marketingTrend} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Cost Per Purchase Trend</h3>
            <CppTrend data={marketingTrend} loading={L} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Meta vs Shopify Attribution</h3>
            <AttributionGap data={attributionGap} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">CTR Trend</h3>
            <CtrTrend data={marketingTrend} loading={L} />
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Replace `frontend/src/pages/customers/page.tsx`**

```tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchCustomersData } from '@store/slices/analyticsSlice';
import { AnalyticsHeader }     from '../analytics/AnalyticsHeader';
import { CustomerOverviewRow } from './components/CustomerOverviewRow';
import { NewVsReturning }      from './components/NewVsReturning';
import { CustomerSegments }    from './components/CustomerSegments';
import { TopCustomers }        from './components/TopCustomers';
import { DiscountAnalysis }    from './components/DiscountAnalysis';

export function CustomersPage() {
  const dispatch = useAppDispatch();
  const { customerOverview, customerSegments, topCustomers, discountAnalysis, loadingCustomers } =
    useAppSelector((s) => s.analytics);
  const range = useAppSelector((s) => s.range);

  useEffect(() => {
    dispatch(fetchCustomersData(range));
  }, [dispatch, range]);

  const L = loadingCustomers;

  return (
    <div className="min-h-full bg-ivory font-sans">
      <AnalyticsHeader
        title="Customers"
        subtitle="New vs returning, LTV segments, and discount impact"
      />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
        <CustomerOverviewRow data={customerOverview} loading={L} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">New vs Returning</h3>
            <NewVsReturning data={customerOverview} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Customer LTV Segments</h3>
            <CustomerSegments data={customerSegments} loading={L} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-parch shadow-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Top 10 Customers</h3>
          <TopCustomers data={topCustomers} loading={L} />
        </div>
        <div className="bg-white rounded-xl border border-parch shadow-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Discount Code Analysis</h3>
          <DiscountAnalysis data={discountAnalysis} loading={L} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Replace `frontend/src/pages/operations/page.tsx`**

```tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchOperationsData } from '@store/slices/analyticsSlice';
import { AnalyticsHeader }    from '../analytics/AnalyticsHeader';
import { NetRevenueRow }      from './components/NetRevenueRow';
import { RtoByState }         from './components/RtoByState';
import { CodVsPrepaidRto }    from './components/CodVsPrepaidRto';
import { GeoRevenue }         from './components/GeoRevenue';
import { LogisticsCostDonut } from './components/LogisticsCostDonut';
import { CodCashFlow }        from './components/CodCashFlow';
import { MoneyStuck }         from './components/MoneyStuck';

export function OperationsPage() {
  const dispatch = useAppDispatch();
  const { netRevenue, rtoByState, codVsPrepaidRto, geoRevenue, logisticsCosts, codCashFlow, moneyStuck, loadingOperations } =
    useAppSelector((s) => s.analytics);
  const range = useAppSelector((s) => s.range);

  useEffect(() => {
    dispatch(fetchOperationsData(range));
  }, [dispatch, range]);

  const L = loadingOperations;

  return (
    <div className="min-h-full bg-ivory font-sans">
      <AnalyticsHeader
        title="Operations"
        subtitle="Logistics costs, RTO analysis, and COD cash flow"
      />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
        <NetRevenueRow data={netRevenue} loading={L} />
        <div className="bg-white rounded-xl border border-ruby/20 shadow-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ruby mb-4 flex items-center gap-1.5">
            <span>⚠</span> Where Your Money Is Getting Stuck
          </h3>
          <MoneyStuck data={moneyStuck} loading={L} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">RTO by State</h3>
            <RtoByState data={rtoByState} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">COD vs Prepaid RTO</h3>
            <CodVsPrepaidRto data={codVsPrepaidRto} loading={L} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Revenue by State (Top 10)</h3>
            <GeoRevenue data={geoRevenue} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Logistics Cost Breakdown</h3>
            <LogisticsCostDonut data={logisticsCosts} loading={L} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-parch shadow-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">COD Cash Flow (Last 30 Days)</h3>
          <CodCashFlow data={codCashFlow} loading={L} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Full TypeScript check — must be clean**

```bash
cd /Users/apple/Documents/Projects/Shayn/frontend && npx tsc --noEmit 2>&1
```

Expected: **zero errors**. Fix any remaining errors before proceeding.

---

### Task 12: Lint + build both workspaces

- [ ] **Step 1: Frontend lint**

```bash
cd /Users/apple/Documents/Projects/Shayn/frontend && npm run lint
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 2: Frontend build**

```bash
cd /Users/apple/Documents/Projects/Shayn/frontend && npm run build
```

Expected: build completes successfully.

- [ ] **Step 3: Backend typecheck**

```bash
cd /Users/apple/Documents/Projects/Shayn/backend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Backend lint**

```bash
cd /Users/apple/Documents/Projects/Shayn/backend && npm run lint
```

Expected: 0 warnings, 0 errors.
