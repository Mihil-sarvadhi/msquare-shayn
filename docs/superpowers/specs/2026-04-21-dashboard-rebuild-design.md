# SHAYN MIS — Dashboard Rebuild Design Spec
**Date:** 2026-04-21  
**Branch:** `enhancement`  
**Approach:** Full rebuild (Option B) — each page rewritten from scratch using a new shared design system matching the reference HTML UI/UX.

---

## 1. Goals

- Implement 5 dashboard pages (Dashboard, Marketing, Customers, Reviews, Operations) with 8–9 charts each
- Match the visual design of the reference HTML: off-white surfaces, gold accent, DM Sans/Mono fonts, Panel cards with Info + AI Insight drawers
- Keep current top navigation structure (no sidebar)
- AI Insight content is static pre-written text (no live API call)
- Add 2 missing backend endpoints: courier scorecard and SLA by zone

---

## 2. Shared Design System

### 2.1 Design Tokens
Added to `frontend/src/styles/globals.css`:

```css
:root {
  --bg: #fafaf7;
  --surface: #ffffff;
  --surface-2: #f5f3ee;
  --border: #e8e6df;
  --border-strong: #d4d1c7;
  --text: #1a1814;
  --text-muted: #6b6659;
  --text-subtle: #a39f92;
  --accent: #8b6f3a;
  --accent-soft: #f5efe1;
  --accent-dark: #6b5529;
  --pos: #2d7a5f;
  --pos-soft: #e8f3ed;
  --neg: #b8433a;
  --neg-soft: #fbe9e7;
  --warn: #c4871f;
  --warn-soft: #fdf5e3;
  --ai: #5b4299;
  --ai-soft: #ece7f7;
}
```

### 2.2 Fonts
Add to `frontend/index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```
Apply in globals.css: `font-family: 'DM Sans', sans-serif` on body; `font-family: 'DM Mono', monospace` via `.font-mono` utility.

### 2.3 Shared Components
All in `frontend/src/components/shared/`:

| Component | Purpose |
|---|---|
| `Panel.tsx` | Card wrapper — title, subtitle, optional action slot, Info (ⓘ) button, AI (✦ AI) button |
| `InfoDrawer.tsx` | Slide-in drawer from right — two modes: `info` (About this chart) and `ai` (AI Insight + actions) |
| `KpiCard.tsx` | KPI tile — value, label, DeltaChip, optional sub-text, optional sparkline |
| `DeltaChip.tsx` | Green ↑ / red ↓ chip with percentage value |
| `Chip.tsx` | Status chip variants: `pos`, `neg`, `warn`, `neutral`, `ai` |
| `CustomTooltip.tsx` | Dark recharts tooltip used by all charts |

#### Panel props interface
```typescript
interface PanelProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  info?: PanelInfo;   // "About this chart" content
  ai?: PanelAI;       // AI insight content
  className?: string;
  children: React.ReactNode;
}

interface PanelInfo {
  what: string;
  how?: string;
  source?: string;
  readIt?: string;
}

interface PanelAI {
  observation: string;
  insight: string;
  metrics?: { label: string; value: string }[];
  actions: string[];
}
```

#### InfoDrawer behaviour
- Opens on Info (ⓘ) or AI button click, passing drawer state up to page-level `useState`
- Closes on overlay click or Escape key
- Renders two distinct layouts: info mode (what/how/source/readIt sections) vs AI mode (observation/insight/metrics/actions sections)
- One drawer instance per page, shared by all panels on that page

---

## 3. Backend Additions

### 3.1 Courier Scorecard
**Endpoint:** `GET /api/analytics/courier-scorecard`  
**Query params:** `since`, `until`

**SQL logic:**
- Group `ithink_shipments` by `courier`
- `volume` = COUNT(*)
- `split_pct` = volume / total × 100
- `rto_rate` = COUNT WHERE `current_status_code` LIKE 'RT%' / volume × 100
- `avg_sla_days` = AVG(EXTRACT(DAY FROM `delivered_date` - `order_date`)) WHERE delivered
- `cost_per_shipment` = AVG(`billed_total`) WHERE `billed_total` > 0

**Response shape:**
```typescript
interface CourierScorecard {
  courier: string;
  volume: number;
  split_pct: number;
  rto_rate: number;
  avg_sla_days: number;
  cost_per_shipment: number;
}
```

**Health thresholds (derived on frontend):**
- `healthy`: rto_rate < 12 AND avg_sla_days < 3
- `watch`: rto_rate < 18 AND avg_sla_days < 4
- `review`: anything worse

### 3.2 SLA by Zone
**Endpoint:** `GET /api/analytics/sla-by-zone`  
**Query params:** `since`, `until`

