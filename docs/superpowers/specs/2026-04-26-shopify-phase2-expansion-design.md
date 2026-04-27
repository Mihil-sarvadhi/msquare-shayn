# Shopify Phase 2 Expansion — Design Spec

**Date:** 2026-04-26
**Status:** Draft (awaiting user review)
**Scope:** Backend sync + DB + REST endpoints + Frontend dashboard/pages for three new domains: Finance, Catalog & Inventory, Marketing & Risk.

---

## 1. Goal & Motivation

The current Shopify integration syncs Orders, Customers, Order Line Items, and Abandoned Checkouts. The founder needs the MIS dashboard to show the **complete business picture**: true net revenue (after refunds, fees, taxes), what's selling and what's stuck in inventory, marketing campaign ROI, and operational risks like chargebacks.

This spec adds the missing Shopify domains in three coherent vertical slices that each ship a working backend → DB → API → dashboard tile end-to-end.

**Slices (in order):**
1. **Finance Truth** — Refunds, Transactions, Payouts, Balance Transactions
2. **Catalog & Inventory** — Products, Variants, Inventory Items (incl. COGS), Inventory Levels, Locations
3. **Marketing & Risk** — Discount Codes, Price Rules, Gift Cards, Disputes

---

## 2. Key Decisions (Locked During Brainstorming)

| Decision | Choice |
|---|---|
| Sequencing | Three slices, in order Finance → Inventory → Marketing/Risk |
| Real-time webhooks | **No** — 15-min poll for everything except existing `orders/create` and `orders/updated` webhooks |
| Marketplace abstraction | **Source-agnostic schema** for all NEW tables. Existing `shopify_*` tables stay as-is. Future marketplaces (Myntra, Amazon, Flipkart, Unicommerce) plug in by inserting rows with a different `source` value — zero schema change |
| Backfill range | **Jan 1, 2023 → today** (locked for ALL connectors, never asked again) |
| UI scope (per slice) | Backend + dashboard tiles + dedicated full page |
| COGS source | Shopify `inventory_items.cost`. If null → margin shows "N/A" in UI |
| TopNav | Separate top-level links for Finance / Catalog / Marketing / Risk |

---

## 3. Architecture

### 3.1 Source-Agnostic Schema

Every new table includes:

- `source` ENUM: `'shopify' | 'myntra' | 'amazon' | 'flipkart' | 'unicommerce'` (only `'shopify'` enabled now)
- `source_<entity>_id` STRING — the marketplace's native identifier
- `source_metadata` JSONB — marketplace-specific fields that don't fit the unified schema
- `created_at`, `updated_at`, `synced_at` TIMESTAMP
- Composite unique index on `(source, source_<entity>_id)`

Existing `shopify_orders`, `shopify_customers`, `shopify_order_lineitems`, `shopify_abandoned_checkouts` are **not** renamed or migrated. Foreign keys from new tables (e.g., `orders_refunds.order_id`) reference `shopify_orders.order_id` for now. When the orders table itself is later unified, that becomes a separate cleanup migration.

### 3.2 Backend Module Structure

```
backend/src/modules/
  shopify/                  # existing connector, gets new fetch methods
    shopify.connector.ts
    shopify.sync.ts
    shopify.backfill.ts
    shopify.mapper.ts
    (new) refunds, transactions, payouts, balance-transactions, products,
          variants, inventory-items, inventory-levels, locations,
          discount-codes, price-rules, gift-cards, disputes — fetch methods
  finance/                  # NEW (slice 1)
    refunds.repository.ts
    transactions.repository.ts
    payouts.repository.ts
    balance-transactions.repository.ts
    finance.service.ts
    finance.controller.ts
    finance.routes.ts
    finance.types.ts
  catalog/                  # NEW (slice 2)
    products.repository.ts
    variants.repository.ts
    inventory.repository.ts
    locations.repository.ts
    catalog.service.ts
    catalog.controller.ts
    catalog.routes.ts
    catalog.types.ts
  marketing/                # NEW (slice 3)
    discount-codes.repository.ts
    price-rules.repository.ts
    gift-cards.repository.ts
    disputes.repository.ts
    marketing.service.ts
    marketing.controller.ts
    marketing.routes.ts
    marketing.types.ts
```

