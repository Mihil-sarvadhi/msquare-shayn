# Business Intelligence Expansion — Design Spec

**Goal:** Add a sidebar navigation and 3 new analytics pages (Operations, Customers, Marketing) that surface actionable business intelligence from data already in the database.

**Architecture:** New `analytics` module on the backend (routes → controller → service → repository) with ~10 SQL queries across existing tables. Frontend gets a collapsible Sidebar component, an `analyticsSlice`, and 3 new pages with focused widgets.

**Tech Stack:** PostgreSQL (existing tables), Sequelize raw queries, Express, React 19, Redux Toolkit, Recharts (already used in RevenueChart), Tailwind CSS, Lucide React

---

## 1. Sidebar Navigation

### Current State
`SidebarContext` exists but no sidebar UI is rendered. Users can only navigate by knowing URLs directly.

### What to Build
`src/components/layout/Sidebar.tsx` — a collapsible left sidebar.

**Dimensions:** 220px expanded, 64px collapsed. Collapses via the existing `useSidebar()` toggle.

**Nav items (in order):**
| Icon (Lucide) | Label | Route |
|---|---|---|
| `LayoutDashboard` | Dashboard | `/dashboard` |
| `TrendingUp` | Marketing | `/marketing` |
| `Users` | Customers | `/customers` |
| `Truck` | Operations | `/operations` |
| `Star` | Reviews | `/reviews` |

**Behaviour:**
- Active route gets gold (`#B8860B`) left border + tinted background
- Collapsed state shows icon only, no label
- Toggle button at bottom of sidebar (ChevronLeft / ChevronRight icon)
- `AppShell.tsx` updated to render `<Sidebar />` to the left of the main content area

---

## 2. Operations Page (`/operations`)

**Business question:** Where is my money going? Which states are costing me the most in returns?

**Route:** `/operations`  
**Redux slice key:** `analytics` (shared across all 3 pages)  
**API endpoint prefix:** `/api/analytics`

### Widgets

#### 2.1 Net Revenue Row (4 KPI cards)
| Card | Formula | Source |
|---|---|---|
| Gross Revenue | `SUM(shopify_orders.revenue)` | `shopify_orders` |
| Logistics Cost | `SUM(ithink_shipments.billed_total)` | `ithink_shipments` |
| Net Revenue | Gross Revenue − Logistics Cost | computed |
| RTO Waste | `SUM(billed_fwd_charges + billed_rto_charges)` WHERE `current_status_code LIKE 'RT%'` | `ithink_shipments` |

#### 2.2 RTO by State (horizontal bar chart)
- Top 10 states sorted by RTO count
- Each bar shows: RTO count + RTO rate % (rto_count / total_shipments_from_state)
- Color threshold: red if rate > 20%, amber if 10–20%, green if < 10%
- Data: GROUP BY `ithink_shipments.customer_state` with RTO filter

#### 2.3 COD vs Prepaid RTO (side-by-side stat cards)
- Left: COD shipments / COD RTOs / COD RTO rate %
- Right: Prepaid shipments / Prepaid RTOs / Prepaid RTO rate %
- Insight label below: e.g. "COD returns at 3.2× the rate of Prepaid"
- Data: GROUP BY `payment_mode` with RTO filter from `ithink_shipments`

#### 2.4 Revenue by Geography (bar chart)
- Top 10 states by gross revenue from `shopify_orders.customer_state`
- Bars show revenue; secondary label shows order count
- Same date range filter as the rest of the page

#### 2.5 Logistics Cost Breakdown (donut chart)
- Segments: Forward Charges / RTO Charges / COD Charges / GST
- `SUM(billed_fwd_charges)`, `SUM(billed_rto_charges)`, `SUM(billed_cod_charges)`, `SUM(billed_gst_charges)`
- Shows % of total logistics cost per category

#### 2.6 COD Cash Flow (3 stat cards)
- COD Generated: `SUM(cod_generated)` from latest `ithink_remittance` row
- COD Remitted: `SUM(cod_remitted)`
- Pending Collection: Generated − Remitted
- Source: `ithink_remittance` table (not date-filtered — shows current state)

### Backend: New Queries
```
getNetRevenue(since, until)
  → { gross_revenue, logistics_cost, net_revenue, rto_waste }
  → shopify_orders JOIN ithink_shipments on order_id concept (separate queries, combined in service)

getRtoByState(since, until)
  → [{ state, total, rto_count, rto_rate }] top 10 by rto_count
  → ithink_shipments GROUP BY customer_state

getCodVsPrepaidRto(since, until)
  → [{ payment_mode, total, rto_count, rto_rate }]
  → ithink_shipments GROUP BY payment_mode

getGeoRevenue(since, until)
  → [{ state, revenue, orders }] top 10 by revenue
  → shopify_orders GROUP BY customer_state

getLogisticsCosts(since, until)
  → { fwd, rto, cod, gst, total }
  → ithink_shipments SUM of charge columns

getCodCashFlow()
  → { cod_generated, cod_remitted, pending }
  → ithink_remittance ORDER BY remittance_date DESC LIMIT 30, summed
```

