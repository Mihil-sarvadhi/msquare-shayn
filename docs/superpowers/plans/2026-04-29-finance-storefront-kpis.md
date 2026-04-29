# Finance Storefront KPI Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a six-tile KPI strip to the top of the Finance page showing Sessions, Gross sales, Returning customer rate, Orders fulfilled, Orders, and Added to cart — sourced entirely from Shopify (no GA4).

**Architecture:** Mirror the existing Shopify `connector → backfill → sync → repository → service` pattern. Add a new `shopify_analytics_daily` table fed by Shopify's `shopifyqlQuery` GraphQL API for sessions and add-to-cart events. Order-derived metrics come from existing `shopify_orders`. Gross sales reuses `buildBreakdown` per project memory. Frontend reuses the dashboard's `KPICard` (moved to `components/shared/`) extended with a delta prop.

**Tech Stack:** Express · Sequelize 6 · PostgreSQL · Shopify GraphQL Admin API (`shopifyqlQuery` mutation) · React 19 · Redux Toolkit · Tailwind CSS · Recharts.

**Spec:** `docs/superpowers/specs/2026-04-29-finance-storefront-kpis-design.md`

---

## Task 1: Smoke-test Shopify Analytics access (GATE)

**Goal:** Confirm the store's access token can call `shopifyqlQuery` before writing any production code. If this fails with a plan/scope error, halt and discuss fallback.

**Files:**
- Create: `backend/src/scripts/probe-shopifyql.ts`

- [ ] **Step 1: Write probe script**

```ts
// backend/src/scripts/probe-shopifyql.ts
/* eslint-disable no-console */
import 'dotenv/config';
import { graphqlRequest } from '@modules/shopify/shopify.connector';

const PROBE = `
  mutation Probe {
    shopifyqlQuery(query: "FROM sales SHOW total_sales SINCE -7d UNTIL today GROUP BY day") {
      __typename
      ... on TableResponse {
        tableData { columns { name dataType } rowData unformattedData }
      }
      parseErrors { code message range { start { line character } end { line character } } }
    }
  }
