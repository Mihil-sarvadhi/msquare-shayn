# Finance Page — Storefront KPI Strip

**Date:** 2026-04-29
**Status:** Approved through architecture; awaiting plan
**Owner:** hemal@sarvadhi.com

## Goal

Add a six-tile KPI strip to the top of the Finance page that mirrors Shopify Admin's "Overview" KPIs and pulls every number directly from Shopify (no GA4 dependency). Tiles must respect the dashboard date-range picker, show a delta vs. the equivalent prior period, and match the existing dashboard's `KPICard` font/visual treatment.

The six tiles, left → right:

1. **Sessions**
2. **Gross sales**
3. **Returning customer rate**
4. **Orders fulfilled**
5. **Orders**
6. **Added to cart**

Sessions and Added-to-cart are not currently synced. They live in Shopify Analytics, reachable via the GraphQL Admin `shopifyqlQuery` API. This spec adds the connector, table, sync, and read path for those two metrics, and wires up the four already-derivable metrics on top of existing data.

## Non-goals

- Sessions-over-time chart (the dashed/solid line chart in the screenshot) — defer to a separate spec if needed.
- Replacing or restyling the existing 8-tile "Total Sales Breakdown" panel — it stays as-is, directly below the new strip.
- Bringing GA4 anywhere into this flow.
- Reconciling the unrelated ₹751 returns drift discussed earlier in the same session — separate concern.

## Architecture

Approach **A** (chosen): persist Shopify Analytics into a new daily-aggregated table, then read from it like any other Shopify dataset. Mirrors the existing connector → backfill → delta sync → repository → service pattern used by orders, refunds, returns.

### Data flow

```
Shopify GraphQL Admin API (shopifyqlQuery)
  ├── online_store_visitor_metrics       → daily sessions
  └── (online_store_*  cart-add metric)  → daily added-to-cart
        │
        ▼
shopify.connector.ts: fetchAnalyticsDaily()
        │
        ▼
shopify.backfill.ts: backfillAnalyticsDaily()  (one-shot, since 2023-01-01)
shopify.sync.ts:     syncAnalyticsDaily()      (hourly delta, trailing 7 days)
        │
        ▼
shopify_analytics_daily  (Postgres)
        │
        ▼
finance.service.ts: storefrontMetrics(from, to)
        │
        ▼
GET /api/finance/kpis  (extended response)
        │
        ▼
financeSlice.ts → StorefrontKpiStrip.tsx (renders shared KPICard ×6)
```

### Tile-by-tile sourcing

| Tile | Source | Formula |
|---|---|---|
| Sessions | `shopify_analytics_daily` | `SUM(sessions) WHERE date IN window` |
| Gross sales | existing `buildBreakdown` | `buildBreakdown(from,to).totals.gross_sales` — must reuse per project memory |
| Returning customer rate | `shopify_orders` | `COUNT(orders where ∃ prior order with same customer_id and created_at < this.created_at) / COUNT(orders) × 100` |
| Orders fulfilled | `shopify_orders` | `COUNT(*) WHERE fulfillment_status IN ('FULFILLED','PARTIALLY_FULFILLED') AND created_at IN window AND test = false` |
| Orders | `shopify_orders` | `COUNT(*) WHERE created_at IN window AND test = false` |
| Added to cart | `shopify_analytics_daily` | `SUM(added_to_cart) WHERE date IN window` |

Each tile also returns its previous-period value so the frontend can render `↑/↓ X% vs prev` exactly as the existing 8-tile panel does.

## Database

### Migration

```js
// 2026XXXXXXXXXX-create-shopify-analytics-daily.js
queryInterface.createTable('shopify_analytics_daily', {
  id:            { type: BIGINT, primaryKey: true, autoIncrement: true },
  source:        { type: TEXT, allowNull: false, defaultValue: 'shopify' },
  date:          { type: DATEONLY, allowNull: false },          // IST day, matches buildBreakdown bucketing
  sessions:      { type: INTEGER, allowNull: false, defaultValue: 0 },
  added_to_cart: { type: INTEGER, allowNull: false, defaultValue: 0 },
  synced_at:     { type: DATE, allowNull: false },
  created_at:    DATE,
  updated_at:    DATE,
});
queryInterface.addConstraint('shopify_analytics_daily', {
  fields: ['source', 'date'],
  type: 'unique',
  name: 'shopify_analytics_daily_source_date_uq',
});
queryInterface.addIndex('shopify_analytics_daily', ['date']);
```

### Sequelize model