---

## 3. Customers Page (`/customers`)

**Business question:** Are customers buying again? Who are my most valuable customers? Are discounts hurting margins?

**Route:** `/customers`

### Widgets

#### 3.1 Customer Overview (4 KPI cards)
| Card | Formula | Source |
|---|---|---|
| Total Customers | COUNT(DISTINCT customer_id) | `shopify_orders` (date-filtered) |
| New Customers | customers with first order in range | `shopify_orders` first-order subquery |
| Returning Customers | Total − New | computed |
| Repeat Purchase Rate | returning / total × 100% | computed |

#### 3.2 New vs Returning (donut chart)
- Two segments: New Customers / Returning Customers
- Gold for returning (loyal), ivory/muted for new
- Shows count + percentage per segment

#### 3.3 Customer LTV Segments (bar chart)
- X-axis buckets: "1 order", "2–3 orders", "4–5 orders", "6+ orders"
- Y-axis: customer count per bucket
- Source: GROUP BY orders_count buckets from `shopify_customers`
- Insight: shows brand loyalty depth

#### 3.4 Top 10 Customers (table)
Columns: Rank / Customer Email / City, State / Orders / Total Spent / Last Order Date  
Source: `shopify_customers` ORDER BY total_spent DESC LIMIT 10  
Note: show email masked (first 3 chars + *** for privacy display)

#### 3.5 Revenue by State (bar chart)
- Top 10 states by revenue from `shopify_orders.customer_state`
- Shows: revenue bar + order count label
- Complements Operations page geo view but from revenue perspective

#### 3.6 Discount Code Analysis (table)
Columns: Discount Code / Orders Used / Total Revenue / Avg Order Value / % of Total Orders  
Includes one row: "No Discount" (orders WHERE discount_code IS NULL)  
Source: `shopify_orders` GROUP BY discount_code  
Insight: compare AOV of discounted vs non-discounted orders

### Backend: New Queries
```
getCustomerOverview(since, until)
  → { total_customers, new_customers, returning_customers, repeat_rate }
  → shopify_orders with first-order detection subquery

getCustomerSegments()
  → [{ bucket, count }]
  → shopify_customers GROUP BY CASE orders_count buckets

getTopCustomers(since, until)
  → [{ customer_id, email, city, state, orders_count, total_spent, last_order }] LIMIT 10
  → shopify_customers JOIN shopify_orders

getDiscountAnalysis(since, until)
  → [{ discount_code, orders, revenue, aov, pct_of_total }]
  → shopify_orders GROUP BY discount_code ORDER BY orders DESC LIMIT 20
```

---

## 4. Marketing Page (`/marketing`)

**Business question:** Is my ad spend getting more or less efficient? How much of Shopify revenue is driven by Meta ads?

**Route:** `/marketing`

### Widgets

#### 4.1 Marketing KPI Row (4 cards)
| Card | Formula | Source |
|---|---|---|
| Total Spend | SUM(spend) | `meta_daily_insights` |
| Meta Purchases | SUM(purchases) | `meta_daily_insights` |
| Cost Per Purchase | spend / purchases | computed |
| Attribution Rate | meta_purchases / shopify_orders × 100% | cross-table |

#### 4.2 ROAS Trend (line chart)
- X: date, Y: ROAS (purchase_value / spend per day)
- Shows if ads are improving or deteriorating over time
- Reference line at ROAS = 1 (break-even) and ROAS = 2 (target)
- Source: `meta_daily_insights` daily GROUP BY date

#### 4.3 Cost Per Purchase Trend (line chart)
- X: date, Y: CPP = spend / purchases per day
- Should trend downward as campaigns optimise
- Source: `meta_daily_insights` daily GROUP BY date

#### 4.4 Meta vs Shopify Attribution (comparison card)
- Left: Meta-reported purchases (from `meta_daily_insights`)
- Right: Actual Shopify orders (from `shopify_orders`)
- Center: Attribution rate % + gap number
- Label: "Meta claims X more purchases than Shopify recorded" or vice versa
- Helps detect over-attribution from view-through conversions

#### 4.5 CTR Trend (line chart)
- X: date, Y: CTR % (from `meta_daily_insights.ctr`)
- Declining CTR = ad creative fatigue or audience saturation
- Reference line at 1% (industry benchmark for cold audiences)

#### 4.6 Campaign Performance Table (enhanced)
- Same data as dashboard's CampaignTable
- Adds: CPP column (spend / purchases)
- ROAS color-coded: green ≥ 2x, amber ≥ 1x, red < 1x
- Sortable by all columns
- Source: existing `getCampaigns()` query, CPP computed in frontend