`;

async function main() {
  type Resp = {
    shopifyqlQuery: {
      __typename: string;
      tableData?: { columns: Array<{ name: string; dataType: string }>; rowData: string[][]; unformattedData: string[][] };
      parseErrors?: Array<{ code: string; message: string }>;
    };
  };
  const data = await graphqlRequest<Resp>(PROBE, {});
  console.log('typename:', data.shopifyqlQuery.__typename);
  console.log('parseErrors:', JSON.stringify(data.shopifyqlQuery.parseErrors ?? [], null, 2));
  console.log('columns:', data.shopifyqlQuery.tableData?.columns);
  console.log('row count:', data.shopifyqlQuery.tableData?.rowData?.length ?? 0);
  console.log('first 3 rows:', data.shopifyqlQuery.tableData?.unformattedData?.slice(0, 3));
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run probe**

```bash
cd backend && npx tsx src/scripts/probe-shopifyql.ts
```

Expected: `typename: TableResponse`, `parseErrors: []`, ≥1 row of `[date, total_sales]` from the last 7 days. If error mentions plan/scope (`ACCESS_DENIED`, `SHOP_NOT_ELIGIBLE`), STOP — discuss fallback with user.

- [ ] **Step 3: Lock cart-add table name**

While the probe is wired, run a second exploratory query inline to confirm the right ShopifyQL table for cart-add. Add this temporarily to the script (or run in a REPL):

```ts
const CART_ADD_PROBE = `
  mutation { shopifyqlQuery(query: "FROM products SHOW added_to_cart_quantity SINCE -7d UNTIL today GROUP BY day") {
    __typename
    ... on TableResponse { tableData { columns { name } rowData } }
    parseErrors { message }
  }}
`;
```

If `parseErrors` is empty and `rowData` is populated → use `FROM products SHOW added_to_cart_quantity GROUP BY day`. If it errors, try the alternate forms in this order until one succeeds:
1. `FROM products SHOW added_to_cart_quantity GROUP BY day`
2. `FROM online_store_session_metrics SHOW total_sessions, total_visitors GROUP BY day` (and check for an AtC column)
3. `FROM events SHOW count GROUP BY day, name HAVING name = 'product_added_to_cart'`

Record the working ShopifyQL string verbatim — it's used in Task 5.

- [ ] **Step 4: Commit the probe (kept in repo for future debugging)**

```bash
git add backend/src/scripts/probe-shopifyql.ts
git commit -m "chore(shopify): add shopifyqlQuery smoke-test probe"
```

---

## Task 2: Database — migration + model

**Files:**
- Create: `backend/src/db/migrations/20260429000010-create-shopify-analytics-daily.js`
- Create: `backend/src/db/models/ShopifyAnalyticsDaily.ts`
- Modify: `backend/src/db/models/index.ts`

- [ ] **Step 1: Write migration**

```js
// backend/src/db/migrations/20260429000010-create-shopify-analytics-daily.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('shopify_analytics_daily', {
      id:            { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      source:        { type: Sequelize.TEXT, allowNull: false, defaultValue: 'shopify' },
      date:          { type: Sequelize.DATEONLY, allowNull: false },
      sessions:      { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      added_to_cart: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      synced_at:     { type: Sequelize.DATE, allowNull: false },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addConstraint('shopify_analytics_daily', {
      fields: ['source', 'date'],
      type: 'unique',
      name: 'shopify_analytics_daily_source_date_uq',
    });
    await queryInterface.addIndex('shopify_analytics_daily', ['date'], {
      name: 'shopify_analytics_daily_date_idx',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('shopify_analytics_daily');
  },
};
```

- [ ] **Step 2: Write Sequelize model**

```ts
// backend/src/db/models/ShopifyAnalyticsDaily.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

interface ShopifyAnalyticsDailyAttributes {
  id?: number;
  source: SourceType;
  date: string;          // 'YYYY-MM-DD' (DATEONLY)
  sessions: number;
  added_to_cart: number;
  synced_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

type CreationAttributes = Optional<
  ShopifyAnalyticsDailyAttributes,
  'id' | 'created_at' | 'updated_at'
>;

export class ShopifyAnalyticsDaily
  extends Model<ShopifyAnalyticsDailyAttributes, CreationAttributes>
  implements ShopifyAnalyticsDailyAttributes
{
  declare id: number;
  declare source: SourceType;
  declare date: string;
  declare sessions: number;
  declare added_to_cart: number;
  declare synced_at: Date;
  declare created_at: Date;
  declare updated_at: Date;
}

ShopifyAnalyticsDaily.init(
  {
    id:            { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source:        { type: DataTypes.TEXT, allowNull: false, defaultValue: 'shopify' },
    date:          { type: DataTypes.DATEONLY, allowNull: false },
    sessions:      { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    added_to_cart: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    synced_at:     { type: DataTypes.DATE, allowNull: false },
    created_at:    DataTypes.DATE,
    updated_at:    DataTypes.DATE,
  },
  { sequelize, modelName: 'ShopifyAnalyticsDaily', tableName: 'shopify_analytics_daily', timestamps: false },
);
```

- [ ] **Step 3: Register the model**

In `backend/src/db/models/index.ts`, add `export { ShopifyAnalyticsDaily } from './ShopifyAnalyticsDaily';` next to the other model exports (alphabetical order with the others).

- [ ] **Step 4: Run the migration**

```bash
cd backend && npm run db:migrate
```

Expected: `== 20260429000010-create-shopify-analytics-daily: migrated`. Confirm with:

```bash
psql "$DATABASE_URL" -c "\d shopify_analytics_daily"
```

Should show the 8 columns and the unique constraint.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/migrations/20260429000010-create-shopify-analytics-daily.js \
        backend/src/db/models/ShopifyAnalyticsDaily.ts \
        backend/src/db/models/index.ts
git commit -m "feat(db): add shopify_analytics_daily table for sessions and cart-add"
```

---

## Task 3: Connector — `runShopifyQLQuery` + `fetchAnalyticsDaily`

**Files:**
- Modify: `backend/src/modules/shopify/shopify.connector.ts` (append at end of file)

- [ ] **Step 1: Add types and helper at end of `shopify.connector.ts`**

Use the **exact ShopifyQL strings locked in Task 1, Step 3**. The code below assumes the working forms found in the probe — substitute if the probe found different ones.

```ts
/* ============================================================================
 * Shopify Analytics — sessions + add-to-cart via shopifyqlQuery.
 * ========================================================================= */

export interface AnalyticsDailyRow {
  date: string;            // 'YYYY-MM-DD' in store's IST timezone
  sessions: number;
  added_to_cart: number;
}

interface ShopifyqlTableResponse {
  __typename: string;
  tableData?: {
    columns: Array<{ name: string; dataType: string }>;
    rowData: string[][];
    unformattedData: string[][];
  };
  parseErrors?: Array<{ code: string; message: string }>;
}

const SHOPIFYQL_MUTATION = `
  mutation RunShopifyQL($query: String!) {
    shopifyqlQuery(query: $query) {
      __typename
      ... on TableResponse {
        tableData { columns { name dataType } rowData unformattedData }
      }
      parseErrors { code message }
    }
  }
`;

export async function runShopifyQLQuery(query: string): Promise<ShopifyqlTableResponse> {
  type Resp = { shopifyqlQuery: ShopifyqlTableResponse };
  const data = await graphqlRequest<Resp>(SHOPIFYQL_MUTATION, { query });
  if (data.shopifyqlQuery.parseErrors?.length) {
    throw new Error(`ShopifyQL parse errors: ${JSON.stringify(data.shopifyqlQuery.parseErrors)}`);
  }
  return data.shopifyqlQuery;
}

/**
 * Pulls per-day Sessions and Added-to-cart from Shopify Analytics.
 * Two ShopifyQL queries (sessions + AtC) merged on `date`.
 * Bucketed by store time zone (Asia/Kolkata) — same bucketing as buildBreakdown.
 */
export async function fetchAnalyticsDaily(
  sinceDate: Date,
  untilDate: Date,
): Promise<AnalyticsDailyRow[]> {
  const since = sinceDate.toISOString().slice(0, 10);
  const until = untilDate.toISOString().slice(0, 10);

  // ⚠️ Replace these two strings with the EXACT ShopifyQL forms
  // verified to work in Task 1's probe.
  const SESSIONS_QUERY =
    `FROM online_store_session_metrics SHOW total_sessions SINCE ${since} UNTIL ${until} GROUP BY day`;
  const CART_ADD_QUERY =
    `FROM products SHOW added_to_cart_quantity SINCE ${since} UNTIL ${until} GROUP BY day`;

  const [sessionsResp, cartAddResp] = await Promise.all([
    runShopifyQLQuery(SESSIONS_QUERY),
    runShopifyQLQuery(CART_ADD_QUERY),
  ]);

  const byDate = new Map<string, AnalyticsDailyRow>();

  const ingest = (
    resp: ShopifyqlTableResponse,
    field: 'sessions' | 'added_to_cart',
  ): void => {
    const rows = resp.tableData?.unformattedData ?? [];
    const cols = resp.tableData?.columns ?? [];
    const dateIdx = cols.findIndex((c) => c.name.toLowerCase() === 'day');
    const valIdx = cols.findIndex((c) => c.dataType.toLowerCase() === 'number');
    if (dateIdx < 0 || valIdx < 0) return;
    for (const row of rows) {
      const date = row[dateIdx]?.slice(0, 10);
      const value = parseInt(row[valIdx] ?? '0', 10);
      if (!date) continue;
      const cur = byDate.get(date) ?? { date, sessions: 0, added_to_cart: 0 };
      cur[field] = Number.isFinite(value) ? value : 0;
      byDate.set(date, cur);
    }
  };

  ingest(sessionsResp, 'sessions');
  ingest(cartAddResp, 'added_to_cart');

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
```

- [ ] **Step 2: Manually validate the connector against the live store**

```bash
cd backend && npx tsx -e "
  import('./src/modules/shopify/shopify.connector').then(async (m) => {
    const since = new Date(Date.now() - 7 * 86400000);
    const until = new Date();
    const rows = await m.fetchAnalyticsDaily(since, until);
    console.table(rows);
  });
"
```

Expected: 7-8 rows, each with non-null `sessions` and `added_to_cart` for active days. If `added_to_cart` is uniformly zero, the cart-add query is wrong — recheck Task 1, Step 3 and adjust `CART_ADD_QUERY`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/shopify/shopify.connector.ts
git commit -m "feat(shopify): add runShopifyQLQuery and fetchAnalyticsDaily connector"
```

---

## Task 4: Backfill + sync + npm script

**Files:**
- Modify: `backend/src/modules/shopify/shopify.backfill.ts`
- Modify: `backend/src/modules/shopify/shopify.sync.ts`
- Modify: `backend/package.json` (npm scripts)

- [ ] **Step 1: Add backfill function**

In `backend/src/modules/shopify/shopify.backfill.ts`, add a new export. (Locate the existing `backfillOrders` / `backfillRefunds` exports and follow the same shape — `import { ShopifyAnalyticsDaily } from '@db/models'` and `import { fetchAnalyticsDaily } from './shopify.connector'`.)

```ts
// At top of file, alongside other imports:
import { fetchAnalyticsDaily } from './shopify.connector';
import { ShopifyAnalyticsDaily } from '@db/models';
import { logger } from '@logger/logger';
import { SOURCE } from '@constant';

const BACKFILL_ANCHOR = new Date('2023-01-01T00:00:00.000Z');

export async function backfillAnalyticsDaily(): Promise<{ rows_written: number }> {
  const until = new Date();
  logger.info(`[backfill] analytics: ${BACKFILL_ANCHOR.toISOString().slice(0, 10)} → ${until.toISOString().slice(0, 10)}`);

  const rows = await fetchAnalyticsDaily(BACKFILL_ANCHOR, until);
  if (rows.length === 0) {
    logger.warn('[backfill] analytics: no rows returned from Shopify');
    return { rows_written: 0 };
  }

  const now = new Date();
  await ShopifyAnalyticsDaily.bulkCreate(
    rows.map((r) => ({
      source: SOURCE.SHOPIFY,
      date: r.date,
      sessions: r.sessions,
      added_to_cart: r.added_to_cart,
      synced_at: now,
    })),
    { updateOnDuplicate: ['sessions', 'added_to_cart', 'synced_at', 'updated_at'] },
  );

  logger.info(`[backfill] analytics: wrote ${rows.length} rows`);
  return { rows_written: rows.length };
}
```

- [ ] **Step 2: Add hourly delta sync**

In `backend/src/modules/shopify/shopify.sync.ts`, add a new export following the same pattern as the existing `syncRefundsDelta` / `syncReturnsDelta`:

```ts
// At top, alongside other imports:
import { fetchAnalyticsDaily } from './shopify.connector';
import { ShopifyAnalyticsDaily } from '@db/models';
import { SOURCE } from '@constant';

/**
 * Trailing 7-day refresh — Shopify Analytics may re-stamp events for ~2 days.
 * 7 days is a safe buffer.
 */
export async function syncAnalyticsDaily(): Promise<{ rows_written: number }> {
  const until = new Date();
  const since = new Date(until.getTime() - 7 * 86400000);
  const rows = await fetchAnalyticsDaily(since, until);
  if (rows.length === 0) return { rows_written: 0 };

  const now = new Date();
  await ShopifyAnalyticsDaily.bulkCreate(
    rows.map((r) => ({
      source: SOURCE.SHOPIFY,
      date: r.date,
      sessions: r.sessions,
      added_to_cart: r.added_to_cart,
      synced_at: now,
    })),
    { updateOnDuplicate: ['sessions', 'added_to_cart', 'synced_at', 'updated_at'] },
  );
  return { rows_written: rows.length };
}
```

- [ ] **Step 3: Wire delta into the existing sync orchestrator**

Find the existing periodic sync caller (search for `syncRefundsDelta(` in `backend/src/modules/shopify/shopify.sync.ts` and surrounding routes/cron). Add `await syncAnalyticsDaily();` next to it, in the same block. If a top-level `runHourlySync()` orchestrator exists, append the call there. If sync is currently triggered manually via routes only, leave it manual for now and note the cron addition as a follow-up.

- [ ] **Step 4: Add npm script**

In `backend/package.json`, add a new script alongside the existing backfill scripts:

```json
"backfill:shopify:analytics": "tsx -e \"import('./src/modules/shopify/shopify.backfill').then(m => m.backfillAnalyticsDaily()).then(r => { console.log(r); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })\"",
```

(Match the exact shape of the surrounding `backfill:shopify:*` scripts — kept as a single line in JSON.)

- [ ] **Step 5: Run the backfill**

```bash
cd backend && npm run backfill:shopify:analytics
```

Expected: `{ rows_written: <number close to (today − 2023-01-01) in days> }`. If <500, ShopifyQL is paginating or filtering — investigate by re-running `fetchAnalyticsDaily` manually for a smaller window.

- [ ] **Step 6: Verify the data in Postgres**

```bash
psql "$DATABASE_URL" -c "
  SELECT MIN(date) AS earliest, MAX(date) AS latest, COUNT(*) AS rows,
         SUM(sessions) AS total_sessions, SUM(added_to_cart) AS total_atc
  FROM shopify_analytics_daily;
"
```

Expected: earliest near 2023-01-01, latest within last 2 days, row count = days between, both totals positive and non-trivial.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/shopify/shopify.backfill.ts \
        backend/src/modules/shopify/shopify.sync.ts \
        backend/package.json
git commit -m "feat(shopify): add backfill and hourly sync for analytics_daily"
```

---

## Task 5: Backend service — extend `getKpis`

**Files:**
- Modify: `backend/src/modules/finance/finance.types.ts`
- Modify: `backend/src/modules/finance/finance.service.ts`

- [ ] **Step 1: Extend `FinanceKpis` type**

In `backend/src/modules/finance/finance.types.ts`, find the `FinanceKpis` interface and extend it:

```ts
export interface KpiPair {
  value: number;
  previous: number;
}

export interface FinanceKpis {
  // existing fields stay as-is:
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

- [ ] **Step 2: Add `storefrontMetrics` helper**

In `backend/src/modules/finance/finance.service.ts`, add this helper above `getKpis`:

```ts
interface StorefrontMetrics {
  sessions: number;
  added_to_cart: number;
  returning_customer_rate: number;   // 0-100
  orders_fulfilled: number;
  orders: number;
}

async function storefrontMetrics(from: Date, to: Date): Promise<StorefrontMetrics> {
  const [analyticsRow, ordersRow] = await Promise.all([
    sequelize.query<{ sessions: string; added_to_cart: string }>(
      `SELECT COALESCE(SUM(sessions), 0)::text      AS sessions,
              COALESCE(SUM(added_to_cart), 0)::text AS added_to_cart
         FROM shopify_analytics_daily
         WHERE source = :source
           AND date BETWEEN :from::date AND :to::date`,
      { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
    ),
    sequelize.query<{ orders: string; orders_fulfilled: string; returning: string }>(
      // returning = orders whose customer has any prior order before this one
      `WITH base AS (
         SELECT order_id, customer_id, created_at, fulfillment_status
           FROM shopify_orders
           WHERE created_at BETWEEN :from AND :to
             AND COALESCE(test, FALSE) = FALSE
       )
       SELECT COUNT(*)::text AS orders,
              SUM(CASE WHEN fulfillment_status IN ('FULFILLED', 'PARTIALLY_FULFILLED')
                       THEN 1 ELSE 0 END)::text AS orders_fulfilled,
              SUM(CASE WHEN EXISTS (
                            SELECT 1 FROM shopify_orders o2
                             WHERE o2.customer_id = base.customer_id
                               AND o2.customer_id IS NOT NULL
                               AND o2.created_at < base.created_at
                               AND COALESCE(o2.test, FALSE) = FALSE
                          ) THEN 1 ELSE 0 END)::text AS returning
         FROM base`,
      { type: QueryTypes.SELECT, replacements: { from, to } },
    ),
  ]);

  const o = ordersRow[0] ?? { orders: '0', orders_fulfilled: '0', returning: '0' };
  const orders = parseInt(o.orders, 10);
  const returning = parseInt(o.returning, 10);
  return {
    sessions: parseInt(analyticsRow[0]?.sessions ?? '0', 10),
    added_to_cart: parseInt(analyticsRow[0]?.added_to_cart ?? '0', 10),
    orders,
    orders_fulfilled: parseInt(o.orders_fulfilled, 10),
    returning_customer_rate: orders > 0 ? (returning / orders) * 100 : 0,
  };
}
```

- [ ] **Step 3: Extend `getKpis` to include the new fields**

Modify `getKpis` in the same file. Locate the line `const [orders, refundsSummary, returnsExcl] = await Promise.all([...])` and the `return { ... }` at the end. Add storefront metrics computation:

```ts
export async function getKpis(from: Date, to: Date): Promise<FinanceKpis> {
  const ms = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - ms);

  const [orders, refundsSummary, returnsExcl, sf, sfPrev] = await Promise.all([
    orderTotals(from, to),
    refundSummaryAggregates(from, to),
    returnsTotalExclTax(from, to),
    storefrontMetrics(from, to),
    storefrontMetrics(prevFrom, prevTo),
  ]);

  // ... existing tax/net_sales/net_revenue computation unchanged ...
  const subtotalExcl = orders.gross_revenue - orders.total_discounts;
  const net_sales = subtotalExcl - returnsExcl;
  const tax_rate =
    subtotalExcl > 0 && orders.total_tax > 0
      ? orders.total_tax / (subtotalExcl - orders.total_tax + orders.total_tax)
      : 0;
  const taxes_on_net = Math.round(tax_rate * net_sales * 100) / 100;
  const net_revenue = net_sales + orders.total_shipping + taxes_on_net;

  return {
    gross_revenue: orders.gross_revenue,
    total_discounts: orders.total_discounts,
    total_tax: taxes_on_net,
    total_shipping: orders.total_shipping,
    total_refunds: returnsExcl,
    net_revenue,
    refund_count: refundsSummary.refund_count,
    order_count: orders.order_count,
    sessions:                { value: sf.sessions,                previous: sfPrev.sessions },
    added_to_cart:           { value: sf.added_to_cart,           previous: sfPrev.added_to_cart },
    returning_customer_rate: { value: sf.returning_customer_rate, previous: sfPrev.returning_customer_rate },
    orders_fulfilled:        { value: sf.orders_fulfilled,        previous: sfPrev.orders_fulfilled },
    orders:                  { value: sf.orders,                  previous: sfPrev.orders },
  };
}
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd backend && npm run be:typecheck && npm run lint
```

Expected: zero errors, zero warnings.

- [ ] **Step 5: Smoke-test the endpoint**

Start backend (`npm run be:dev` in another terminal) then:

```bash
curl -s 'http://localhost:4000/api/finance/kpis?from=2026-04-01&to=2026-04-29' | jq '.data | {sessions,added_to_cart,returning_customer_rate,orders_fulfilled,orders,gross_revenue}'
```

Expected: all five new fields present, each with numeric `value` and `previous`. `gross_revenue` still present.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/finance/finance.service.ts \
        backend/src/modules/finance/finance.types.ts
git commit -m "feat(finance): extend getKpis with sessions, AtC, fulfilled, returning-rate, orders"
```

---

## Task 6: Frontend — extend `FinanceKpisApi` type

**Files:**
- Modify: `frontend/src/types/finance-api.ts`

- [ ] **Step 1: Mirror the backend type**

Replace the existing `FinanceKpisApi` block with:

```ts
export interface KpiPairApi {
  value: number;
  previous: number;
}

export interface FinanceKpisApi {
  gross_revenue: number;
  total_discounts: number;
  total_tax: number;
  total_shipping: number;
  total_refunds: number;
  net_revenue: number;
  refund_count: number;
  order_count: number;
  // new — for the storefront strip
  sessions: KpiPairApi;
  added_to_cart: KpiPairApi;
  returning_customer_rate: KpiPairApi;
  orders_fulfilled: KpiPairApi;
  orders: KpiPairApi;
}
```

- [ ] **Step 2: Verify frontend compiles**

```bash
cd frontend && npm run build
```

Expected: build succeeds (no consumer of `FinanceKpisApi` reads the new fields yet, so no breakage).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/finance-api.ts
git commit -m "feat(finance-fe): extend FinanceKpisApi type with storefront metrics"
```

---

## Task 7: Move `KPICard` to shared + add delta prop

**Files:**
- Move: `frontend/src/pages/dashboard/components/KPICard.tsx` → `frontend/src/components/shared/KPICard.tsx`
- Modify: `frontend/src/pages/dashboard/page.tsx` (update import path)

- [ ] **Step 1: Move and extend the component**

Use `git mv`:

```bash
git mv frontend/src/pages/dashboard/components/KPICard.tsx \
       frontend/src/components/shared/KPICard.tsx
```

Then replace the file's contents:

```tsx
// frontend/src/components/shared/KPICard.tsx
import type { ElementType } from 'react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  accent?: string;
  icon?: ElementType;
  /** Percent delta vs previous period; null → render '—'. */
  delta?: number | null;
  /** Suffix after the delta (default 'vs prev'). */
  deltaLabel?: string;
}

export function KPICard({
  label,
  value,
  accent = '#B8893E',
  icon: Icon,
  delta,
  deltaLabel = 'vs prev',
}: KPICardProps) {
  return (
    <div className="bg-[var(--surface)] rounded-[14px] border border-[var(--line)] overflow-hidden hover:border-[var(--line-2)] transition-colors">
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[11px] font-medium uppercase tracking-widish text-[var(--muted)]">
            {label}
          </p>
          {Icon && (
            <div className="rounded-md p-1.5" style={{ backgroundColor: `${accent}1F` }}>
              <Icon size={14} strokeWidth={1.5} style={{ color: accent }} />
            </div>
          )}
        </div>
        <p className="text-[26px] font-medium tracking-tightx text-[var(--ink)] tabular-nums">
          {value}
        </p>
        {delta !== undefined && (
          <p
            className={cn(
              'text-[10.5px] mt-1 tabular-nums',
              delta === null
                ? 'text-[var(--muted-2)]'
                : delta >= 0
                  ? 'text-[var(--pos)]'
                  : 'text-[var(--neg)]',
            )}
          >
            {delta === null
              ? '— ' + deltaLabel
              : `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}% ${deltaLabel}`}
          </p>
        )}
      </div>
    </div>
  );
}

// Default export retained so existing dashboard imports keep working.
export default KPICard;
```

- [ ] **Step 2: Update dashboard imports**

`grep -rn "components/KPICard" frontend/src/pages/dashboard/` and update each match from `from './components/KPICard'` (or relative variants) to `from '@components/shared/KPICard'`. The default export is preserved so call-sites keep working.

- [ ] **Step 3: Verify build + lint**

```bash
cd frontend && npm run lint && npm run build
```

Expected: zero warnings, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/KPICard.tsx \
        frontend/src/pages/dashboard/
git commit -m "refactor(ui): move KPICard to components/shared and add delta prop"
```

---

## Task 8: Build `StorefrontKpiStrip`

**Files:**
- Create: `frontend/src/pages/finance/components/StorefrontKpiStrip.tsx`

- [ ] **Step 1: Write the component**

```tsx
// frontend/src/pages/finance/components/StorefrontKpiStrip.tsx
import { useAppSelector } from '@store/hooks';
import { KPICard } from '@components/shared/KPICard';
import { formatINRFull, formatNum } from '@utils/formatters';

interface KpiPair { value: number; previous: number; }

function pctDelta(p: KpiPair): number | null {
  if (p.previous === 0) return p.value === 0 ? 0 : null;
  return ((p.value - p.previous) / Math.abs(p.previous)) * 100;
}

export function StorefrontKpiStrip() {
  const kpis = useAppSelector((s) => s.finance.kpis);
  const breakdown = useAppSelector((s) => s.finance.salesBreakdown);
  if (!kpis || !breakdown) return null;

  const grossPair: KpiPair = {
    value: breakdown.current.totals.gross_sales,
    previous: breakdown.previous.totals.gross_sales,
  };

  const tiles: Array<{ label: string; pair: KpiPair; render: (n: number) => string }> = [
    { label: 'Sessions',                pair: kpis.sessions,                render: (n) => formatNum(n) },
    { label: 'Gross sales',             pair: grossPair,                    render: (n) => formatINRFull(n) },
    { label: 'Returning customer rate', pair: kpis.returning_customer_rate, render: (n) => `${n.toFixed(2)}%` },
    { label: 'Orders fulfilled',        pair: kpis.orders_fulfilled,        render: (n) => formatNum(n) },
    { label: 'Orders',                  pair: kpis.orders,                  render: (n) => formatNum(n) },
    { label: 'Added to cart',           pair: kpis.added_to_cart,           render: (n) => formatNum(n) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {tiles.map((t) => (
        <KPICard
          key={t.label}
          label={t.label}
          value={t.render(t.pair.value)}
          delta={pctDelta(t.pair)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Confirm formatters exist**

```bash
grep -n "formatINRFull\|formatNum" frontend/src/utils/formatters.ts
```

Both must be exported. They already are (used by the existing FinancePage).

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run lint && npm run build
```

Expected: zero warnings, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/finance/components/StorefrontKpiStrip.tsx
git commit -m "feat(finance-fe): add StorefrontKpiStrip with 6 Shopify-sourced tiles"
```

---

## Task 9: Wire strip into FinancePage

**Files:**
- Modify: `frontend/src/pages/finance/page.tsx`

- [ ] **Step 1: Add the import and render the strip at the top of `<main>`**

In `frontend/src/pages/finance/page.tsx`, near the other component imports add:

```ts
import { StorefrontKpiStrip } from './components/StorefrontKpiStrip';
```

Then locate this block:

```tsx
<main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">
  {/* Total Sales Breakdown — 8 KPI tiles ... */}
  {finance.salesBreakdown && (
    ...
```

Insert the strip immediately as the first child of `<main>`, **before** the existing 8-tile breakdown panel:

```tsx
<main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">
  <StorefrontKpiStrip />

  {/* Total Sales Breakdown — 8 KPI tiles ... (unchanged) */}
  {finance.salesBreakdown && (
    ...
```

The strip renders only when `finance.kpis` and `finance.salesBreakdown` are both populated (it returns `null` otherwise), so no additional loading guard is needed.

- [ ] **Step 2: Manual verification — start dev servers and load Finance page**

```bash
# Terminal 1
cd backend && npm run dev
# Terminal 2
cd frontend && npm run local
```

Open http://localhost:5000/finance.

Verify visually:
- 6-tile strip renders at top of page above the existing 8-tile breakdown panel.
- All 6 tiles show non-zero values (assuming the date range spans periods with traffic).
- Each tile shows a `↑/↓ X.X% vs prev` delta line (or `— vs prev` if previous period was 0).
- Tiles match dashboard `KPICard` typography (26px value, 11px uppercase label).
- Changing the date range updates all 6 tile values.

Take a screenshot for the commit.

- [ ] **Step 3: Spot-check a single tile against Shopify Admin**

Pick the same 30-day window in Shopify Admin → Analytics → Overview. Compare:

- Sessions: our tile vs Shopify's "Sessions" widget
- Gross sales: our tile vs Shopify's "Gross sales" widget
- Orders: our tile vs Shopify's "Orders" widget

All three should match exactly. If they don't, the most likely culprits in order are: (a) date-range bucketing mismatch, (b) IST vs UTC date boundary, (c) test orders not being filtered. Investigate before continuing.

- [ ] **Step 4: Verify build + lint final**

```bash
cd frontend && npm run lint && npm run build
cd ../backend && npm run lint && npm run be:typecheck
```

All four commands: zero warnings, success exit code.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/finance/page.tsx
git commit -m "feat(finance-fe): render StorefrontKpiStrip atop Finance page"
```

---

## Task 10: Final review

- [ ] Spec coverage check — every requirement in `docs/superpowers/specs/2026-04-29-finance-storefront-kpis-design.md` has a corresponding task above:
  - Architecture diagram ↔ Task 1-4 (DB→connector→sync→service)
  - Migration shape ↔ Task 2
  - Connector signatures ↔ Task 3
  - Backfill + sync cadence ↔ Task 4
  - `getKpis` extension ↔ Task 5
  - `FinanceKpisApi` mirror ↔ Task 6
  - Shared `KPICard` move + delta prop ↔ Task 7
  - `StorefrontKpiStrip` 6-up grid ↔ Task 8
  - Page wiring atop existing breakdown ↔ Task 9
- [ ] All five risks from the spec are addressed:
  - R1 (plan/scope gate) → Task 1 (smoke probe halts on error)
  - R2 (cart-add table name) → Task 1 Step 3 (lock the form)
  - R3 (returning-rate definition) → Task 9 Step 3 (manual spot-check)
  - R4 (timezone) → Task 9 Step 3 (manual spot-check)
  - R5 (backfill cost) → Task 4 Step 5 + Step 6 (row-count sanity)

---

## Out of scope (explicitly deferred)

- Sessions-over-time line chart.
- Conversion-rate funnel widget.
- Cron config for hourly `syncAnalyticsDaily` if no orchestrator exists today (Task 4 Step 3 notes manual fallback).
- Drill-down from any tile.