**SQL logic:**
- Filter `ithink_shipments` WHERE `delivered_date` IS NOT NULL AND `zone` IS NOT NULL
- Group by `zone`
- `median_days` = PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY delivered_date - order_date)
- `p95_days` = PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY delivered_date - order_date)
- `total_shipments` = COUNT(*)

**Response shape:**
```typescript
interface SlaByZone {
  zone: string;
  median_days: number;
  p95_days: number;
  total_shipments: number;
}
```

### 3.3 Recent Orders (Dashboard)
**Endpoint:** `GET /api/dashboard/recent-orders`  
**No query params** — always returns last 5 orders regardless of date range.

**SQL logic:** SELECT order_name, revenue, customer_city, created_at FROM shopify_orders ORDER BY created_at DESC LIMIT 5

**Response shape:**
```typescript
interface RecentOrder {
  order_name: string;
  revenue: number;
  customer_city: string;
  created_at: string;
}
```

File changes: `dashboard.repository.ts`, `dashboard.service.ts`, `dashboard.controller.ts`, `dashboard.routes.ts` — same pattern as existing dashboard endpoints.  
Frontend: add `recentOrders: RecentOrder[]` to `dashboardSlice`, fetch in `fetchAllDashboard`.

### 3.4 File Changes (Backend)
- `backend/src/modules/analytics/analytics.repository.ts` — add `getCourierScorecard()` and `getSlaByZone()` raw SQL methods
- `backend/src/modules/analytics/analytics.service.ts` — add service methods
- `backend/src/modules/analytics/analytics.controller.ts` — add route handlers
- `backend/src/routes/analytics.routes.ts` — register new routes
- `backend/src/modules/analytics/analytics.types.ts` — add Zod schemas + TS types

---

## 4. Frontend State Management

### 4.1 analyticsSlice Extensions
Add to existing `analyticsSlice.ts`:
```typescript
courierScorecard: CourierScorecard[];
slaByZone: SlaByZone[];
```
Added to `fetchOperationsData` thunk (parallel fetch alongside existing ops calls).

### 4.2 analytics.api.ts Extensions
```typescript
fetchCourierScorecard(range: RangeState): Promise<CourierScorecard[]>
fetchSlaByZone(range: RangeState): Promise<SlaByZone[]>
```

### 4.3 types/analytics.ts Extensions
Add `CourierScorecard` and `SlaByZone` interfaces.

### 4.4 API Constants
Add to `src/utils/constants/api.constant.ts`:
```
ANALYTICS.COURIER_SCORECARD = '/api/analytics/courier-scorecard'
ANALYTICS.SLA_BY_ZONE = '/api/analytics/sla-by-zone'
```

---

## 5. Page-by-Page Chart Breakdown

### 5.1 Dashboard Page
**File:** `frontend/src/pages/dashboard/page.tsx` (full rebuild)
**Data:** `dashboardSlice` (existing) + `analyticsSlice.channelRevenue` (existing)

| Chart | Component | Data Source |
|---|---|---|
| KPI Strip | `KpiCard` ×6 | `kpis`: revenue, orders, AOV, MER, newCustomers, codPct |
| Revenue Trend | `RevenueTrendChart` | `revenueTrend` |
| Revenue vs Ad Spend | `RevenueVsSpendChart` | `revenueTrend` + `marketingTrend` |
| Channel Revenue | `ChannelRevenueChart` | `channelRevenue` |
| CM2 Waterfall | `WaterfallChart` | `kpis` + `netRevenue` |
| Live Activity | `LiveActivityFeed` | `kpis.orders` (period count) + new `GET /api/dashboard/recent-orders` endpoint (last 5 orders: order_name, revenue, customer_city, created_at) |
| Abandoned Carts | `AbandonedCartsKpi` | `abandonedCarts` |
| COD vs Prepaid | `CodPrepaidDonut` | `kpis.codPct` |

### 5.2 Marketing Page
**File:** `frontend/src/pages/marketing/page.tsx` (full rebuild)
**Data:** `analyticsSlice.marketingTrend`, `analyticsSlice.attributionGap`, `analyticsSlice.channelRevenue`, `dashboardSlice.campaigns`

| Chart | Component | Data Source |
|---|---|---|
| KPI Strip | `KpiCard` ×5 | `kpis`: adSpend, revenue, roas, mer, cac |
| Campaign Table | `CampaignTable` | `campaigns` |
| Marketing Trend | `MarketingTrendChart` | `marketingTrend` |
| Meta Funnel | `MetaFunnelChart` | `metaFunnel` |
| Attribution Gap | `AttributionGapChart` | `attributionGap` |
| Spend by Objective | `SpendByObjectiveDonut` | `campaigns` (grouped by objective) |
| Discount Analysis | `DiscountTable` | `discountAnalysis` |
| COD vs Prepaid RTO | `CodVsPrepaidRtoChart` | `codVsPrepaidRto` |