### Backend: New Queries
```
getMarketingTrend(since, until)
  → [{ date, spend, purchases, purchase_value, roas, ctr, cpp }]
  → meta_daily_insights GROUP BY date ORDER BY date ASC

getAttributionGap(since, until)
  → { meta_purchases, shopify_orders, attribution_rate, gap }
  → meta_daily_insights SUM + shopify_orders COUNT in same period
```

---

## 5. File Structure

### Backend (new files)
```
backend/src/modules/analytics/
  analytics.routes.ts       — registers all /api/analytics/* endpoints
  analytics.controller.ts   — parses req, calls service, responds
  analytics.service.ts      — date range logic, calls repository
  analytics.repository.ts   — all SQL queries (getNetRevenue, getRtoByState, etc.)
  analytics.types.ts        — TypeScript interfaces for all query results
```

**Register in:** `backend/src/routes/index.ts` (add analytics router)

### Frontend (new files)
```
frontend/src/components/layout/Sidebar.tsx         — sidebar nav component
frontend/src/pages/operations/
  page.tsx
  components/NetRevenueRow.tsx
  components/RtoByState.tsx
  components/CodVsPrepaidRto.tsx
  components/GeoRevenue.tsx
  components/LogisticsCostDonut.tsx
  components/CodCashFlow.tsx
frontend/src/pages/customers/
  page.tsx
  components/CustomerOverview.tsx
  components/NewVsReturning.tsx
  components/CustomerSegments.tsx
  components/TopCustomers.tsx
  components/RevenueByState.tsx
  components/DiscountAnalysis.tsx
frontend/src/pages/marketing/
  page.tsx
  components/MarketingKPIs.tsx
  components/RoasTrend.tsx
  components/CppTrend.tsx
  components/AttributionGap.tsx
  components/CtrTrend.tsx
  components/MarketingCampaignTable.tsx
frontend/src/types/analytics.ts                    — all analytics TypeScript types
frontend/src/store/slices/analyticsSlice.ts        — Redux slice for all 3 pages
frontend/src/services/analytics/
  analytics.api.ts                                  — API call functions
  analytics.query.ts                                — React Query mutations (if any)
```

**Modify:**
- `frontend/src/components/layout/AppShell.tsx` — render Sidebar, adjust layout
- `frontend/src/App.tsx` — add 3 new routes
- `frontend/src/routes/route.tsx` — add route objects
- `backend/src/routes/index.ts` — register analytics router

---

## 6. API Endpoints

All new endpoints follow existing pattern: `GET /api/analytics/*?range=30d`

```
GET /api/analytics/net-revenue
GET /api/analytics/rto-by-state
GET /api/analytics/cod-vs-prepaid-rto
GET /api/analytics/geo-revenue
GET /api/analytics/logistics-costs
GET /api/analytics/cod-cashflow
GET /api/analytics/customer-overview
GET /api/analytics/customer-segments
GET /api/analytics/top-customers
GET /api/analytics/discount-analysis
GET /api/analytics/marketing-trend
GET /api/analytics/attribution-gap
GET /api/analytics/campaigns          (reuse existing, add cpp to response)
```

---

## 7. Redux State

```typescript
interface AnalyticsState {
  // Operations
  netRevenue: NetRevenue | null;
  rtoByState: RtoByStateRow[];
  codVsPrepaidRto: CodVsPrepaidRow[];
  geoRevenue: GeoRevenueRow[];
  logisticsCosts: LogisticsCosts | null;
  codCashFlow: CodCashFlow | null;
  // Customers
  customerOverview: CustomerOverview | null;
  customerSegments: CustomerSegmentRow[];
  topCustomers: TopCustomerRow[];
  discountAnalysis: DiscountRow[];
  // Marketing
  marketingTrend: MarketingTrendRow[];
  attributionGap: AttributionGap | null;
  // Shared
  loading: boolean;
  error: string | null;
}
```

Three thunks: `fetchOperations(range)`, `fetchCustomers(range)`, `fetchMarketing(range)` — each fetches only the data for that page.

---

## 8. Date Range

All pages share the same range selector pattern as the Dashboard (`7d`, `30d`, `mtd`). The analytics slice has its own `range` field defaulting to `'30d'`. Each page dispatches `fetchXxx(range)` on mount and on range change.

---

## 9. Design Language

Follows existing dashboard conventions:
- Brand colors: gold `#B8860B`, ivory `#FDFAF4`, ink `#1A1208`, emerald `#2D7D46`, ruby `#9B2235`
- Card style: `bg-white rounded-xl border border-parch shadow-card`
- Section headers: `text-xs font-medium uppercase tracking-wide text-muted`
- Charts: Recharts (already in project via RevenueChart)
- All monetary values formatted as INR with Indian numbering (L for lakh)
- All percentages to 1 decimal place

---

## 10. Out of Scope

- No new API integrations (all data from existing DB tables)
- No product variant deep-dive (separate sub-project if needed)
- No email alerts or scheduled reports
- No user permissions changes (all pages visible to all roles)
- No mobile responsive design changes beyond what Tailwind provides