The Shopify module owns marketplace-specific fetch logic (GraphQL queries, bulk operations). Cross-source domain modules own business logic and queries.

---

## 4. Sync & Backfill Strategy

### 4.1 Backfill (one-time, admin-triggered)

- `POST /api/sync/shopify/backfill?resource=<name>` — backfill a single resource
- `POST /api/sync/shopify/backfill/all` — runs every resource sequentially with progress logged
- Window: `2023-01-01` → today
- **Bulk Operations** for high-volume historical resources: orders/refunds, orders/transactions, payouts, balance_transactions, products, variants
- **Paginated GraphQL** for low-volume snapshot-friendly resources: locations, inventory_items, inventory_levels, discount_codes, price_rules, gift_cards, disputes
- Idempotent — upsert on `(source, source_<entity>_id)`, safe to re-run
- Resumable — `sync_cursors.last_bulk_op_id` tracks in-flight bulk ops

### 4.2 Incremental Sync (15-min cron, automatic)

Joins the existing 15-min Shopify cron tick. Two modes per resource:

- **Delta sync** (`updated_at >= sync_cursors.last_synced_at`): refunds, transactions, payouts, balance_transactions, products, variants, discount_codes, price_rules, disputes, gift_cards
- **Snapshot sync** (full re-fetch every tick — small datasets): locations, inventory_items, inventory_levels

Each resource sync wrapped in try/catch — one failure does not block other resources. Failures recorded in existing `connector_health` table.

### 4.3 Rate Limits

- Bulk operations are async (poll for completion) — no rate-limit pressure
- Paginated GraphQL respects Shopify's cost-based throttle via existing connector
- 429 → exponential backoff retry (existing connector behavior)

---

## 5. Data Model

Standard columns (omitted from per-table listings below): `id` PK, `source` enum, `source_<entity>_id`, `created_at`, `updated_at`, `synced_at`, `source_metadata` JSONB, composite unique index on `(source, source_<entity>_id)`.

### 5.1 Slice 1 — Finance

```
orders_refunds
  order_id                FK → shopify_orders.order_id
  refund_amount           DECIMAL(12,2)
  refund_currency         STRING(3)
  reason                  STRING
  refunded_at             TIMESTAMP
  restocked               BOOLEAN
  refund_line_items       JSONB    -- [{sku, qty, amount, restock_type}]

orders_transactions
  order_id                FK → shopify_orders.order_id
  kind                    ENUM('sale','authorization','capture','refund','void')
  status                  ENUM('success','pending','failure','error')
  gateway                 STRING   -- 'shopify_payments','razorpay','cod','paytm'...
  amount                  DECIMAL(12,2)
  currency                STRING(3)
  payment_method          STRING   -- 'card','upi','cod','netbanking'
  processed_at            TIMESTAMP
  parent_transaction_id   STRING   -- nullable, for refund→capture linkage

payouts
  payout_date             DATE
  status                  ENUM('scheduled','in_transit','paid','failed','cancelled')
  amount                  DECIMAL(12,2)   -- net deposited to bank
  currency                STRING(3)
  bank_summary            JSONB           -- { bank_name, masked_account }
  charges_gross           DECIMAL(12,2)
  refunds_gross           DECIMAL(12,2)
  adjustments_gross       DECIMAL(12,2)
  fees_total              DECIMAL(12,2)

balance_transactions
  payout_id               FK → payouts (nullable until payout settles)
  transaction_id          STRING       -- maps to orders_transactions.source_transaction_id
  type                    ENUM('charge','refund','adjustment','fee','dispute','reserve')
  amount                  DECIMAL(12,2)
  fee                     DECIMAL(12,2)
  net                     DECIMAL(12,2)
  processed_at            TIMESTAMP
```

### 5.2 Slice 2 — Catalog & Inventory

