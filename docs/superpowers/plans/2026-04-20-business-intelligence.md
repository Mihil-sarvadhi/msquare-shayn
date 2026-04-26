# Business Intelligence Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible sidebar navigation and 3 new analytics pages (Operations, Customers, Marketing) surfacing actionable business intelligence from existing DB tables.

**Architecture:** New `analytics` backend module (routes→controller→service→repository) with 12 SQL queries. Frontend gets a Sidebar component, `analyticsSlice`, and 3 new pages with Recharts visualisations. All data from existing tables — no new API calls.

**Tech Stack:** PostgreSQL · Sequelize raw queries · Express · React 19 · Redux Toolkit · Recharts · Tailwind CSS · Lucide React

---

## File Map

**Create (backend):**
- `backend/src/modules/analytics/analytics.types.ts`
- `backend/src/modules/analytics/analytics.repository.ts`
- `backend/src/modules/analytics/analytics.service.ts`
- `backend/src/modules/analytics/analytics.controller.ts`
- `backend/src/modules/analytics/analytics.routes.ts`

**Modify (backend):**
- `backend/src/routes/index.ts` — register `/analytics` router

**Create (frontend):**
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/types/analytics.ts`
- `frontend/src/store/slices/analyticsSlice.ts`
- `frontend/src/services/analytics/analytics.api.ts`
- `frontend/src/pages/operations/page.tsx` + 6 components
- `frontend/src/pages/customers/page.tsx` + 6 components
- `frontend/src/pages/marketing/page.tsx` + 6 components

**Modify (frontend):**
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/App.tsx`
- `frontend/src/store/rootReducer.ts`
- `frontend/src/utils/constants/api.constant.ts`

---

## Task 1: Backend — analytics.types.ts

**Files:**
- Create: `backend/src/modules/analytics/analytics.types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// backend/src/modules/analytics/analytics.types.ts
export interface NetRevenueRow {
  gross_revenue: string;
  logistics_cost: string;
  rto_waste: string;
}

export interface RtoByStateRow {
  state: string;
  total: string;
  rto_count: string;
  rto_rate: string;
}

export interface CodVsPrepaidRow {
  payment_mode: string;
  total: string;
  rto_count: string;
  rto_rate: string;
}

export interface GeoRevenueRow {
  state: string;
  revenue: string;
  orders: string;
}

export interface LogisticsCostsRow {
  fwd: string;
  rto: string;
  cod: string;
  gst: string;
  total: string;
}

export interface CodCashFlowRow {
  cod_generated: string;
  cod_remitted: string;
  pending: string;
}

export interface CustomerOverviewRow {
  total_customers: string;
  new_customers: string;
}

export interface CustomerSegmentRow {
  bucket: string;
  count: string;
}

export interface TopCustomerRow {
  customer_id: string;
  email: string;
  city: string;
  state: string;
  orders_count: string;
  total_spent: string;
  last_order_date: string;
}

export interface DiscountRow {
  discount_code: string;
  orders: string;
  revenue: string;
  aov: string;
  pct_of_total: string;
}

export interface MarketingTrendRow {
  date: string;
  spend: string;
  purchases: string;
  purchase_value: string;
  roas: string;
  ctr: string;
  cpp: string;
}

export interface AttributionGapRow {
  meta_purchases: string;
  shopify_orders: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/analytics/analytics.types.ts
git commit -m "feat(analytics): add backend type definitions"
```

---

## Task 2: Backend — analytics.repository.ts

**Files:**
- Create: `backend/src/modules/analytics/analytics.repository.ts`

- [ ] **Step 1: Create the repository**

```typescript
// backend/src/modules/analytics/analytics.repository.ts
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import type {
  NetRevenueRow, RtoByStateRow, CodVsPrepaidRow, GeoRevenueRow,
  LogisticsCostsRow, CodCashFlowRow, CustomerOverviewRow,
  CustomerSegmentRow, TopCustomerRow, DiscountRow,
  MarketingTrendRow, AttributionGapRow,
} from './analytics.types';

export async function getNetRevenue(since: string, until: string) {
  const [shopify] = await sequelize.query<{ gross_revenue: string }>(
    `SELECT COALESCE(SUM(revenue), 0) AS gross_revenue
     FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until AND financial_status != 'voided'`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
  const [ithink] = await sequelize.query<{ logistics_cost: string; rto_waste: string }>(
    `SELECT
       COALESCE(SUM(billed_total), 0) AS logistics_cost,
       COALESCE(SUM(CASE WHEN current_status_code LIKE 'RT%'
         THEN billed_fwd_charges + billed_rto_charges ELSE 0 END), 0) AS rto_waste
     FROM ithink_shipments WHERE order_date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
  const gross = parseFloat(shopify?.gross_revenue ?? '0');
  const logistics = parseFloat(ithink?.logistics_cost ?? '0');
  const rtoWaste = parseFloat(ithink?.rto_waste ?? '0');
  return { gross_revenue: gross, logistics_cost: logistics, net_revenue: gross - logistics, rto_waste: rtoWaste };
}