### 5.3 Customers Page
**File:** `frontend/src/pages/customers/page.tsx` (full rebuild)
**Data:** `analyticsSlice`: customerOverview, customerSegments, topCustomers, discountAnalysis + `dashboardSlice`: reviewsSummary, reviewsTrend, topRatedProducts, geoRevenue

| Chart | Component | Data Source |
|---|---|---|
| KPI Strip | `KpiCard` ×5 | `customerOverview` |
| Customer Segments | `CustomerSegmentsChart` | `customerSegments` |
| Top Customers | `TopCustomersTable` | `topCustomers` |
| New vs Returning Revenue | `NewVsReturningChart` | `customerOverview` (period totals: new_customers, returning_customers, their revenue share — shown as grouped bar/comparison, no weekly breakdown) |
| Avg Rating Trend | `RatingTrendChart` | `reviewsTrend` |
| Review Distribution | `ReviewDistributionChart` | `reviewsSummary` |
| Top-Rated Products | `TopRatedTable` | `topRatedProducts` |
| Geographic Revenue | `GeoRevenueChart` | `geoRevenue` |

### 5.4 Reviews Page
**File:** `frontend/src/pages/reviews/page.tsx` (full rebuild)
**Data:** `dashboardSlice`: reviewsSummary, recentReviews, allReviews, reviewsTrend, topRatedProducts, topProducts

| Chart | Component | Data Source |
|---|---|---|
| KPI Strip | `KpiCard` ×5 | `reviewsSummary` |
| All Reviews Feed | `AllReviewsFeed` | `allReviews` (paginated, filters) |
| Recent Reviews | `RecentReviewsCards` | `recentReviews` |
| Review Trend | `ReviewTrendChart` | `reviewsTrend` |
| Under-Reviewed SKUs | `UnderReviewedSkus` | `topProducts` + `topRatedProducts` join |
| Top vs Bottom Rated | `TopBottomRatedChart` | `topRatedProducts` |
| Rating Distribution | `RatingDonut` | `reviewsSummary` |
| UGC Count Trend | `UgcTrendChart` | `reviewsTrend` (has_photos field) |

### 5.5 Operations Page
**File:** `frontend/src/pages/operations/page.tsx` (full rebuild)
**Data:** `analyticsSlice`: netRevenue, rtoByState, codVsPrepaidRto, logisticsCosts, codCashFlow, moneyStuck, **courierScorecard** (new), **slaByZone** (new) + `dashboardSlice.logistics`

| Chart | Component | Data Source |
|---|---|---|
| KPI Strip | `KpiCard` ×5 | `kpis`: shipments, rtoRate, codPct, deliveredPct, ndrCount |
| Shipment Status | `ShipmentStatusDonut` | `logistics` |
| Courier Scorecard | `CourierScorecardTable` | `courierScorecard` (new) |
| RTO by State | `RtoByStateChart` | `rtoByState` |
| COD vs Prepaid RTO | `CodVsPrepaidRtoChart` | `codVsPrepaidRto` |
| SLA by Zone | `SlaByZoneChart` | `slaByZone` (new) |
| Net Revenue Waterfall | `NetRevenueWaterfall` | `netRevenue` |
| COD Cash Flow | `CodCashFlowChart` | `codCashFlow` |
| Money Stuck | `MoneyStuckKpi` | `moneyStuck` |

---

## 6. Implementation Order

1. **Backend** — courier scorecard + SLA by zone endpoints (repository → service → controller → routes)
2. **Design tokens + fonts** — globals.css + index.html
3. **Shared components** — Panel, InfoDrawer, KpiCard, DeltaChip, Chip, CustomTooltip
4. **Redux + API** — extend analyticsSlice, analytics.api.ts, types
5. **Dashboard page** — rebuild
6. **Marketing page** — rebuild
7. **Customers page** — rebuild
8. **Reviews page** — rebuild
9. **Operations page** — rebuild (uses new backend data)

---

## 7. Constraints & Rules

- TypeScript strict mode — zero `any`, explicit return types on exports
- `import type` for type-only imports
- Named exports only (no default exports except slice reducers)
- No `console.log` — use `logger` from `@/lib/logger`
- All Tailwind conditionals via `cn()` from `@/lib/utils`
- Recharts exclusively for all charts
- All API URLs from `API_ENDPOINTS` constant, never hardcoded
- All Zod validation schemas in `src/utils/validations/index.ts`
- ESLint + Prettier must pass (0 warnings)
- No `any` types — proper TypeScript throughout