```
products
  title                   STRING
  vendor                  STRING
  product_type            STRING        -- 'Ring','Necklace','Earring' etc.
  status                  ENUM('active','draft','archived')
  tags                    STRING[]
  handle                  STRING
  published_at            TIMESTAMP
  image_url               STRING
  total_variants          INTEGER

product_variants
  product_id              FK → products
  sku                     STRING (indexed)
  title                   STRING        -- 'Gold / Size 6'
  price                   DECIMAL(12,2)
  compare_at_price        DECIMAL(12,2)
  weight_grams            DECIMAL(8,2)
  barcode                 STRING
  inventory_item_id       STRING        -- → inventory_items.source_inventory_item_id
  position                INTEGER

inventory_items
  variant_id              FK → product_variants
  cost                    DECIMAL(12,2) NULL   -- COGS, may be null
  tracked                 BOOLEAN
  hsn_code                STRING               -- Indian GST classification
  country_of_origin       STRING(2)

inventory_levels
  inventory_item_id       FK → inventory_items
  location_id             FK → locations
  available               INTEGER
  on_hand                 INTEGER
  committed               INTEGER

locations
  name                    STRING
  address                 JSONB
  active                  BOOLEAN
  fulfills_online_orders  BOOLEAN
```

### 5.3 Slice 3 — Marketing & Risk

```
price_rules
  title                   STRING
  value_type              ENUM('percentage','fixed_amount')
  value                   DECIMAL(12,2)
  target_type             ENUM('line_item','shipping_line')
  starts_at               TIMESTAMP
  ends_at                 TIMESTAMP
  usage_limit             INTEGER
  customer_selection      STRING        -- 'all','prerequisite'
  prerequisite_subtotal   DECIMAL(12,2)

discount_codes
  price_rule_id           FK → price_rules
  code                    STRING (indexed)
  usage_count             INTEGER

gift_cards
  code_last4              STRING(4)     -- never store full code
  initial_value           DECIMAL(12,2)
  balance                 DECIMAL(12,2)
  currency                STRING(3)
  customer_id             STRING
  expires_on              DATE
  disabled_at             TIMESTAMP
  status                  ENUM('enabled','disabled','expired')

disputes
  order_id                FK → shopify_orders.order_id
  amount                  DECIMAL(12,2)
  currency                STRING(3)
  reason                  STRING        -- 'fraudulent','product_unacceptable','duplicate'...
  status                  ENUM('needs_response','under_review','charge_refunded','accepted','won','lost')
  evidence_due_by         TIMESTAMP    -- critical for SLA alerting (later)
  finalized_on            DATE
  network_reason_code     STRING
```

### 5.4 Operational

```
sync_cursors
  source                  ENUM
  resource                STRING        -- 'refunds','products',...
  last_synced_at          TIMESTAMP
  last_bulk_op_id         STRING        -- for resumable bulk ops
  status                  ENUM('idle','running','failed')
  error_message           TEXT
  PRIMARY KEY (source, resource)
```

### 5.5 Migration Order

One migration file per table, in order:

1. `locations`
2. `products`
3. `product_variants`
4. `inventory_items`
5. `inventory_levels`
6. `orders_refunds`
7. `orders_transactions`
8. `payouts`
9. `balance_transactions`
10. `price_rules`
11. `discount_codes`
12. `gift_cards`
13. `disputes`
14. `sync_cursors`

All migrations are additive — no destructive changes to existing `shopify_*` tables.

---

## 6. API Endpoints

All endpoints follow existing patterns: `handleApiResponse`, Zod-validated query params, JWT-protected (`authenticate` middleware), pagination where relevant.

### 6.1 Sync (admin role required)

```
POST /api/sync/shopify/backfill/all
POST /api/sync/shopify/backfill?resource=<name>
POST /api/sync/shopify/incremental                   -- manual trigger of cron job
GET  /api/sync/cursors                               -- monitoring
```

### 6.2 Slice 1 — Finance