export async function getRtoByState(since: string, until: string): Promise<RtoByStateRow[]> {
  return sequelize.query<RtoByStateRow>(
    `SELECT customer_state AS state, COUNT(*) AS total,
       SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END) AS rto_count,
       ROUND(100.0 * SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END)
         / NULLIF(COUNT(*), 0), 1) AS rto_rate
     FROM ithink_shipments
     WHERE order_date BETWEEN :since AND :until
       AND customer_state IS NOT NULL AND customer_state != ''
     GROUP BY customer_state
     ORDER BY rto_count DESC LIMIT 12`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
}

export async function getCodVsPrepaidRto(since: string, until: string): Promise<CodVsPrepaidRow[]> {
  return sequelize.query<CodVsPrepaidRow>(
    `SELECT payment_mode, COUNT(*) AS total,
       SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END) AS rto_count,
       ROUND(100.0 * SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END)
         / NULLIF(COUNT(*), 0), 1) AS rto_rate
     FROM ithink_shipments
     WHERE order_date BETWEEN :since AND :until
       AND payment_mode IN ('COD', 'Prepaid')
     GROUP BY payment_mode`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
}

export async function getGeoRevenue(since: string, until: string): Promise<GeoRevenueRow[]> {
  return sequelize.query<GeoRevenueRow>(
    `SELECT customer_state AS state, COALESCE(SUM(revenue), 0) AS revenue, COUNT(*) AS orders
     FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until AND financial_status != 'voided'
       AND customer_state IS NOT NULL AND customer_state != ''
     GROUP BY customer_state ORDER BY revenue DESC LIMIT 10`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
}

export async function getLogisticsCosts(since: string, until: string): Promise<LogisticsCostsRow> {
  const [row] = await sequelize.query<LogisticsCostsRow>(
    `SELECT COALESCE(SUM(billed_fwd_charges), 0) AS fwd,
            COALESCE(SUM(billed_rto_charges), 0) AS rto,
            COALESCE(SUM(billed_cod_charges), 0) AS cod,
            COALESCE(SUM(billed_gst_charges), 0) AS gst,
            COALESCE(SUM(billed_total), 0) AS total
     FROM ithink_shipments WHERE order_date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
  return row;
}

export async function getCodCashFlow(): Promise<CodCashFlowRow> {
  const [row] = await sequelize.query<CodCashFlowRow>(
    `SELECT COALESCE(SUM(cod_generated), 0) AS cod_generated,
            COALESCE(SUM(cod_remitted), 0) AS cod_remitted,
            COALESCE(SUM(cod_generated - cod_remitted), 0) AS pending
     FROM ithink_remittance
     WHERE remittance_date >= NOW() - INTERVAL '30 days'`,
    { type: QueryTypes.SELECT }
  );
  return row;
}

export async function getCustomerOverview(since: string, until: string): Promise<CustomerOverviewRow> {
  const [row] = await sequelize.query<CustomerOverviewRow>(
    `SELECT
       COUNT(DISTINCT o.customer_id) AS total_customers,
       COUNT(DISTINCT CASE WHEN fo.min_date BETWEEN :since AND :until
         THEN o.customer_id END) AS new_customers
     FROM shopify_orders o
     JOIN (
       SELECT customer_id, MIN(created_at::date) AS min_date
       FROM shopify_orders WHERE financial_status != 'voided' AND customer_id IS NOT NULL
       GROUP BY customer_id
     ) fo ON fo.customer_id = o.customer_id
     WHERE o.created_at::date BETWEEN :since AND :until
       AND o.financial_status != 'voided' AND o.customer_id IS NOT NULL`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
  return row;
}

export async function getCustomerSegments(): Promise<CustomerSegmentRow[]> {
  return sequelize.query<CustomerSegmentRow>(
    `SELECT
       CASE WHEN orders_count = 1 THEN '1 order'
            WHEN orders_count BETWEEN 2 AND 3 THEN '2–3 orders'
            WHEN orders_count BETWEEN 4 AND 5 THEN '4–5 orders'
            ELSE '6+ orders' END AS bucket,
       MIN(orders_count) AS sort_key,
       COUNT(*) AS count
     FROM shopify_customers WHERE orders_count > 0
     GROUP BY 1 ORDER BY MIN(orders_count)`,
    { type: QueryTypes.SELECT }
  );
}

export async function getTopCustomers(since: string, until: string): Promise<TopCustomerRow[]> {
  return sequelize.query<TopCustomerRow>(
    `SELECT sc.customer_id, sc.email, sc.city, sc.state,
            sc.orders_count, sc.total_spent::text AS total_spent,
            MAX(o.created_at)::date AS last_order_date
     FROM shopify_customers sc
     JOIN shopify_orders o ON o.customer_id = sc.customer_id
     WHERE o.created_at::date BETWEEN :since AND :until AND o.financial_status != 'voided'
     GROUP BY sc.customer_id, sc.email, sc.city, sc.state, sc.orders_count, sc.total_spent
     ORDER BY sc.total_spent DESC LIMIT 10`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
}

export async function getDiscountAnalysis(since: string, until: string): Promise<DiscountRow[]> {
  return sequelize.query<DiscountRow>(
    `SELECT COALESCE(NULLIF(discount_code, ''), 'No Discount') AS discount_code,
            COUNT(*) AS orders,
            COALESCE(SUM(revenue), 0) AS revenue,
            COALESCE(AVG(revenue), 0) AS aov,
            ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct_of_total
     FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until AND financial_status != 'voided'
     GROUP BY 1 ORDER BY orders DESC LIMIT 20`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
}

export async function getMarketingTrend(since: string, until: string): Promise<MarketingTrendRow[]> {
  return sequelize.query<MarketingTrendRow>(
    `SELECT date,
            SUM(spend) AS spend, SUM(purchases) AS purchases,
            SUM(purchase_value) AS purchase_value,
            CASE WHEN SUM(spend) > 0
              THEN ROUND((SUM(purchase_value) / SUM(spend))::numeric, 2) ELSE 0 END AS roas,
            ROUND(AVG(ctr)::numeric, 2) AS ctr,
            CASE WHEN SUM(purchases) > 0
              THEN ROUND((SUM(spend) / SUM(purchases))::numeric, 2) ELSE 0 END AS cpp
     FROM meta_daily_insights WHERE date BETWEEN :since AND :until
     GROUP BY date ORDER BY date ASC`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
}

export async function getAttributionGap(since: string, until: string): Promise<AttributionGapRow> {
  const [meta] = await sequelize.query<{ meta_purchases: string }>(
    `SELECT COALESCE(SUM(purchases), 0) AS meta_purchases
     FROM meta_daily_insights WHERE date BETWEEN :since AND :until`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
  const [shopify] = await sequelize.query<{ shopify_orders: string }>(
    `SELECT COUNT(*) AS shopify_orders FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until AND financial_status != 'voided'`,
    { type: QueryTypes.SELECT, replacements: { since, until } }
  );
  return { meta_purchases: meta?.meta_purchases ?? '0', shopify_orders: shopify?.shopify_orders ?? '0' };
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/analytics/analytics.repository.ts
git commit -m "feat(analytics): add analytics repository with 12 SQL queries"
```

---

## Task 3: Backend — service, controller, routes, register

**Files:**
- Create: `backend/src/modules/analytics/analytics.service.ts`
- Create: `backend/src/modules/analytics/analytics.controller.ts`
- Create: `backend/src/modules/analytics/analytics.routes.ts`
- Modify: `backend/src/routes/index.ts`

- [ ] **Step 1: Create analytics.service.ts**

```typescript
// backend/src/modules/analytics/analytics.service.ts
import * as repo from './analytics.repository';

export function getDateRange(range?: string): { since: string; until: string } {
  const end = new Date();
  const start = new Date();
  if (range === '7d') start.setDate(start.getDate() - 7);
  else if (range === 'mtd') start.setDate(1);
  else start.setDate(start.getDate() - 30);
  return {
    since: start.toISOString().split('T')[0],
    until: end.toISOString().split('T')[0],
  };
}

export const getNetRevenue = (s: string, u: string) => repo.getNetRevenue(s, u);
export const getRtoByState = (s: string, u: string) => repo.getRtoByState(s, u);
export const getCodVsPrepaidRto = (s: string, u: string) => repo.getCodVsPrepaidRto(s, u);
export const getGeoRevenue = (s: string, u: string) => repo.getGeoRevenue(s, u);
export const getLogisticsCosts = (s: string, u: string) => repo.getLogisticsCosts(s, u);
export const getCodCashFlow = () => repo.getCodCashFlow();
export const getCustomerOverview = (s: string, u: string) => repo.getCustomerOverview(s, u);
export const getCustomerSegments = () => repo.getCustomerSegments();
export const getTopCustomers = (s: string, u: string) => repo.getTopCustomers(s, u);
export const getDiscountAnalysis = (s: string, u: string) => repo.getDiscountAnalysis(s, u);
export const getMarketingTrend = (s: string, u: string) => repo.getMarketingTrend(s, u);
export const getAttributionGap = (s: string, u: string) => repo.getAttributionGap(s, u);
```

- [ ] **Step 2: Create analytics.controller.ts**

```typescript
// backend/src/modules/analytics/analytics.controller.ts
import type { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import * as service from './analytics.service';

function range(req: Request) {
  return service.getDateRange((req.query as { range?: string }).range);
}
function errOpts(err: unknown) {
  return { statusCode: 500, message: (err as Error).message, error: err };
}

export async function netRevenueHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = range(req); handleApiResponse(res, { data: await service.getNetRevenue(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function rtoByStateHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = range(req); handleApiResponse(res, { data: await service.getRtoByState(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function codVsPrepaidRtoHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = range(req); handleApiResponse(res, { data: await service.getCodVsPrepaidRto(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function geoRevenueHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = range(req); handleApiResponse(res, { data: await service.getGeoRevenue(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function logisticsCostsHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = range(req); handleApiResponse(res, { data: await service.getLogisticsCosts(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function codCashFlowHandler(_req: Request, res: Response): Promise<void> {
  try { handleApiResponse(res, { data: await service.getCodCashFlow() }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function customerOverviewHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = range(req); handleApiResponse(res, { data: await service.getCustomerOverview(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function customerSegmentsHandler(_req: Request, res: Response): Promise<void> {
  try { handleApiResponse(res, { data: await service.getCustomerSegments() }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function topCustomersHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = range(req); handleApiResponse(res, { data: await service.getTopCustomers(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function discountAnalysisHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = range(req); handleApiResponse(res, { data: await service.getDiscountAnalysis(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function marketingTrendHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = range(req); handleApiResponse(res, { data: await service.getMarketingTrend(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
export async function attributionGapHandler(req: Request, res: Response): Promise<void> {
  try { const { since, until } = range(req); handleApiResponse(res, { data: await service.getAttributionGap(since, until) }); }
  catch (err) { handleErrorResponse(res, errOpts(err)); }
}
```

- [ ] **Step 3: Create analytics.routes.ts**

```typescript
// backend/src/modules/analytics/analytics.routes.ts
import { Router } from 'express';
import * as c from './analytics.controller';

const router = Router();

router.get('/net-revenue', c.netRevenueHandler);
router.get('/rto-by-state', c.rtoByStateHandler);
router.get('/cod-vs-prepaid-rto', c.codVsPrepaidRtoHandler);
router.get('/geo-revenue', c.geoRevenueHandler);
router.get('/logistics-costs', c.logisticsCostsHandler);
router.get('/cod-cashflow', c.codCashFlowHandler);
router.get('/customer-overview', c.customerOverviewHandler);
router.get('/customer-segments', c.customerSegmentsHandler);
router.get('/top-customers', c.topCustomersHandler);
router.get('/discount-analysis', c.discountAnalysisHandler);
router.get('/marketing-trend', c.marketingTrendHandler);
router.get('/attribution-gap', c.attributionGapHandler);

export default router;
```

- [ ] **Step 4: Register in backend/src/routes/index.ts**

Replace the file content with:
```typescript
import { Router } from 'express';
import express from 'express';
import dashboardRoutes from '@modules/dashboard/dashboard.routes';
import healthRoutes from '@modules/health/health.routes';
import syncRoutes from '@modules/sync/sync.routes';
import webhookRoutes from '@modules/webhook/webhook.routes';
import analyticsRoutes from '@modules/analytics/analytics.routes';

export const router = Router();

router.use('/dashboard', dashboardRoutes);
router.use('/health', healthRoutes);
router.use('/sync', syncRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/webhooks/shopify', express.raw({ type: 'application/json' }), webhookRoutes);
```

- [ ] **Step 5: Typecheck backend**

```bash
cd backend && npm run typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/analytics/ backend/src/routes/index.ts
git commit -m "feat(analytics): add analytics backend module (service, controller, routes)"
```

---

## Task 4: Frontend — types, API constants, analytics.api.ts

**Files:**
- Create: `frontend/src/types/analytics.ts`
- Modify: `frontend/src/utils/constants/api.constant.ts`
- Create: `frontend/src/services/analytics/analytics.api.ts`

- [ ] **Step 1: Create frontend/src/types/analytics.ts**

```typescript
// frontend/src/types/analytics.ts

export interface NetRevenue {
  gross_revenue: number;
  logistics_cost: number;
  net_revenue: number;
  rto_waste: number;
}

export interface RtoByStateItem {
  state: string;
  total: number;
  rto_count: number;
  rto_rate: number;
}

export interface CodVsPrepaidItem {
  payment_mode: string;
  total: number;
  rto_count: number;
  rto_rate: number;
}

export interface GeoRevenueItem {
  state: string;
  revenue: number;
  orders: number;
}

export interface LogisticsCosts {
  fwd: number;
  rto: number;
  cod: number;
  gst: number;
  total: number;
}

export interface CodCashFlow {
  cod_generated: number;
  cod_remitted: number;
  pending: number;
}

export interface CustomerOverview {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  repeat_rate: number;
}

export interface CustomerSegmentItem {
  bucket: string;
  count: number;
}

export interface TopCustomerItem {
  customer_id: string;
  email: string;
  city: string;
  state: string;
  orders_count: number;
  total_spent: number;
  last_order_date: string;
}

export interface DiscountItem {
  discount_code: string;
  orders: number;
  revenue: number;
  aov: number;
  pct_of_total: number;
}

export interface MarketingTrendItem {
  date: string;
  spend: number;
  purchases: number;
  purchase_value: number;
  roas: number;
  ctr: number;
  cpp: number;
}

export interface AttributionGap {
  meta_purchases: number;
  shopify_orders: number;
  attribution_rate: number;
  gap: number;
}

export interface AnalyticsState {
  range: string;
  // Operations
  netRevenue: NetRevenue | null;
  rtoByState: RtoByStateItem[];
  codVsPrepaidRto: CodVsPrepaidItem[];
  geoRevenue: GeoRevenueItem[];
  logisticsCosts: LogisticsCosts | null;
  codCashFlow: CodCashFlow | null;
  // Customers
  customerOverview: CustomerOverview | null;
  customerSegments: CustomerSegmentItem[];
  topCustomers: TopCustomerItem[];
  discountAnalysis: DiscountItem[];
  // Marketing
  marketingTrend: MarketingTrendItem[];
  attributionGap: AttributionGap | null;
  // Shared
  loadingOperations: boolean;
  loadingCustomers: boolean;
  loadingMarketing: boolean;
  error: string | null;
}
```

- [ ] **Step 2: Add analytics endpoints to api.constant.ts**

Replace the file content with:
```typescript
export const API_ENDPOINTS = {
  dashboard: {
    kpis: '/dashboard/kpis',
    revenueTrend: '/dashboard/revenue-trend',
    metaFunnel: '/dashboard/meta-funnel',
    campaigns: '/dashboard/campaigns',
    topProducts: '/dashboard/top-products',
    logistics: '/dashboard/logistics',
    abandonedCarts: '/dashboard/abandoned-carts',
    reviewsSummary: '/dashboard/reviews-summary',
    topRatedProducts: '/dashboard/top-rated-products',
    recentReviews: '/dashboard/recent-reviews',
    allReviews: '/dashboard/all-reviews',
  },
  analytics: {
    netRevenue: '/analytics/net-revenue',
    rtoByState: '/analytics/rto-by-state',
    codVsPrepaidRto: '/analytics/cod-vs-prepaid-rto',
    geoRevenue: '/analytics/geo-revenue',
    logisticsCosts: '/analytics/logistics-costs',
    codCashFlow: '/analytics/cod-cashflow',
    customerOverview: '/analytics/customer-overview',
    customerSegments: '/analytics/customer-segments',
    topCustomers: '/analytics/top-customers',
    discountAnalysis: '/analytics/discount-analysis',
    marketingTrend: '/analytics/marketing-trend',
    attributionGap: '/analytics/attribution-gap',
  },
  health: '/health',
  sync: {
    shopify: '/sync/shopify',
    meta: '/sync/meta',
    ithink: '/sync/ithink',
  },
} as const;
```

- [ ] **Step 3: Create frontend/src/services/analytics/analytics.api.ts**

```typescript
// frontend/src/services/analytics/analytics.api.ts
import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import type {
  NetRevenue, RtoByStateItem, CodVsPrepaidItem, GeoRevenueItem,
  LogisticsCosts, CodCashFlow, CustomerOverview, CustomerSegmentItem,
  TopCustomerItem, DiscountItem, MarketingTrendItem, AttributionGap,
} from '@app/types/analytics';

const get = <T>(url: string, range: string) =>
  baseService.get<{ data: T }>(url, { params: { range } }).then((r) => r.data.data);

export async function fetchOperations(range: string) {
  const e = API_ENDPOINTS.analytics;
  const [netRevenue, rtoByState, codVsPrepaidRto, geoRevenue, logisticsCosts, codCashFlow] =
    await Promise.all([
      get<NetRevenue>(e.netRevenue, range),
      get<RtoByStateItem[]>(e.rtoByState, range),
      get<CodVsPrepaidItem[]>(e.codVsPrepaidRto, range),
      get<GeoRevenueItem[]>(e.geoRevenue, range),
      get<LogisticsCosts>(e.logisticsCosts, range),
      get<CodCashFlow>(e.codCashFlow, range),
    ]);
  return { netRevenue, rtoByState, codVsPrepaidRto, geoRevenue, logisticsCosts, codCashFlow };
}

export async function fetchCustomers(range: string) {
  const e = API_ENDPOINTS.analytics;
  const [customerOverview, customerSegments, topCustomers, discountAnalysis] = await Promise.all([
    get<CustomerOverview>(e.customerOverview, range),
    get<CustomerSegmentItem[]>(e.customerSegments, range),
    get<TopCustomerItem[]>(e.topCustomers, range),
    get<DiscountItem[]>(e.discountAnalysis, range),
  ]);
  return { customerOverview, customerSegments, topCustomers, discountAnalysis };
}

export async function fetchMarketing(range: string) {
  const e = API_ENDPOINTS.analytics;
  const [marketingTrend, attributionGapRaw] = await Promise.all([
    get<MarketingTrendItem[]>(e.marketingTrend, range),
    get<{ meta_purchases: number; shopify_orders: number }>(e.attributionGap, range),
  ]);
  const meta = attributionGapRaw.meta_purchases ?? 0;
  const shopify = attributionGapRaw.shopify_orders ?? 0;
  const attributionGap: AttributionGap = {
    meta_purchases: meta,
    shopify_orders: shopify,
    attribution_rate: shopify > 0 ? Math.round((meta / shopify) * 100) : 0,
    gap: meta - shopify,
  };
  return { marketingTrend, attributionGap };
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/analytics.ts frontend/src/utils/constants/api.constant.ts frontend/src/services/analytics/analytics.api.ts
git commit -m "feat(analytics): add frontend types, API constants, and API service"
```

---

## Task 5: Frontend — analyticsSlice + rootReducer

**Files:**
- Create: `frontend/src/store/slices/analyticsSlice.ts`
- Modify: `frontend/src/store/rootReducer.ts`

- [ ] **Step 1: Create analyticsSlice.ts**

```typescript
// frontend/src/store/slices/analyticsSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchOperations, fetchCustomers, fetchMarketing } from '@services/analytics/analytics.api';
import type { AnalyticsState } from '@app/types/analytics';

const initialState: AnalyticsState = {
  range: '30d',
  netRevenue: null, rtoByState: [], codVsPrepaidRto: [], geoRevenue: [],
  logisticsCosts: null, codCashFlow: null,
  customerOverview: null, customerSegments: [], topCustomers: [], discountAnalysis: [],
  marketingTrend: [], attributionGap: null,
  loadingOperations: false, loadingCustomers: false, loadingMarketing: false, error: null,
};

export const fetchOperationsData = createAsyncThunk(
  'analytics/fetchOperations',
  async (range: string) => fetchOperations(range)
);

export const fetchCustomersData = createAsyncThunk(
  'analytics/fetchCustomers',
  async (range: string) => fetchCustomers(range)
);

export const fetchMarketingData = createAsyncThunk(
  'analytics/fetchMarketing',
  async (range: string) => fetchMarketing(range)
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setAnalyticsRange(state, action: PayloadAction<string>) {
      state.range = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOperationsData.pending, (s) => { s.loadingOperations = true; s.error = null; })
      .addCase(fetchOperationsData.fulfilled, (s, a) => { Object.assign(s, a.payload); s.loadingOperations = false; })
      .addCase(fetchOperationsData.rejected, (s, a) => { s.loadingOperations = false; s.error = a.error.message ?? 'Failed'; })
      .addCase(fetchCustomersData.pending, (s) => { s.loadingCustomers = true; s.error = null; })
      .addCase(fetchCustomersData.fulfilled, (s, a) => { Object.assign(s, a.payload); s.loadingCustomers = false; })
      .addCase(fetchCustomersData.rejected, (s, a) => { s.loadingCustomers = false; s.error = a.error.message ?? 'Failed'; })
      .addCase(fetchMarketingData.pending, (s) => { s.loadingMarketing = true; s.error = null; })
      .addCase(fetchMarketingData.fulfilled, (s, a) => { Object.assign(s, a.payload); s.loadingMarketing = false; })
      .addCase(fetchMarketingData.rejected, (s, a) => { s.loadingMarketing = false; s.error = a.error.message ?? 'Failed'; });
  },
});

export const { setAnalyticsRange } = analyticsSlice.actions;
export default analyticsSlice.reducer;
```

- [ ] **Step 2: Update rootReducer.ts**

```typescript
// frontend/src/store/rootReducer.ts
import { combineReducers } from '@reduxjs/toolkit';
import dashboardReducer from './slices/dashboardSlice';
import analyticsReducer from './slices/analyticsSlice';

const rootReducer = combineReducers({
  dashboard: dashboardReducer,
  analytics: analyticsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/slices/analyticsSlice.ts frontend/src/store/rootReducer.ts
git commit -m "feat(analytics): add analyticsSlice and register in rootReducer"
```

---

## Task 6: Frontend — Sidebar + AppShell + Routes

**Files:**
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create Sidebar.tsx**

```typescript
// frontend/src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Users, Truck, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',  to: '/dashboard'  },
  { icon: TrendingUp,      label: 'Marketing',  to: '/marketing'  },
  { icon: Users,           label: 'Customers',  to: '/customers'  },
  { icon: Truck,           label: 'Operations', to: '/operations' },
  { icon: Star,            label: 'Reviews',    to: '/reviews'    },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-[#1A1208] transition-all duration-300 ease-in-out shrink-0 h-screen',
        collapsed ? 'w-[64px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-white/10 py-5',
        collapsed ? 'justify-center px-0' : 'px-5 gap-3'
      )}>
        <div className={cn('flex items-center justify-center rounded-lg bg-[#B8860B]/20 shrink-0', collapsed ? 'w-8 h-8' : 'w-8 h-8')}>
          <span className="text-[#B8860B] font-bold text-sm">S</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-semibold text-sm tracking-widest leading-none">SHAYN</p>
            <p className="text-white/40 text-[10px] tracking-wider uppercase mt-0.5">Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
        {NAV.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-150 group',
                collapsed ? 'justify-center px-0 w-full' : 'px-3 gap-3',
                isActive
                  ? 'bg-[#B8860B]/15 text-[#B8860B]'
                  : 'text-white/55 hover:bg-white/6 hover:text-white/90'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#B8860B]" />
                )}
                <Icon size={17} strokeWidth={1.6} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <span className="pointer-events-none absolute left-[110%] z-50 hidden group-hover:flex items-center rounded-md bg-[#2a1f0e] border border-white/10 px-2.5 py-1.5 text-xs text-white whitespace-nowrap shadow-2xl">
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/10 p-2">
        <button
          onClick={toggle}
          className={cn(
            'flex items-center w-full rounded-lg py-2 text-white/35 hover:text-white/70 hover:bg-white/5 transition-colors',
            collapsed ? 'justify-center' : 'gap-2 px-3'
          )}
        >
          {collapsed
            ? <ChevronRight size={15} strokeWidth={1.5} />
            : <><ChevronLeft size={15} strokeWidth={1.5} /><span className="text-xs">Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Update AppShell.tsx**

```typescript
// frontend/src/components/layout/AppShell.tsx
import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[#FDFAF4] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={
            <div className="flex h-screen items-center justify-center text-sm text-gray-400">
              Loading…
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>
    </SidebarProvider>
  );
}
```

- [ ] **Step 3: Update App.tsx**

```typescript
// frontend/src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@components/layout/AppShell';

const DashboardPage  = lazy(() => import('@pages/dashboard/page').then((m) => ({ default: m.DashboardPage })));
const ReviewsPage    = lazy(() => import('@pages/reviews/page').then((m) => ({ default: m.ReviewsPage })));
const OperationsPage = lazy(() => import('@pages/operations/page').then((m) => ({ default: m.OperationsPage })));
const CustomersPage  = lazy(() => import('@pages/customers/page').then((m) => ({ default: m.CustomersPage })));
const MarketingPage  = lazy(() => import('@pages/marketing/page').then((m) => ({ default: m.MarketingPage })));

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-gray-400">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"  element={<DashboardPage />} />
            <Route path="/reviews"    element={<ReviewsPage />} />
            <Route path="/operations" element={<OperationsPage />} />
            <Route path="/customers"  element={<CustomersPage />} />
            <Route path="/marketing"  element={<MarketingPage />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Verify frontend typechecks**

```bash
cd frontend && npm run typecheck
```
Expected: no errors (pages don't exist yet so expect "cannot find module" — fix by creating stub pages first if needed).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/AppShell.tsx frontend/src/App.tsx
git commit -m "feat(analytics): add sidebar navigation, update AppShell and routes"
```

---

## Task 7: Shared page header component

**Files:**
- Create: `frontend/src/pages/analytics/AnalyticsHeader.tsx`

Used by all 3 analytics pages for consistent range selector.

- [ ] **Step 1: Create AnalyticsHeader.tsx**

```typescript
// frontend/src/pages/analytics/AnalyticsHeader.tsx
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setAnalyticsRange } from '@store/slices/analyticsSlice';
import { cn } from '@/lib/utils';

const RANGES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: 'This Month', value: 'mtd' },
];

interface AnalyticsHeaderProps {
  title: string;
  subtitle: string;
}

export function AnalyticsHeader({ title, subtitle }: AnalyticsHeaderProps) {
  const dispatch = useAppDispatch();
  const range = useAppSelector((s) => s.analytics.range);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-parch bg-white sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-bold text-ink">{title}</h1>
        <p className="text-xs text-muted mt-0.5">{subtitle}</p>
      </div>
      <div className="flex gap-1 bg-[#F5F0E8] rounded-lg p-1">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => dispatch(setAnalyticsRange(r.value))}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              range === r.value
                ? 'bg-white text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/analytics/AnalyticsHeader.tsx
git commit -m "feat(analytics): add shared AnalyticsHeader component"
```

---

## Task 8: Operations Page — components

**Files:**
- Create: `frontend/src/pages/operations/components/NetRevenueRow.tsx`
- Create: `frontend/src/pages/operations/components/RtoByState.tsx`
- Create: `frontend/src/pages/operations/components/CodVsPrepaidRto.tsx`
- Create: `frontend/src/pages/operations/components/GeoRevenue.tsx`
- Create: `frontend/src/pages/operations/components/LogisticsCostDonut.tsx`
- Create: `frontend/src/pages/operations/components/CodCashFlow.tsx`

- [ ] **Step 1: Create NetRevenueRow.tsx**

```typescript
// frontend/src/pages/operations/components/NetRevenueRow.tsx
import type { NetRevenue } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';
import { IndianRupee, Truck, TrendingDown, PackageX } from 'lucide-react';

interface Props { data: NetRevenue | null; loading: boolean; }

const cards = (d: NetRevenue) => [
  { label: 'Gross Revenue',    value: formatINR(d.gross_revenue),  accent: '#2D7D46', icon: IndianRupee, bg: '#2D7D4618' },
  { label: 'Logistics Cost',   value: formatINR(d.logistics_cost), accent: '#B45309', icon: Truck,       bg: '#B4530918' },
  { label: 'Net Revenue',      value: formatINR(d.net_revenue),    accent: '#B8860B', icon: TrendingDown, bg: '#B8860B18' },
  { label: 'RTO Waste',        value: formatINR(d.rto_waste),      accent: '#9B2235', icon: PackageX,    bg: '#9B223518' },
];

export function NetRevenueRow({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-parch" />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards(data).map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-parch shadow-card overflow-hidden">
          <div className="h-1 w-full" style={{ backgroundColor: c.accent }} />
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
              <div className="rounded-lg p-1.5" style={{ backgroundColor: c.bg }}>
                <c.icon size={13} strokeWidth={1.5} style={{ color: c.accent }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create RtoByState.tsx**

```typescript
// frontend/src/pages/operations/components/RtoByState.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { RtoByStateItem } from '@app/types/analytics';

interface Props { data: RtoByStateItem[]; loading: boolean; }

function rtoColor(rate: number) {
  if (rate > 20) return '#9B2235';
  if (rate > 10) return '#B45309';
  return '#2D7D46';
}

export function RtoByState({ data, loading }: Props) {
  if (loading) return <div className="h-64 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No shipment data</p>;

  const chartData = data.map((d) => ({
    state: d.state,
    rto_count: Number(d.rto_count),
    rto_rate: Number(d.rto_rate),
    total: Number(d.total),
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="state" type="category" width={90} tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(val: number, name: string) => [val, name === 'rto_count' ? 'RTO Orders' : name]}
            contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }}
          />
          <Bar dataKey="rto_count" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={rtoColor(entry.rto_rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-center text-xs text-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#9B2235] inline-block" /> &gt;20% rate</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#B45309] inline-block" /> 10–20%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2D7D46] inline-block" /> &lt;10%</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create CodVsPrepaidRto.tsx**

```typescript
// frontend/src/pages/operations/components/CodVsPrepaidRto.tsx
import type { CodVsPrepaidItem } from '@app/types/analytics';
import { formatNum, formatPct } from '@utils/formatters';

interface Props { data: CodVsPrepaidItem[]; loading: boolean; }

export function CodVsPrepaidRto({ data, loading }: Props) {
  if (loading) return <div className="h-32 bg-parch animate-pulse rounded-lg" />;

  const cod     = data.find((d) => d.payment_mode === 'COD');
  const prepaid = data.find((d) => d.payment_mode === 'Prepaid');

  const stat = (label: string, item: CodVsPrepaidItem | undefined, accent: string) => (
    <div className="flex-1 rounded-xl border border-parch p-4" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: accent }}>{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Total Shipments</span>
          <span className="font-medium text-ink">{formatNum(item?.total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">RTOs</span>
          <span className="font-medium text-ink">{formatNum(item?.rto_count)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">RTO Rate</span>
          <span className="font-bold text-lg" style={{ color: accent }}>{formatPct(item?.rto_rate)}</span>
        </div>
      </div>
    </div>
  );

  const codRate     = Number(cod?.rto_rate ?? 0);
  const prepaidRate = Number(prepaid?.rto_rate ?? 0);
  const multiplier  = prepaidRate > 0 ? (codRate / prepaidRate).toFixed(1) : '—';

  return (
    <div>
      <div className="flex gap-3">
        {stat('COD', cod, '#9B2235')}
        {stat('Prepaid', prepaid, '#2D7D46')}
      </div>
      {prepaidRate > 0 && (
        <p className="text-xs text-muted text-center mt-3">
          COD returns at <span className="font-semibold text-ruby">{multiplier}×</span> the rate of Prepaid
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create GeoRevenue.tsx**

```typescript
// frontend/src/pages/operations/components/GeoRevenue.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { GeoRevenueItem } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';

interface Props { data: GeoRevenueItem[]; loading: boolean; }

export function GeoRevenue({ data, loading }: Props) {
  if (loading) return <div className="h-56 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No data</p>;

  const chartData = data.map((d) => ({ state: d.state, revenue: parseFloat(String(d.revenue)) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE0" />
        <XAxis dataKey="state" tick={{ fontSize: 10, fill: '#8C7B64' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
        <YAxis tickFormatter={formatINR} tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          formatter={(val: number) => [formatINR(val), 'Revenue']}
          contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }}
        />
        <Bar dataKey="revenue" fill="#B8860B" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 5: Create LogisticsCostDonut.tsx**

```typescript
// frontend/src/pages/operations/components/LogisticsCostDonut.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { LogisticsCosts } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';

interface Props { data: LogisticsCosts | null; loading: boolean; }

const SEGMENTS = [
  { key: 'fwd', label: 'Forward',  color: '#B8860B' },
  { key: 'rto', label: 'RTO',      color: '#9B2235' },
  { key: 'cod', label: 'COD',      color: '#B45309' },
  { key: 'gst', label: 'GST',      color: '#8C7B64' },
];

export function LogisticsCostDonut({ data, loading }: Props) {
  if (loading || !data) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;

  const pieData = SEGMENTS.map((s) => ({
    name: s.label,
    value: parseFloat(String(data[s.key as keyof LogisticsCosts] ?? 0)),
    color: s.color,
  })).filter((d) => d.value > 0);

  if (!pieData.length) return <p className="text-muted text-sm text-center py-12">No cost data</p>;

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(val: number) => formatINR(val)} contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-muted">Total: <span className="font-semibold text-ink">{formatINR(data.total)}</span></p>
    </div>
  );
}
```

- [ ] **Step 6: Create CodCashFlow.tsx**

```typescript
// frontend/src/pages/operations/components/CodCashFlow.tsx
import type { CodCashFlow as CodCashFlowType } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';

interface Props { data: CodCashFlowType | null; loading: boolean; }

export function CodCashFlow({ data, loading }: Props) {
  if (loading || !data) return <div className="h-24 bg-parch animate-pulse rounded-lg" />;

  const items = [
    { label: 'COD Generated',   value: formatINR(data.cod_generated), color: '#2D7D46' },
    { label: 'COD Remitted',    value: formatINR(data.cod_remitted),  color: '#B8860B' },
    { label: 'Pending',         value: formatINR(data.pending),       color: '#9B2235' },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-parch">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-2 text-center">
          <p className="text-xs text-muted mb-1">{item.label}</p>
          <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/operations/components/
git commit -m "feat(analytics): add Operations page components"
```

---

## Task 9: Operations Page — page.tsx

**Files:**
- Create: `frontend/src/pages/operations/page.tsx`

- [ ] **Step 1: Create page.tsx**

```typescript
// frontend/src/pages/operations/page.tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchOperationsData } from '@store/slices/analyticsSlice';
import { AnalyticsHeader } from '../analytics/AnalyticsHeader';
import { NetRevenueRow }      from './components/NetRevenueRow';
import { RtoByState }         from './components/RtoByState';
import { CodVsPrepaidRto }    from './components/CodVsPrepaidRto';
import { GeoRevenue }         from './components/GeoRevenue';
import { LogisticsCostDonut } from './components/LogisticsCostDonut';
import { CodCashFlow }        from './components/CodCashFlow';

export function OperationsPage() {
  const dispatch = useAppDispatch();
  const {
    range, netRevenue, rtoByState, codVsPrepaidRto,
    geoRevenue, logisticsCosts, codCashFlow, loadingOperations,
  } = useAppSelector((s) => s.analytics);

  useEffect(() => { dispatch(fetchOperationsData(range)); }, [dispatch, range]);

  const L = loadingOperations;

  return (
    <div className="min-h-screen bg-ivory font-sans">
      <AnalyticsHeader title="Operations" subtitle="Logistics costs, RTO analysis, and COD cash flow" />

      <main className="max-w-screen-2xl mx-auto px-6 py-5 space-y-4">

        <NetRevenueRow data={netRevenue} loading={L} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">RTO by State</h3>
            <RtoByState data={rtoByState} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">COD vs Prepaid RTO</h3>
            <CodVsPrepaidRto data={codVsPrepaidRto} loading={L} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/operations/page.tsx
git commit -m "feat(analytics): add Operations page"
```

---

## Task 10: Customers Page — components + page

**Files:**
- Create: `frontend/src/pages/customers/components/CustomerOverviewRow.tsx`
- Create: `frontend/src/pages/customers/components/NewVsReturning.tsx`
- Create: `frontend/src/pages/customers/components/CustomerSegments.tsx`
- Create: `frontend/src/pages/customers/components/TopCustomers.tsx`
- Create: `frontend/src/pages/customers/components/DiscountAnalysis.tsx`
- Create: `frontend/src/pages/customers/page.tsx`

- [ ] **Step 1: Create CustomerOverviewRow.tsx**

```typescript
// frontend/src/pages/customers/components/CustomerOverviewRow.tsx
import type { CustomerOverview } from '@app/types/analytics';
import { formatNum, formatPct } from '@utils/formatters';
import { Users, UserPlus, RefreshCw, Repeat } from 'lucide-react';

interface Props { data: CustomerOverview | null; loading: boolean; }

export function CustomerOverviewRow({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-parch" />)}
      </div>
    );
  }
  const cards = [
    { label: 'Total Customers',     value: formatNum(data.total_customers),     accent: '#B8860B', icon: Users,      bg: '#B8860B18' },
    { label: 'New Customers',       value: formatNum(data.new_customers),       accent: '#2D7D46', icon: UserPlus,   bg: '#2D7D4618' },
    { label: 'Returning Customers', value: formatNum(data.returning_customers), accent: '#B45309', icon: RefreshCw,  bg: '#B4530918' },
    { label: 'Repeat Rate',         value: formatPct(data.repeat_rate),         accent: '#1A1208', icon: Repeat,     bg: '#1A120818' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-parch shadow-card overflow-hidden">
          <div className="h-1 w-full" style={{ backgroundColor: c.accent }} />
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
              <div className="rounded-lg p-1.5" style={{ backgroundColor: c.bg }}>
                <c.icon size={13} strokeWidth={1.5} style={{ color: c.accent }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create NewVsReturning.tsx**

```typescript
// frontend/src/pages/customers/components/NewVsReturning.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CustomerOverview } from '@app/types/analytics';
import { formatNum } from '@utils/formatters';

interface Props { data: CustomerOverview | null; loading: boolean; }

export function NewVsReturning({ data, loading }: Props) {
  if (loading || !data) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;

  const pieData = [
    { name: 'New',       value: data.new_customers,       color: '#2D7D46' },
    { name: 'Returning', value: data.returning_customers, color: '#B8860B' },
  ].filter((d) => d.value > 0);

  if (!pieData.length) return <p className="text-muted text-sm text-center py-12">No customer data</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}
          label={({ name, value }) => `${name}: ${formatNum(value)}`} labelLine={false}>
          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip formatter={(v: number) => formatNum(v)} contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Create CustomerSegments.tsx**

```typescript
// frontend/src/pages/customers/components/CustomerSegments.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { CustomerSegmentItem } from '@app/types/analytics';
import { formatNum } from '@utils/formatters';

interface Props { data: CustomerSegmentItem[]; loading: boolean; }

export function CustomerSegments({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No data</p>;

  const chartData = data.map((d) => ({ bucket: d.bucket, count: Number(d.count) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE0" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: number) => [formatNum(v), 'Customers']} contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }} />
        <Bar dataKey="count" fill="#B8860B" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Create TopCustomers.tsx**

```typescript
// frontend/src/pages/customers/components/TopCustomers.tsx
import type { TopCustomerItem } from '@app/types/analytics';
import { formatINR } from '@utils/formatters';

interface Props { data: TopCustomerItem[]; loading: boolean; }

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  return local.length > 3 ? `${local.slice(0, 3)}***@${domain}` : `***@${domain}`;
}

export function TopCustomers({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-8">No customer data</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-parch">
            <th className="text-left text-xs font-medium text-muted pb-2 pr-4">#</th>
            <th className="text-left text-xs font-medium text-muted pb-2 pr-4">Email</th>
            <th className="text-left text-xs font-medium text-muted pb-2 pr-4">Location</th>
            <th className="text-right text-xs font-medium text-muted pb-2 pr-4">Orders</th>
            <th className="text-right text-xs font-medium text-muted pb-2">Total Spent</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c, i) => (
            <tr key={c.customer_id} className="border-b border-parch/50 hover:bg-parch/30 transition-colors">
              <td className="py-2.5 pr-4 text-muted font-medium">{i + 1}</td>
              <td className="py-2.5 pr-4 text-ink font-medium">{maskEmail(c.email || '')}</td>
              <td className="py-2.5 pr-4 text-muted">{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
              <td className="py-2.5 pr-4 text-right text-ink">{c.orders_count}</td>
              <td className="py-2.5 text-right font-semibold text-ink">{formatINR(c.total_spent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Create DiscountAnalysis.tsx**

```typescript
// frontend/src/pages/customers/components/DiscountAnalysis.tsx
import type { DiscountItem } from '@app/types/analytics';
import { formatINR, formatNum, formatPct } from '@utils/formatters';

interface Props { data: DiscountItem[]; loading: boolean; }

export function DiscountAnalysis({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-8">No order data</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-parch">
            {['Discount Code', 'Orders', '% of Total', 'Revenue', 'Avg Order'].map((h) => (
              <th key={h} className="text-left text-xs font-medium text-muted pb-2 pr-4 last:pr-0 last:text-right">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.discount_code} className="border-b border-parch/50 hover:bg-parch/30 transition-colors">
              <td className="py-2.5 pr-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  d.discount_code === 'No Discount'
                    ? 'bg-gray-100 text-muted'
                    : 'bg-[#B8860B]/10 text-[#B8860B]'
                }`}>{d.discount_code}</span>
              </td>
              <td className="py-2.5 pr-4 text-ink">{formatNum(d.orders)}</td>
              <td className="py-2.5 pr-4 text-muted">{formatPct(d.pct_of_total)}</td>
              <td className="py-2.5 pr-4 text-ink">{formatINR(d.revenue)}</td>
              <td className="py-2.5 text-right font-semibold text-ink">{formatINR(d.aov)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Create customers/page.tsx**

```typescript
// frontend/src/pages/customers/page.tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchCustomersData } from '@store/slices/analyticsSlice';
import { AnalyticsHeader }       from '../analytics/AnalyticsHeader';
import { CustomerOverviewRow }   from './components/CustomerOverviewRow';
import { NewVsReturning }        from './components/NewVsReturning';
import { CustomerSegments }      from './components/CustomerSegments';
import { TopCustomers }          from './components/TopCustomers';
import { DiscountAnalysis }      from './components/DiscountAnalysis';

export function CustomersPage() {
  const dispatch = useAppDispatch();
  const {
    range, customerOverview, customerSegments,
    topCustomers, discountAnalysis, loadingCustomers,
  } = useAppSelector((s) => s.analytics);

  useEffect(() => { dispatch(fetchCustomersData(range)); }, [dispatch, range]);

  const L = loadingCustomers;

  return (
    <div className="min-h-screen bg-ivory font-sans">
      <AnalyticsHeader title="Customers" subtitle="New vs returning, LTV segments, and discount impact" />

      <main className="max-w-screen-2xl mx-auto px-6 py-5 space-y-4">

        <CustomerOverviewRow data={customerOverview} loading={L} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/customers/
git commit -m "feat(analytics): add Customers page and components"
```

---

## Task 11: Marketing Page — components + page

**Files:**
- Create: `frontend/src/pages/marketing/components/MarketingKPIs.tsx`
- Create: `frontend/src/pages/marketing/components/RoasTrend.tsx`
- Create: `frontend/src/pages/marketing/components/CppTrend.tsx`
- Create: `frontend/src/pages/marketing/components/AttributionGap.tsx`
- Create: `frontend/src/pages/marketing/components/CtrTrend.tsx`
- Create: `frontend/src/pages/marketing/page.tsx`

- [ ] **Step 1: Create MarketingKPIs.tsx**

```typescript
// frontend/src/pages/marketing/components/MarketingKPIs.tsx
import type { MarketingTrendItem, AttributionGap as AttributionGapType } from '@app/types/analytics';
import { formatINR, formatNum, formatPct } from '@utils/formatters';
import { DollarSign, ShoppingBag, Target, Link } from 'lucide-react';

interface Props {
  trend: MarketingTrendItem[];
  attribution: AttributionGapType | null;
  loading: boolean;
}

export function MarketingKPIs({ trend, attribution, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-parch" />)}
      </div>
    );
  }
  const totalSpend     = trend.reduce((s, r) => s + Number(r.spend), 0);
  const totalPurchases = trend.reduce((s, r) => s + Number(r.purchases), 0);
  const cpp            = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const attrRate       = attribution?.attribution_rate ?? 0;

  const cards = [
    { label: 'Total Ad Spend',     value: formatINR(totalSpend),          accent: '#9B2235', icon: DollarSign,  bg: '#9B223518' },
    { label: 'Meta Purchases',     value: formatNum(totalPurchases),      accent: '#2D7D46', icon: ShoppingBag, bg: '#2D7D4618' },
    { label: 'Cost Per Purchase',  value: formatINR(cpp),                 accent: '#B45309', icon: Target,      bg: '#B4530918' },
    { label: 'Attribution Rate',   value: formatPct(attrRate),            accent: '#B8860B', icon: Link,        bg: '#B8860B18' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-parch shadow-card overflow-hidden">
          <div className="h-1 w-full" style={{ backgroundColor: c.accent }} />
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
              <div className="rounded-lg p-1.5" style={{ backgroundColor: c.bg }}>
                <c.icon size={13} strokeWidth={1.5} style={{ color: c.accent }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create RoasTrend.tsx**

```typescript
// frontend/src/pages/marketing/components/RoasTrend.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import type { MarketingTrendItem } from '@app/types/analytics';
import { formatDate } from '@utils/formatters';

interface Props { data: MarketingTrendItem[]; loading: boolean; }

export function RoasTrend({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No ad data</p>;

  const chartData = data.map((d) => ({ date: d.date, roas: parseFloat(String(d.roas)) }));
  const ticks = chartData.map((d) => new Date(d.date).getTime());

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData.map((d) => ({ ...d, ts: new Date(d.date).getTime() }))}
        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE0" />
        <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={ticks}
          tickFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} width={36}
          tickFormatter={(v: number) => `${v}x`} />
        <Tooltip formatter={(v: number) => [`${v.toFixed(2)}x`, 'ROAS']}
          labelFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }} />
        <ReferenceLine y={1} stroke="#9B2235" strokeDasharray="4 4" label={{ value: 'Break-even', position: 'right', fontSize: 10, fill: '#9B2235' }} />
        <ReferenceLine y={2} stroke="#2D7D46" strokeDasharray="4 4" label={{ value: 'Target 2x', position: 'right', fontSize: 10, fill: '#2D7D46' }} />
        <Line type="monotone" dataKey="roas" stroke="#B8860B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Create CppTrend.tsx**

```typescript
// frontend/src/pages/marketing/components/CppTrend.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { MarketingTrendItem } from '@app/types/analytics';
import { formatINR, formatDate } from '@utils/formatters';

interface Props { data: MarketingTrendItem[]; loading: boolean; }

export function CppTrend({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No data</p>;

  const chartData = data
    .filter((d) => Number(d.purchases) > 0)
    .map((d) => ({ ts: new Date(d.date).getTime(), cpp: parseFloat(String(d.cpp)) }));
  const ticks = chartData.map((d) => d.ts);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE0" />
        <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={ticks}
          tickFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatINR} tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} width={60} />
        <Tooltip formatter={(v: number) => [formatINR(v), 'Cost Per Purchase']}
          labelFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }} />
        <Line type="monotone" dataKey="cpp" stroke="#9B2235" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Create AttributionGap.tsx**

```typescript
// frontend/src/pages/marketing/components/AttributionGap.tsx
import type { AttributionGap as AttributionGapType } from '@app/types/analytics';
import { formatNum, formatPct } from '@utils/formatters';

interface Props { data: AttributionGapType | null; loading: boolean; }

export function AttributionGap({ data, loading }: Props) {
  if (loading || !data) return <div className="h-32 bg-parch animate-pulse rounded-lg" />;

  const over = data.gap > 0;
  const gapLabel = Math.abs(data.gap);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-4 rounded-xl bg-[#9B2235]/5 border border-[#9B2235]/15">
          <p className="text-xs text-muted mb-1">Meta Claims</p>
          <p className="text-3xl font-bold text-[#9B2235]">{formatNum(data.meta_purchases)}</p>
          <p className="text-xs text-muted mt-1">purchases</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-[#2D7D46]/5 border border-[#2D7D46]/15">
          <p className="text-xs text-muted mb-1">Shopify Recorded</p>
          <p className="text-3xl font-bold text-[#2D7D46]">{formatNum(data.shopify_orders)}</p>
          <p className="text-xs text-muted mt-1">orders</p>
        </div>
      </div>
      <div className="text-center p-3 rounded-lg bg-parch">
        <p className="text-sm text-muted">
          Attribution Rate: <span className="font-bold text-ink">{formatPct(data.attribution_rate)}</span>
        </p>
        <p className="text-xs text-muted mt-1">
          Meta {over ? 'over-attributes' : 'under-attributes'} by{' '}
          <span className={`font-semibold ${over ? 'text-ruby' : 'text-emerald'}`}>{formatNum(gapLabel)} orders</span>
          {over && ' — includes view-through conversions'}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create CtrTrend.tsx**

```typescript
// frontend/src/pages/marketing/components/CtrTrend.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import type { MarketingTrendItem } from '@app/types/analytics';
import { formatDate, formatPct } from '@utils/formatters';

interface Props { data: MarketingTrendItem[]; loading: boolean; }

export function CtrTrend({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-12">No data</p>;

  const chartData = data.map((d) => ({
    ts: new Date(d.date).getTime(),
    ctr: parseFloat(String(d.ctr)),
  }));
  const ticks = chartData.map((d) => d.ts);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EBE0" />
        <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={ticks}
          tickFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          tick={{ fontSize: 11, fill: '#8C7B64' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: '#8C7B64' }}
          axisLine={false} tickLine={false} width={36} />
        <Tooltip formatter={(v: number) => [formatPct(v), 'CTR']}
          labelFormatter={(ts: number) => formatDate(new Date(ts).toISOString().split('T')[0])}
          contentStyle={{ borderRadius: 8, border: '1px solid #F0EBE0', fontSize: 12 }} />
        <ReferenceLine y={1} stroke="#8C7B64" strokeDasharray="4 4"
          label={{ value: '1% benchmark', position: 'right', fontSize: 10, fill: '#8C7B64' }} />
        <Line type="monotone" dataKey="ctr" stroke="#B45309" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 6: Create marketing/page.tsx**

```typescript
// frontend/src/pages/marketing/page.tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchMarketingData } from '@store/slices/analyticsSlice';
import { AnalyticsHeader }  from '../analytics/AnalyticsHeader';
import { MarketingKPIs }    from './components/MarketingKPIs';
import { RoasTrend }        from './components/RoasTrend';
import { CppTrend }         from './components/CppTrend';
import { AttributionGap }   from './components/AttributionGap';
import { CtrTrend }         from './components/CtrTrend';

export function MarketingPage() {
  const dispatch = useAppDispatch();
  const {
    range, marketingTrend, attributionGap, loadingMarketing,
  } = useAppSelector((s) => s.analytics);

  useEffect(() => { dispatch(fetchMarketingData(range)); }, [dispatch, range]);

  const L = loadingMarketing;

  return (
    <div className="min-h-screen bg-ivory font-sans">
      <AnalyticsHeader title="Marketing" subtitle="ROAS trends, attribution gap, and campaign efficiency" />

      <main className="max-w-screen-2xl mx-auto px-6 py-5 space-y-4">

        <MarketingKPIs trend={marketingTrend} attribution={attributionGap} loading={L} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">ROAS Trend</h3>
            <RoasTrend data={marketingTrend} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Cost Per Purchase Trend</h3>
            <CppTrend data={marketingTrend} loading={L} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/marketing/
git commit -m "feat(analytics): add Marketing page and components"
```

---

## Task 12: Final — typecheck + lint

- [ ] **Step 1: Typecheck backend**

```bash
cd backend && npm run typecheck
```
Expected: no errors.

- [ ] **Step 2: Typecheck frontend**

```bash
cd frontend && npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Lint both**

```bash
cd /path/to/project && npm run lint
```
Expected: 0 warnings.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(analytics): complete business intelligence expansion — sidebar + 3 analytics pages"
```