`backend/src/db/models/ShopifyAnalyticsDaily.ts` — straightforward `Model.init` with the same shape as the migration. Registered in `backend/src/db/models/index.ts`.

## Backend

### Connector — `shopify.connector.ts`

Two new exports:

```ts
runShopifyQLQuery<T>(query: string): Promise<T>
fetchAnalyticsDaily(sinceDate: Date, untilDate: Date): Promise<AnalyticsDailyRow[]>

interface AnalyticsDailyRow { date: string; sessions: number; added_to_cart: number; }
```

`runShopifyQLQuery` calls the GraphQL `shopifyqlQuery` mutation (requires `read_analytics` scope on the access token).

`fetchAnalyticsDaily` runs two ShopifyQL queries:

```sql
-- Sessions
FROM online_store_visitor_metrics
SHOW total_sessions
SINCE :from UNTIL :to
GROUP BY day

-- Added to cart  (table name verified at impl time; see Risks)
FROM <cart-add table>
SHOW <cart-add metric>
SINCE :from UNTIL :to
GROUP BY day
```

Joins the two result sets on `date` and returns `[{date, sessions, added_to_cart}]`. Dates returned as ISO `YYYY-MM-DD` in store time zone (Asia/Kolkata).

### Backfill — `shopify.backfill.ts`