```
GET /api/finance/kpis                ?from&to
  -> { gross_revenue, total_discounts, total_tax, total_shipping,
       total_refunds, net_revenue, payouts_received, shopify_fees,
       fees_pct, refund_rate, refund_count }

GET /api/finance/revenue-breakdown   ?from&to&group_by=day|week|month
  -> timeseries [{ date, gross, discounts, refunds, tax, net }]

GET /api/finance/payouts             ?from&to&page&limit&status
GET /api/finance/payouts/:id         -- payout + balance_transactions + reconciliation

GET /api/finance/refunds             ?from&to&page&limit&reason
GET /api/finance/refunds/summary     -- refund-rate over time, top reasons, refunds by SKU

GET /api/finance/transactions        ?from&to&page&limit&gateway&kind
GET /api/finance/payment-method-split ?from&to
  -> { cod: {...}, prepaid: {...}, breakdown_by_gateway: [...] }
```

### 6.3 Slice 2 — Catalog & Inventory

```
GET /api/catalog/products            -- paginated, filter by status/vendor/type
GET /api/catalog/products/:id        -- product + variants + inventory
GET /api/catalog/best-sellers        ?from&to
GET /api/catalog/slow-movers         ?from&to&days_inactive
GET /api/catalog/inventory           -- variant-level stock across locations
GET /api/catalog/stockouts           -- variants with available <= threshold
GET /api/catalog/margin              -- per-SKU gross margin (price - cost), N/A if no cost
GET /api/catalog/locations
```

### 6.4 Slice 3 — Marketing & Risk

```
GET /api/marketing/discount-codes
GET /api/marketing/discount-codes/:code/performance
GET /api/marketing/price-rules
GET /api/marketing/gift-cards/liability     -- outstanding total
GET /api/marketing/gift-cards               -- paginated list

GET /api/risk/disputes                      ?status&from&to
GET /api/risk/disputes/active               -- only open with evidence_due_by
GET /api/risk/disputes/summary              -- count + $ at risk + win/loss rate
```

Existing endpoints stay unchanged.

---

## 7. Frontend

Stack: Vite + React 19 + Redux Toolkit + Tailwind + React Query (mutations) + Recharts (existing chart lib).

### 7.1 Slice 1 — Finance

**Dashboard (existing page) additions:**
- New KPI row of 4 tiles at top: True Net Revenue, Cash Received (Payouts), Shopify Fees %, Refund Rate
- Each tile: value, period delta vs prior period, sparkline

**New page `/finance`** (TopNav link):
- Header: `DateRangePicker` + connector health badge
- Row 1 KPIs: Gross Revenue, Discounts, Tax, Shipping, Refunds, **Net Revenue** (prominent)
- Row 2 charts: stacked bar (gross/discounts/refunds/tax/net) over time + payment-method donut (COD vs Prepaid + gateway split)
- Row 3 Payouts table: paginated, columns [date, status, amount, fees, txn count] → click opens detail modal with linked balance_transactions
- Row 4 Refunds: refund-rate line chart + paginated refunds table [date, order, amount, reason]

**Redux:** `financeSlice`, `payoutsSlice`, `refundsSlice`, `transactionsSlice`
**Service:** `src/services/finance/finance.api.ts`

### 7.2 Slice 2 — Catalog & Inventory

**Dashboard additions:**
- KPI tiles: Active SKUs, Stockouts (count), Avg Gross Margin %

**New page `/catalog`** (TopNav link), tabs:
- **Products** — searchable/filterable table [image, title, SKU count, status, vendor, type, total inventory]
- **Inventory** — variant-level table [SKU, product, per-location stock chips, total available, low-stock badge ≤5]
- **Performance** — Best Sellers bar chart (top 20, units/revenue toggle) + Slow Movers list + Margin table [SKU, price, cost, margin %, "N/A" if cost missing]

**Redux:** `productsSlice`, `variantsSlice`, `inventorySlice`, `locationsSlice`
**Service:** `src/services/catalog/catalog.api.ts`

### 7.3 Slice 3 — Marketing & Risk

**Dashboard additions:**
- KPI tiles: Active Discount Codes, Gift Card Liability, Open Disputes ($ at risk)

**New page `/marketing`** (TopNav link), tabs:
- **Campaigns** — active price rules table [title, type, value, dates, usage count, redemption %]
- **Discount Codes** — [code, rule, usage_count, attributed revenue, conversion rate]
- **Gift Cards** — outstanding liability KPI + paginated table [last4, balance, expires, status]

**New page `/risk`** (TopNav link):
- KPI row: Open Disputes, $ at Risk, Win Rate (90d), Avg Time to Win
- Active Disputes table — [order, amount, reason, status, **evidence due in countdown**, Open in Shopify Admin button]
- Resolved disputes history with W/L outcome chart

**Redux:** `discountsSlice`, `giftCardsSlice`, `disputesSlice`
**Services:** `src/services/marketing/marketing.api.ts`, `src/services/risk/risk.api.ts`

### 7.4 Cross-Cutting Frontend

- TopNav: separate top-level links — Finance / Catalog / Marketing / Risk
- Tables: existing pagination + filter patterns
- Charts: same library already in dashboard (Recharts)
- Date range: reuse `DateRangePicker` and `rangeSlice`
- Mutations (sync triggers): React Query + toast on success/error per `react.md`
- Error boundaries on each new route
- Loading: existing `ModernLoader` / `PageLoader`
- All API response types use `snake_case` in `src/types/{feature}-api.ts`; app-level types use `camelCase` in `src/types/{feature}.ts`
- All Zod schemas (if any forms added later) in `src/utils/validations/index.ts`

---

## 8. Testing

### 8.1 Backend
- Unit tests on each repository (mocked Sequelize) — happy path + edge cases (null cost, missing payout linkage)
- Service-layer tests on KPI aggregations — verify net revenue math: `net_revenue = gross_revenue - total_discounts - total_refunds - total_tax - total_shipping` (using order subtotals; tax and shipping are pass-through, not income)
- Integration test on one end-to-end backfill resource (orders/refunds) using a Shopify dev store fixture
- Connector throttle/retry tested with mock 429s

### 8.2 Frontend
- Vitest for Redux slice reducers (KPI fetch fulfilled/rejected)
- MSW for API service tests
- Component tests on KPI tiles (loading/error/empty states)

---

## 9. Error Handling, Operations, Security

### 9.1 Errors
- Backend: `AppError` per `node.md`. Each sync writes to existing `connector_health` table per resource
- Frontend: error boundaries per route, toast on mutation failures, "N/A" fallbacks on missing data

### 9.2 Operations
- Backfill = manual admin trigger only (no cron) — prevents accidental re-runs
- Incremental sync joins existing 15-min Shopify cron tick
- Logger.info on each sync start/end with row counts; logger.error on failures
- `connector_health` row per resource so existing health dashboard surfaces per-resource state

### 9.3 Security
- All new endpoints require JWT (`authenticate`)
- Backfill endpoints additionally require `ADMIN` role (`authorizeByRole`)
- Existing webhooks unchanged — HMAC-verified
- Gift card codes: store last4 only

---

## 10. Out of Scope (Deferred)

- Real-time webhooks for refunds/inventory/disputes (stick with 15-min poll for now)
- Dispute SLA alerting (Slack/email) — schema supports it via `evidence_due_by`, alerting layer is a future task
- Order table unification (collapse `shopify_orders` into source-agnostic `orders`) — separate cleanup migration when 2nd marketplace integrates
- COGS via CSV upload — only Shopify-native cost field for now
- Returns API (separate from refunds) — Shopify's RMA flow, future enhancement
- Marketing events / Shopify-attributed campaigns API
- ShopifyQL native analytics
- Multi-currency normalization (Shayn appears to be INR-only today)

---

## 11. Future Marketplaces (Architectural Readiness)

When Myntra / Amazon / Flipkart / Unicommerce arrive:

1. Add new `source` enum value
2. Build a new connector module under `backend/src/modules/{marketplace}/`
3. Connector maps marketplace responses into the same source-agnostic tables (insert rows with `source = '{marketplace}'`)
4. Marketplace-specific fields go into `source_metadata` JSONB
5. Domain modules (finance, catalog, marketing) keep working unchanged because they query by source-agnostic columns
6. Dashboard adds a "source" filter at the top — same KPIs, filtered by marketplace or aggregated across all

No schema migration required for any future marketplace addition.

---

## 12. Step-by-Step Execution Plan