Add `backfillAnalyticsDaily()`. Single ShopifyQL call from `2023-01-01` to today (per the project's standard backfill anchor). `bulkCreate` with `updateOnDuplicate: ['sessions','added_to_cart','synced_at','updated_at']`. Idempotent.

Wired into the existing backfill orchestrator alongside `backfillOrders` etc.

### Sync — `shopify.sync.ts`

Add `syncAnalyticsDaily()`. Refreshes the trailing 7 days each run (Shopify Analytics may re-stamp events for ~2 days; 7 is a safe buffer). Same `bulkCreate ... updateOnDuplicate` write path. Hourly cadence — added to the existing scheduler config.

### Service — `finance.service.ts`

New helper:

```ts
async function storefrontMetrics(from: Date, to: Date): Promise<{
  sessions: number;
  added_to_cart: number;
  returning_customer_rate: number;   // 0-100
  orders_fulfilled: number;
  orders: number;
}>
```

Implementation: a single `sequelize.query` for the order-derived numbers (orders, orders_fulfilled, returning_customer_rate via a self-join checking each row's customer's prior `created_at`), plus one `sequelize.query` against `shopify_analytics_daily` for the two analytics counts. Each is a standalone CTE so the engine can run them in parallel via `Promise.all`.

`getKpis(from, to)` is extended to call `storefrontMetrics(from, to)` and `storefrontMetrics(prevFrom, prevTo)` in parallel and pack each metric as `{ value, previous }`. Gross sales for the strip is read from the existing `buildBreakdown` flow (already invoked); no second computation.

### Types — `finance.types.ts`

```ts
interface KpiPair { value: number; previous: number; }

interface FinanceKpis {
  // existing
  gross_revenue: number;
  total_discounts: number;
  total_tax: number;
  total_shipping: number;
  total_refunds: number;
  net_revenue: number;
  refund_count: number;
  order_count: number;
  // new — for the storefront strip
  sessions: KpiPair;
  added_to_cart: KpiPair;
  returning_customer_rate: KpiPair;   // 0-100
  orders_fulfilled: KpiPair;
  orders: KpiPair;
}
```

API path stays at `GET /api/finance/kpis`. No new route. No breaking change to existing fields.

## Frontend

### Shared component move

`frontend/src/pages/dashboard/components/KPICard.tsx` → `frontend/src/components/shared/KPICard.tsx`. Two consumers (dashboard + finance) make it shared per the react.md "shared UI" rule. Update dashboard import in the same change.

The component already supports `label`, `value`, `accent`, `icon`. Extend with optional `delta?: number | null` (a percent value; null → render `—`) and a `deltaLabel?: string` (default `vs prev`). Internal rendering: small line under the value, `↑/↓ X.X% deltaLabel`, color-coded `var(--pos)` / `var(--neg)` matching the existing 8-tile panel and AOV chart.

### New strip — `frontend/src/pages/finance/components/StorefrontKpiStrip.tsx`

```tsx
export function StorefrontKpiStrip() {
  const k = useAppSelector((s) => s.finance.kpis);
  const breakdown = useAppSelector((s) => s.finance.salesBreakdown);
  if (!k || !breakdown) return null;

  const tiles = [
    { label: 'Sessions',                 value: k.sessions,                fmt: formatNum, },
    { label: 'Gross sales',              value: { value: breakdown.current.totals.gross_sales,
                                                   previous: breakdown.previous.totals.gross_sales },
                                          fmt: formatINRFull, },
    { label: 'Returning customer rate',  value: k.returning_customer_rate, fmt: (v) => `${v.toFixed(2)}%`, },
    { label: 'Orders fulfilled',         value: k.orders_fulfilled,        fmt: formatNum, },
    { label: 'Orders',                   value: k.orders,                  fmt: formatNum, },
    { label: 'Added to cart',            value: k.added_to_cart,           fmt: formatNum, },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {tiles.map((t) => {
        const delta = t.value.previous !== 0
          ? ((t.value.value - t.value.previous) / Math.abs(t.value.previous)) * 100
          : null;
        return (
          <KPICard
            key={t.label}
            label={t.label}
            value={t.fmt(t.value.value)}
            delta={delta}
          />
        );
      })}
    </div>
  );
}
```

### Page wiring — `frontend/src/pages/finance/page.tsx`

Render `<StorefrontKpiStrip />` as the first child of `<main>`, before the existing "Total Sales Breakdown" panel. No other reordering. The strip subscribes to the same `s.finance.kpis` and `s.finance.salesBreakdown` slices the rest of the page already uses, so the existing `fetchFinanceOverview(range)` effect supplies its data — no new dispatch, no new effect.

### Redux

`financeSlice.ts` requires no shape change beyond what the extended `FinanceKpis` type already implies — `kpis` field already holds the response. Make sure the slice's `FinanceKpis` import resolves to the updated type.

## Date range and comparison

The strip uses the same Redux `range` slice that powers every other Finance widget. Comparison window is computed in the backend (`getKpis` already pairs current with `prevFrom = prevTo - (to - from)`). Each tile's `previous` is for that auto-computed prior window — exactly the pattern the existing 8-tile panel uses, so the deltas across the page are internally consistent.

## Risks and verifications

1. **`shopifyqlQuery` plan/scope gate.** The mutation requires `read_analytics`. Some lower-tier plans gate it. **Verification:** during impl, the very first step is to run a smoke ShopifyQL query against the live store. If it fails with a plan/scope error, halt the plan and discuss fallback (A3 — approximate from abandoned_checkouts) before continuing.
2. **Cart-add table name.** I described the table generically as "online_store_* schema" because Shopify's ShopifyQL reference moves around. **Verification:** during impl, before writing the connector, query Shopify's `__schema` introspection or the docs portal to lock the exact table and metric. Candidates seen in the wild: `online_store_session_metrics.cart_completed_sessions`, pixel events under `events`, or `cart_events`.
3. **Returning-customer-rate definition drift.** Shopify Admin's wording is "orders placed by customers with at least one prior order." **Verification:** after impl, compare a known window's value to Shopify Admin's Overview report. Same as how the existing buildBreakdown was tuned.
4. **Time-zone bucketing.** ShopifyQL `GROUP BY day` buckets in the store's time zone (Asia/Kolkata for Shayn). The existing buildBreakdown also buckets by IST day. **Verification:** spot-check one day's row against Shopify Admin's "Sessions over time" chart to confirm bucket boundaries align before flipping the feature on.
5. **Backfill cost.** ~3 years × 2 metrics ≈ 2,200 rows. Trivial. No paging concern, but the ShopifyQL response is bounded — if Shopify caps at e.g. 1,000 rows per query we'll need to chunk by year. **Verification:** test the backfill query end-to-end and check row count vs expected `(today − 2023-01-01)` in days.

## Testing

- **Backend unit:** mock `runShopifyQLQuery` to return a known fixture; assert `fetchAnalyticsDaily` joins the two metrics correctly per date.
- **Backend integration:** seed a 7-day window of `shopify_analytics_daily` rows, hit `GET /api/finance/kpis`, assert `sessions.value` and `added_to_cart.value` match the seeded sums for the window and `previous` matches the prior 7-day window.
- **Frontend:** Vitest snapshot of `StorefrontKpiStrip` with a fixture Redux state; assert all six tiles render with the correct labels and that delta arrows flip color on positive/negative.
- **Manual verification:** after backfill completes, spot-check one tile value at a time against Shopify Admin's Overview for the same date range. All six must match.

## Out of scope (deferrable)

- Sessions-over-time line chart (the dashed/solid graph at the top of the screenshot).
- Conversion-rate funnel widget.
- Drill-down from a tile into a per-day breakdown.
- Channel-level split of sessions (we only store one number per day).