Each step is independently completable, testable, and shippable. Steps within a slice are sequential (later steps depend on earlier). Slices are sequential (Slice 2 depends on Slice 1's `sync_cursors` table; Slice 3 depends on Slice 2's catalog tables for code-attribution analytics).

### Slice 0 — Foundation (prerequisites for all slices)

- **Step 0.1** — Create `sync_cursors` migration + Sequelize model
- **Step 0.2** — Add backfill orchestrator scaffolding (`/api/sync/shopify/backfill/all`, `/api/sync/shopify/backfill?resource=`) and the cursor-update helper used by every resource sync
- **Step 0.3** — Add the `source` enum constant + shared types in `backend/src/constant/` and `backend/src/types/` for use across all new tables
- **Step 0.4** — Add `ADMIN`-role guard on backfill routes
- **Step 0.5** — Verify: trigger `/api/sync/shopify/backfill/all` returns 200 with empty resource list (no resources registered yet)

### Slice 1 — Finance Truth

**Backend**
- **Step 1.1** — Migration + model: `locations` (small, used as FK by inventory later, but also useful here for payout/transaction location attribution)
- **Step 1.2** — Migration + model: `orders_refunds`
- **Step 1.3** — Migration + model: `orders_transactions`
- **Step 1.4** — Migration + model: `payouts`
- **Step 1.5** — Migration + model: `balance_transactions`
- **Step 1.6** — Shopify connector: add `fetchRefunds` (bulk op for backfill, paginated for delta)
- **Step 1.7** — Shopify connector: add `fetchTransactions` (bulk op for backfill, paginated for delta)
- **Step 1.8** — Shopify connector: add `fetchPayouts` + `fetchBalanceTransactions` (paginated)
- **Step 1.9** — Shopify connector: add `fetchLocations` (snapshot)
- **Step 1.10** — Mapper: Shopify response → unified row shape for each resource
- **Step 1.11** — Repositories: `refunds.repository.ts`, `transactions.repository.ts`, `payouts.repository.ts`, `balance-transactions.repository.ts` (raw-SQL reads, Sequelize upserts for writes per `node.md`)
- **Step 1.12** — Service: `finance.service.ts` with KPI aggregator, breakdown, payment-method split, refund summary
- **Step 1.13** — Controller + routes: `finance.controller.ts`, `finance.routes.ts` — wire all `/api/finance/*` endpoints
- **Step 1.14** — Register Slice 1 resources in backfill orchestrator + 15-min cron tick
- **Step 1.15** — Backend tests: repository unit tests + service KPI math test
- **Step 1.16** — Verify: run backfill, confirm row counts via `/api/sync/cursors`, confirm KPI endpoint returns realistic numbers

**Frontend**
- **Step 1.17** — API service: `frontend/src/services/finance/finance.api.ts`
- **Step 1.18** — Redux slices: `financeSlice`, `payoutsSlice`, `refundsSlice`, `transactionsSlice` registered in `rootReducer`
- **Step 1.19** — Types: `src/types/finance-api.ts` (snake_case) + `src/types/finance.ts` (camelCase)
- **Step 1.20** — Add 4 new KPI tiles to existing dashboard top row
- **Step 1.21** — New page `/finance` — header, KPI row, revenue breakdown chart, payment method donut
- **Step 1.22** — Payouts table on `/finance` + payout detail modal with balance_transactions list
- **Step 1.23** — Refunds table + refund-rate chart on `/finance`
- **Step 1.24** — TopNav: add "Finance" link
- **Step 1.25** — Frontend tests: slice reducer tests, KPI tile component tests
- **Step 1.26** — Verify: full flow in browser — date range change, drill-into payout, KPI math matches Shopify admin

**Slice 1 ship gate:** lint passes, build passes, tests pass, founder can see "True Net Revenue" tile on dashboard with real data from Jan 2023 to today.

### Slice 2 — Catalog & Inventory

**Backend**
- **Step 2.1** — Migration + model: `products`
- **Step 2.2** — Migration + model: `product_variants`
- **Step 2.3** — Migration + model: `inventory_items` (includes nullable `cost`)
- **Step 2.4** — Migration + model: `inventory_levels`
- **Step 2.5** — Shopify connector: `fetchProducts` (bulk op for backfill)
- **Step 2.6** — Shopify connector: `fetchVariants` (bulk op for backfill — usually nested in products bulk op)
- **Step 2.7** — Shopify connector: `fetchInventoryItems` (paginated snapshot — pulls `cost`)
- **Step 2.8** — Shopify connector: `fetchInventoryLevels` (paginated snapshot per location)
- **Step 2.9** — Mapper: Shopify → unified rows
- **Step 2.10** — Repositories for products/variants/inventory/locations
- **Step 2.11** — Service: `catalog.service.ts` — best-sellers query, slow-movers query, stockouts query, margin computation (returns null for SKUs without cost)
- **Step 2.12** — Controller + routes: `catalog.controller.ts`, `catalog.routes.ts`
- **Step 2.13** — Register Slice 2 resources in backfill + cron
- **Step 2.14** — Backend tests
- **Step 2.15** — Verify: backfill populates products/variants/inventory; `/api/catalog/margin` returns mix of values + N/A

**Frontend**
- **Step 2.16** — API service: `catalog.api.ts`
- **Step 2.17** — Redux slices: products/variants/inventory/locations
- **Step 2.18** — Types
- **Step 2.19** — Add 3 new KPI tiles to dashboard (Active SKUs, Stockouts, Avg Margin %)
- **Step 2.20** — New page `/catalog` with Products / Inventory / Performance tabs
- **Step 2.21** — TopNav: add "Catalog" link
- **Step 2.22** — Frontend tests
- **Step 2.23** — Verify in browser

**Slice 2 ship gate:** lint, build, tests pass; `/catalog` shows real product data; stockout count is non-zero or zero per actual inventory state.

### Slice 3 — Marketing & Risk

**Backend**
- **Step 3.1** — Migration + model: `price_rules`
- **Step 3.2** — Migration + model: `discount_codes`
- **Step 3.3** — Migration + model: `gift_cards`
- **Step 3.4** — Migration + model: `disputes`
- **Step 3.5** — Shopify connector: `fetchPriceRules`, `fetchDiscountCodes` (paginated)
- **Step 3.6** — Shopify connector: `fetchGiftCards` (paginated; never persist full code, only last4)
- **Step 3.7** — Shopify connector: `fetchDisputes` (paginated)
- **Step 3.8** — Mapper
- **Step 3.9** — Repositories: discount-codes, price-rules, gift-cards, disputes
- **Step 3.10** — Service: `marketing.service.ts` — code-performance aggregation joins to `shopify_orders.discount_codes`, gift-card liability sum
- **Step 3.11** — Controller + routes: `marketing.controller.ts`, `marketing.routes.ts` (also `/api/risk/disputes/*`)
- **Step 3.12** — Register Slice 3 resources in backfill + cron
- **Step 3.13** — Backend tests
- **Step 3.14** — Verify

**Frontend**
- **Step 3.15** — API services: `marketing.api.ts`, `risk.api.ts`
- **Step 3.16** — Redux slices: discounts, gift-cards, disputes
- **Step 3.17** — Types
- **Step 3.18** — Add 3 KPI tiles (Active Discount Codes, Gift Card Liability, Open Disputes $)
- **Step 3.19** — New page `/marketing` with Campaigns / Discount Codes / Gift Cards tabs
- **Step 3.20** — New page `/risk` — KPIs + Active Disputes table with evidence countdown + history chart
- **Step 3.21** — TopNav: add "Marketing" + "Risk" links
- **Step 3.22** — Frontend tests
- **Step 3.23** — Verify in browser

**Slice 3 ship gate:** lint, build, tests pass; `/marketing` and `/risk` populated.

### Final Step (after all slices)

- **Step F.1** — Update `PROGRESS.md` per task-execution protocol with completed module summary
- **Step F.2** — Smoke-test full flow: trigger `/api/sync/shopify/backfill/all`, wait for completion, verify all dashboard tiles render real data
- **Step F.3** — Document the runbook: how to monitor `connector_health` + `sync_cursors`, how to re-trigger a single resource backfill if needed

