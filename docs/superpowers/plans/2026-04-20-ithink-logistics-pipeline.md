# iThink Logistics Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a correct iThink Logistics integration that drives from Shopify order IDs, enriches shipments with AWB/status/charges, tracks in-flight orders, and reconciles COD remittance daily.

**Architecture:** Shopify is the order source — we extract numeric order IDs from GQL IDs already in `shopify_orders`, batch them 50 at a time to iThink's Store Order Details endpoint, then track in-flight AWBs in batches of 10 using the tracking endpoint (different host). Remittance is synced daily via summary + detail endpoints. All data writes to `ithink_shipments` and `ithink_remittance` (existing tables), plus a new `ithink_remittance_details` table for AWB-level breakdown.

**Tech Stack:** Node.js 18, TypeScript 5.7 strict, Express, Sequelize 6, PostgreSQL, Axios, Winston logger, existing `@config/config` env loader, existing project module structure at `backend/src/modules/ithink/`.

---

## Key Facts (read before touching any file)

- **Shopify order IDs in DB** look like `gid://shopify/Order/6515526664471`. Extract numeric part: `id.split('/').pop()`.
- **Two iThink hosts**: `https://my.ithinklogistics.com` for most endpoints; `https://api.ithinklogistics.com` for tracking only.
- **Every request is POST JSON** with body `{ "data": { ...credentials, ...payload } }`.
- **platform_id must be the string `"2"`** (not the number 2).
- **Batch limits**: 50 order IDs per store-order-details call; 10 AWBs per track call.
- **500ms delay between batches** to avoid rate limits.
- **Retry on HTTP non-200**: 3 attempts with 1 s → 3 s → 9 s backoff.
- **Never log credentials** — mask `access_token` and `secret_key` in all log output.
- Existing `ithink_shipments.order_id` column stores iThink's numeric order ID (TEXT). We add `shopify_order_gql_id` to store the full GQL ID for joining `shopify_orders`.

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/.env` | Modify | Add `ITHINK_PLATFORM_ID=2` |
| `backend/src/config/config.ts` | Modify | Expose `platformId` in ithink block |
| `backend/src/modules/ithink/ithink.connector.ts` | Rewrite | 5 correct endpoint functions + retry logic |
| `backend/src/scripts/ithink-health.ts` | Create | Pincode healthcheck script |
| `backend/src/scripts/ithink-test-order.ts` | Create | Single-order smoke test script |
| `backend/src/db/migrations/20260420000002-ithink-enrich.js` | Create | Add columns + new remittance_details table |
| `backend/src/db/models/IthinkShipment.ts` | Modify | Add `shopify_order_gql_id`, `weight`, `last_scan`, `raw_response` |
| `backend/src/db/models/IthinkRemittanceDetail.ts` | Create | New model for AWB-level remittance lines |
| `backend/src/db/models/index.ts` | Modify | Export `IthinkRemittanceDetail` |
| `backend/src/modules/ithink/ithink.sync.ts` | Rewrite | `backfillShipments`, `syncShipmentStatus`, `syncRemittance` |
| `backend/src/modules/sync/sync.service.ts` | Modify | Update `triggerIthinkSync` to use new functions |

---

## Task 1: Add env var + config

**Files:**
- Modify: `backend/.env`
- Modify: `backend/src/config/config.ts`

- [ ] **Step 1: Add ITHINK_PLATFORM_ID to .env**

Open `backend/.env` and add after the existing iThink lines:
```
ITHINK_PLATFORM_ID=2
```

- [ ] **Step 2: Add ITHINK_PLATFORM_ID to config schema and export**

Open `backend/src/config/config.ts`. Find the iThink block in the Zod schema and add `ITHINK_PLATFORM_ID`:

```typescript
// In the z.object({...}) schema — add after ITHINK_BASE_URL:
ITHINK_PLATFORM_ID: z.string().default('2'),
```

In the `environment` export, update the `ithink` block:
```typescript
ithink: {
  accessToken: env.ITHINK_ACCESS_TOKEN,
  secretKey: env.ITHINK_SECRET_KEY,
  baseUrl: env.ITHINK_BASE_URL,
  platformId: env.ITHINK_PLATFORM_ID,
},
```

- [ ] **Step 3: Verify typecheck passes**

```bash
cd backend && npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/.env backend/src/config/config.ts
git commit -m "feat(ithink): add ITHINK_PLATFORM_ID env var and config"
```

---

## Task 2: Rewrite the iThink connector

**Files:**
- Rewrite: `backend/src/modules/ithink/ithink.connector.ts`

- [ ] **Step 1: Replace the entire file with the new connector**

```typescript
import axios from 'axios';
import { environment } from '@config/config';
import { logger } from '@logger/logger';

const MY_BASE = environment.ithink.baseUrl; // https://my.ithinklogistics.com
const API_BASE = 'https://api.ithinklogistics.com'; // tracking only

const AUTH = {
  access_token: environment.ithink.accessToken,
  secret_key: environment.ithink.secretKey,
};

async function postTo<T>(
  baseUrl: string,
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const start = Date.now();
  const delays = [1000, 3000, 9000];
  let lastErr: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      const res = await axios.post<T>(
        `${baseUrl}${endpoint}`,
        { data: { ...AUTH, ...payload } },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
      );
      logger.info(
        `[iThink] ${endpoint} | status=${res.status} | ${Date.now() - start}ms`,
      );
      return res.data;
    } catch (err) {
      lastErr = err as Error;
      if (attempt < 3) {
        logger.info(`[iThink] ${endpoint} retry ${attempt + 1} in ${delays[attempt]}ms`);
        await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  }
  throw lastErr;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface StoreOrderItem {
  awb_no: string;
  order_id: string;
  order_number: string;
  order_date: string;
  logistic: string;
  weight: string;
  payment_mode: string;
  customer_city: string;
  customer_state: string;
  customer_pincode: string;
  billing_fwd_charges: string;
  billing_rto_charges: string;
  billing_cod_charges: string;
  billing_gst_charges: string;
  billed_total_charges: string;
}

export interface StoreOrderResponse {
  status: string;
  message?: string;
  data?: Record<string, StoreOrderItem | null>;
}

export interface TrackScanDetail {
  date: string;
  time: string;
  activity: string;
  location: string;
}

export interface TrackResult {
  current_status: string;
  current_status_code: string;
  logistic: string;
  ofd_count: string;
  expected_delivery_date?: string;
  last_scan_details?: string;
  order_date_time?: { delivery_date?: string; rto_delivered_date?: string };
  scan_details?: TrackScanDetail[];
}

export interface TrackResponse {
  status?: string;
  data?: Record<string, TrackResult | { message: string }>;
}

export interface RemittanceSummary {
  cod_generated: string;
  bill_adjusted: string;
  refund_adjusted?: string;
  transaction_charges: string;
  transaction_gst_charges: string;
  wallet_amount: string;
  advance_hold: string;
  cod_remitted: string;
}

export interface RemittanceResponse {
  status: string;
  data?: RemittanceSummary[];
}

export interface RemittanceDetailItem {
  airway_bill_no: string;
  order_no: string;
  price: string;
  delivered_date: string;
}

export interface RemittanceDetailResponse {
  status: string;
  data?: RemittanceDetailItem[];
}

export interface PincodeCheckResponse {
  status: string;
  data?: unknown;
  message?: string;
}

// ── Endpoint 1: Store Order Details ───────────────────────────────────────

export async function getStoreOrderDetails(
  numericOrderIds: string[],
): Promise<StoreOrderResponse> {
  return postTo<StoreOrderResponse>(
    MY_BASE,
    '/api_v3/store/get-order-details.json',
    {
      order_no_list: numericOrderIds.join(','),
      platform_id: environment.ithink.platformId,
    },
  );
}

// ── Endpoint 2: Track AWBs (uses api.ithinklogistics.com, max 10 per call) ──

export async function trackAWBs(
  awbList: string[],
): Promise<Record<string, TrackResult>> {
  const results: Record<string, TrackResult> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < awbList.length; i += 10) {
    chunks.push(awbList.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const res = await postTo<TrackResponse>(
      API_BASE,
      '/api_v3/order/track.json',
      { awb_number_list: chunk.join(',') },
    );
    for (const [awb, data] of Object.entries(res.data ?? {})) {
      if (data && !('message' in data)) {
        results[awb] = data as TrackResult;
      }
    }
    if (chunks.length > 1) await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

// ── Endpoint 3: Remittance Summary ────────────────────────────────────────

export async function getRemittanceSummary(date: string): Promise<RemittanceResponse> {
  return postTo<RemittanceResponse>(
    MY_BASE,
    '/api_v3/remittance/get.json',
    { remittance_date: date },
  );
}

// ── Endpoint 4: Remittance Details (AWB-level breakdown) ──────────────────

export async function getRemittanceDetails(date: string): Promise<RemittanceDetailResponse> {
  return postTo<RemittanceDetailResponse>(
    MY_BASE,
    '/api_v3/remittance/get_details.json',
    { remittance_date: date },
  );
}

// ── Endpoint 5: Pincode check (healthcheck / credential sanity) ────────────

export async function checkPincode(pincode = '380001'): Promise<PincodeCheckResponse> {
  return postTo<PincodeCheckResponse>(
    MY_BASE,
    '/api_v3/pincode/check.json',
    { pincode },
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd backend && npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/ithink/ithink.connector.ts
git commit -m "feat(ithink): rewrite connector with 5 correct endpoints + retry logic"
```

---

## Task 3: Healthcheck script

**Files:**
- Create: `backend/src/scripts/ithink-health.ts`

- [ ] **Step 1: Create the script**

```typescript
import { checkPincode } from '../modules/ithink/ithink.connector';

async function main(): Promise<void> {
  console.log('Checking iThink credentials via pincode endpoint...');
  try {
    const res = await checkPincode('380001');
    if (res.status === 'success' || res.data) {
      console.log('✅ iThink credentials valid. Response:', JSON.stringify(res, null, 2));
    } else {
      console.error('❌ iThink responded but credentials may be invalid:', res);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ iThink unreachable or credentials rejected:', (err as Error).message);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 2: Run the healthcheck**

```bash
cd backend && npx tsx src/scripts/ithink-health.ts
```
Expected: prints `✅ iThink credentials valid.` with response JSON. If credentials are wrong, prints `❌`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/scripts/ithink-health.ts
git commit -m "feat(ithink): add healthcheck script via pincode endpoint"
```

---

## Task 4: One-off order smoke test script

**Files:**
- Create: `backend/src/scripts/ithink-test-order.ts`

- [ ] **Step 1: Create the script**

```typescript
import { getStoreOrderDetails, trackAWBs } from '../modules/ithink/ithink.connector';

async function main(): Promise<void> {
  const gqlOrderId = process.argv[2];
  if (!gqlOrderId) {
    console.error('Usage: npx tsx src/scripts/ithink-test-order.ts <shopify_order_id>');
    console.error('Example: npx tsx src/scripts/ithink-test-order.ts gid://shopify/Order/6515526664471');
    process.exit(1);
  }

  // Extract numeric part from GQL ID
  const numericId = gqlOrderId.includes('/') ? gqlOrderId.split('/').pop()! : gqlOrderId;
  console.log(`\n── Step 1: Store Order Details for order ${numericId} ──`);

  const storeRes = await getStoreOrderDetails([numericId]);
  console.log('Status:', storeRes.status);
  console.log('Data:', JSON.stringify(storeRes.data, null, 2));

  if (storeRes.status !== 'success' || !storeRes.data) {
    console.error('❌ Store order details failed. Stopping.');
    process.exit(1);
  }

  const orderData = storeRes.data[numericId];
  if (!orderData) {
    console.error(`❌ No data returned for order ${numericId}. Order may not exist in iThink.`);
    process.exit(1);
  }

  const awb = orderData.awb_no;
  console.log(`\n── Step 2: Track AWB ${awb} ──`);

  const trackRes = await trackAWBs([awb]);
  console.log('Tracking result:', JSON.stringify(trackRes, null, 2));

  console.log('\n── Merged result ──');
  console.log({
    shopify_order_gql_id: gqlOrderId,
    numeric_order_id: numericId,
    awb,
    logistic: orderData.logistic,
    weight: orderData.weight,
    payment_mode: orderData.payment_mode,
    current_status: trackRes[awb]?.current_status,
    current_status_code: trackRes[awb]?.current_status_code,
    delivered_date: trackRes[awb]?.order_date_time?.delivery_date,
  });
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
```

- [ ] **Step 2: Run against a real Shopify order ID**

Get an order ID from the database first:
```bash
psql postgresql://shayn_user:mihil@localhost:5432/shayn_mis \
  -c "SELECT order_id FROM shopify_orders ORDER BY created_at DESC LIMIT 5;"
```

Then run with one of those IDs:
```bash
cd backend && npx tsx src/scripts/ithink-test-order.ts "gid://shopify/Order/REPLACE_WITH_REAL_ID"
```

Expected: Prints JSON with `awb_no`, `logistic`, `current_status` populated. If iThink returns `null` for that order, the order wasn't shipped via iThink (try another order ID).

- [ ] **Step 3: Commit**

```bash
git add backend/src/scripts/ithink-test-order.ts
git commit -m "feat(ithink): add single-order smoke test script"
```

---

## Task 5: Database migration

**Files:**
- Create: `backend/src/db/migrations/20260420000002-ithink-enrich.js`

- [ ] **Step 1: Create the migration file**

```javascript
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Add enrichment columns to ithink_shipments
      ALTER TABLE ithink_shipments
        ADD COLUMN IF NOT EXISTS shopify_order_gql_id TEXT,
        ADD COLUMN IF NOT EXISTS weight NUMERIC(8,3),
        ADD COLUMN IF NOT EXISTS last_scan TEXT,
        ADD COLUMN IF NOT EXISTS raw_response JSONB;

      CREATE INDEX IF NOT EXISTS idx_ithink_shopify_gql
        ON ithink_shipments (shopify_order_gql_id);

      -- New table: per-AWB remittance line items
      CREATE TABLE IF NOT EXISTS ithink_remittance_details (
        id              SERIAL PRIMARY KEY,
        remittance_date DATE NOT NULL,
        awb             TEXT NOT NULL,
        order_no        TEXT,
        price           NUMERIC(10,2),
        delivered_date  DATE,
        synced_at       TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (remittance_date, awb)
      );

      CREATE INDEX IF NOT EXISTS idx_remit_detail_date
        ON ithink_remittance_details (remittance_date);
      CREATE INDEX IF NOT EXISTS idx_remit_detail_awb
        ON ithink_remittance_details (awb);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS ithink_remittance_details;
      ALTER TABLE ithink_shipments
        DROP COLUMN IF EXISTS shopify_order_gql_id,
        DROP COLUMN IF EXISTS weight,
        DROP COLUMN IF EXISTS last_scan,
        DROP COLUMN IF EXISTS raw_response;
    `);
  },
};
```

- [ ] **Step 2: Apply the migration directly**

```bash
psql postgresql://shayn_user:mihil@localhost:5432/shayn_mis -f - <<'SQL'
ALTER TABLE ithink_shipments
  ADD COLUMN IF NOT EXISTS shopify_order_gql_id TEXT,
  ADD COLUMN IF NOT EXISTS weight NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS last_scan TEXT,
  ADD COLUMN IF NOT EXISTS raw_response JSONB;

CREATE INDEX IF NOT EXISTS idx_ithink_shopify_gql
  ON ithink_shipments (shopify_order_gql_id);

CREATE TABLE IF NOT EXISTS ithink_remittance_details (
  id              SERIAL PRIMARY KEY,
  remittance_date DATE NOT NULL,
  awb             TEXT NOT NULL,
  order_no        TEXT,
  price           NUMERIC(10,2),
  delivered_date  DATE,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (remittance_date, awb)
);

CREATE INDEX IF NOT EXISTS idx_remit_detail_date ON ithink_remittance_details (remittance_date);
CREATE INDEX IF NOT EXISTS idx_remit_detail_awb  ON ithink_remittance_details (awb);
SQL
```

Expected: `ALTER TABLE`, `CREATE INDEX`, `CREATE TABLE`, `CREATE INDEX`, `CREATE INDEX` — no errors.

- [ ] **Step 3: Verify schema**

```bash
psql postgresql://shayn_user:mihil@localhost:5432/shayn_mis \
  -c "\d ithink_shipments" \
  -c "\d ithink_remittance_details"
```
Expected: `ithink_shipments` has `shopify_order_gql_id`, `weight`, `last_scan`, `raw_response` columns. `ithink_remittance_details` table exists.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/migrations/20260420000002-ithink-enrich.js
git commit -m "feat(ithink): migration — add enrichment columns and remittance_details table"
```

---

## Task 6: Update Sequelize models

**Files:**
- Modify: `backend/src/db/models/IthinkShipment.ts`
- Create: `backend/src/db/models/IthinkRemittanceDetail.ts`
- Modify: `backend/src/db/models/index.ts`

- [ ] **Step 1: Update IthinkShipment.ts — add 4 new fields**

Open `backend/src/db/models/IthinkShipment.ts`. Add to the `Attrs` interface:
```typescript
shopify_order_gql_id?: string;
weight?: number;
last_scan?: string;
raw_response?: Record<string, unknown>;
```

Add to the `Optional<>` union (the `CA` type), append after `synced_at`:
```
| 'shopify_order_gql_id' | 'weight' | 'last_scan' | 'raw_response'
```

Add `declare` lines in the class body:
```typescript
declare shopify_order_gql_id?: string;
declare weight?: number;
declare last_scan?: string;
declare raw_response?: Record<string, unknown>;
```

Add to `IthinkShipment.init({...})`:
```typescript
shopify_order_gql_id: DataTypes.TEXT,
weight: DataTypes.DECIMAL(8, 3),
last_scan: DataTypes.TEXT,
raw_response: DataTypes.JSONB,
```

- [ ] **Step 2: Create IthinkRemittanceDetail.ts**

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface Attrs {
  id?: number;
  remittance_date: string;
  awb: string;
  order_no?: string;
  price?: number;
  delivered_date?: string;
  synced_at?: Date;
}

type CA = Optional<Attrs, 'id' | 'order_no' | 'price' | 'delivered_date' | 'synced_at'>;

export class IthinkRemittanceDetail extends Model<Attrs, CA> implements Attrs {
  declare id?: number;
  declare remittance_date: string;
  declare awb: string;
  declare order_no?: string;
  declare price?: number;
  declare delivered_date?: string;
  declare synced_at?: Date;
}

IthinkRemittanceDetail.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    remittance_date: { type: DataTypes.DATEONLY, allowNull: false },
    awb: { type: DataTypes.TEXT, allowNull: false },
    order_no: DataTypes.TEXT,
    price: DataTypes.DECIMAL(10, 2),
    delivered_date: DataTypes.DATEONLY,
    synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'IthinkRemittanceDetail',
    tableName: 'ithink_remittance_details',
    timestamps: false,
  },
);
```

- [ ] **Step 3: Export from models/index.ts**

Add to `backend/src/db/models/index.ts`:
```typescript
export { IthinkRemittanceDetail } from './IthinkRemittanceDetail';
```

- [ ] **Step 4: Typecheck**

```bash
cd backend && npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/models/IthinkShipment.ts \
        backend/src/db/models/IthinkRemittanceDetail.ts \
        backend/src/db/models/index.ts
git commit -m "feat(ithink): update IthinkShipment model, add IthinkRemittanceDetail model"
```

---

## Task 7: Rewrite the sync pipeline

**Files:**
- Rewrite: `backend/src/modules/ithink/ithink.sync.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ConnectorHealth, IthinkShipment, IthinkRemittance, IthinkRemittanceDetail } from '@db/models';
import {
  getStoreOrderDetails, trackAWBs, getRemittanceSummary, getRemittanceDetails,
  type StoreOrderItem,
} from './ithink.connector';
import { logger } from '@logger/logger';

function extractNumericId(gqlId: string): string {
  return gqlId.includes('/') ? gqlId.split('/').pop()! : gqlId;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── 1. Backfill: drive from Shopify orders → enrich via iThink ────────────

export async function backfillShipments(since: string, until: string): Promise<void> {
  logger.info(`[iThink] Backfill shipments from ${since} to ${until}`);

  const shopifyOrders = await sequelize.query<{ order_id: string }>(
    `SELECT order_id FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until
       AND financial_status != 'voided'
     ORDER BY created_at`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );

  if (!shopifyOrders.length) {
    logger.info('[iThink] No Shopify orders in date range');
    return;
  }

  logger.info(`[iThink] Backfilling ${shopifyOrders.length} orders`);

  // Batch 50 at a time
  const batches: Array<typeof shopifyOrders> = [];
  for (let i = 0; i < shopifyOrders.length; i += 50) {
    batches.push(shopifyOrders.slice(i, i + 50));
  }

  let enriched = 0;

  for (const batch of batches) {
    const numericIds = batch.map((o) => extractNumericId(o.order_id));
    const gqlById = Object.fromEntries(
      batch.map((o) => [extractNumericId(o.order_id), o.order_id]),
    );

    let res;
    try {
      res = await getStoreOrderDetails(numericIds);
    } catch (err) {
      logger.error(`[iThink] Store order details batch failed: ${(err as Error).message}`);
      await sleep(500);
      continue;
    }

    if (res.status !== 'success' || !res.data) {
      logger.info(`[iThink] Batch returned status=${res.status}, message=${res.message ?? 'none'}`);
      await sleep(500);
      continue;
    }

    for (const [numericId, item] of Object.entries(res.data)) {
      if (!item || !item.awb_no) continue;

      await IthinkShipment.upsert({
        awb: item.awb_no,
        shopify_order_gql_id: gqlById[numericId],
        order_id: numericId,
        order_date: item.order_date || undefined,
        courier: item.logistic || undefined,
        payment_mode: item.payment_mode || undefined,
        customer_city: item.customer_city || undefined,
        customer_state: item.customer_state || undefined,
        customer_pincode: item.customer_pincode || undefined,
        weight: item.weight ? parseFloat(item.weight) : undefined,
        billed_fwd_charges: item.billing_fwd_charges ? parseFloat(item.billing_fwd_charges) : undefined,
        billed_rto_charges: item.billing_rto_charges ? parseFloat(item.billing_rto_charges) : undefined,
        billed_cod_charges: item.billing_cod_charges ? parseFloat(item.billing_cod_charges) : undefined,
        billed_gst_charges: item.billing_gst_charges ? parseFloat(item.billing_gst_charges) : undefined,
        billed_total: item.billed_total_charges ? parseFloat(item.billed_total_charges) : undefined,
        raw_response: item as unknown as Record<string, unknown>,
      });
      enriched++;
    }

    await sleep(500);
  }

  logger.info(`[iThink] Backfill complete — ${enriched} shipments upserted`);
}

// ── 2. Status update: track in-flight AWBs ────────────────────────────────

export async function syncShipmentStatus(): Promise<void> {
  const inFlight = await sequelize.query<{ awb: string }>(
    `SELECT awb FROM ithink_shipments
     WHERE current_status_code NOT IN ('DL', 'CN')
       AND (order_date >= NOW() - INTERVAL '60 days' OR order_date IS NULL)`,
    { type: QueryTypes.SELECT },
  );

  if (!inFlight.length) {
    logger.info('[iThink] No in-flight shipments to track');
    return;
  }

  const awbList = inFlight.map((r) => r.awb);
  logger.info(`[iThink] Tracking ${awbList.length} in-flight AWBs`);

  let updated = 0;
  try {
    const tracking = await trackAWBs(awbList);

    for (const [awb, data] of Object.entries(tracking)) {
      await IthinkShipment.update(
        {
          current_status: data.current_status,
          current_status_code: data.current_status_code,
          ofd_count: parseInt(data.ofd_count || '0', 10),
          expected_delivery: data.expected_delivery_date || undefined,
          last_scan: data.last_scan_details || undefined,
          delivered_date: data.order_date_time?.delivery_date || undefined,
          rto_date: data.order_date_time?.rto_delivered_date || undefined,
        },
        { where: { awb } },
      );
      updated++;
    }
  } catch (err) {
    logger.error(`[iThink] Status update failed: ${(err as Error).message}`);
    throw err;
  }

  logger.info(`[iThink] Tracking updated ${updated} shipments`);
}

// ── 3. Remittance: summary + AWB-level breakdown ──────────────────────────

export async function syncRemittance(date: string): Promise<void> {
  logger.info(`[iThink] Syncing remittance for ${date}`);

  try {
    const [summaryRes, detailRes] = await Promise.all([
      getRemittanceSummary(date),
      getRemittanceDetails(date),
    ]);

    if (summaryRes.status === 'success' && summaryRes.data?.length) {
      const r = summaryRes.data[0];
      await IthinkRemittance.upsert({
        remittance_date: date,
        cod_generated: parseFloat(r.cod_generated || '0'),
        bill_adjusted: parseFloat(r.bill_adjusted || '0'),
        transaction_fee: parseFloat(r.transaction_charges || '0'),
        gst_charges: parseFloat(r.transaction_gst_charges || '0'),
        wallet_amount: parseFloat(r.wallet_amount || '0'),
        advance_hold: parseFloat(r.advance_hold || '0'),
        cod_remitted: parseFloat(r.cod_remitted || '0'),
      });
      logger.info(`[iThink] Remittance summary saved for ${date}`);
    } else {
      logger.info(`[iThink] No remittance summary for ${date}`);
    }

    if (detailRes.status === 'success' && detailRes.data?.length) {
      for (const item of detailRes.data) {
        await IthinkRemittanceDetail.upsert({
          remittance_date: date,
          awb: item.airway_bill_no,
          order_no: item.order_no || undefined,
          price: item.price ? parseFloat(item.price) : undefined,
          delivered_date: item.delivered_date || undefined,
        });
      }
      logger.info(`[iThink] ${detailRes.data.length} remittance line items saved for ${date}`);
    }
  } catch (err) {
    logger.error(`[iThink] Remittance sync error for ${date}: ${(err as Error).message}`);
    throw err;
  }
}

// ── Orchestrator: called by cron ──────────────────────────────────────────

export async function syncIthinkShipments(): Promise<void> {
  try {
    await syncShipmentStatus();
    await ConnectorHealth.update(
      { last_sync_at: new Date(), status: 'green', error_message: undefined },
      { where: { connector_name: 'ithink' } },
    );
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'ithink' } },
    );
    logger.error(`[iThink] Sync error: ${(err as Error).message}`);
  }
}

export async function syncDailyRemittance(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await syncRemittance(today);
}
```

- [ ] **Step 2: Typecheck**

```bash
cd backend && npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/ithink/ithink.sync.ts
git commit -m "feat(ithink): rewrite sync — backfill from Shopify, status tracking, remittance"
```

---

## Task 8: Wire backfill into sync service and add API endpoint

**Files:**
- Modify: `backend/src/modules/sync/sync.service.ts`
- Modify: `backend/src/modules/sync/sync.controller.ts`
- Modify: `backend/src/modules/sync/sync.routes.ts`

- [ ] **Step 1: Add `triggerIthinkBackfill` to sync.service.ts**

Open `backend/src/modules/sync/sync.service.ts`. Add import:
```typescript
import { backfillShipments, syncShipmentStatus, syncDailyRemittance } from '@modules/ithink/ithink.sync';
```

Replace the existing `triggerIthinkSync` function:
```typescript
export async function triggerIthinkSync(): Promise<SyncResult> {
  await syncShipmentStatus();
  await syncDailyRemittance();
  return { message: 'iThink sync triggered' };
}

export async function triggerIthinkBackfill(since: string, until: string): Promise<SyncResult & { since: string; until: string }> {
  await backfillShipments(since, until);
  return { message: 'iThink backfill triggered', since, until };
}
```

- [ ] **Step 2: Add backfill handler to sync.controller.ts**

Open `backend/src/modules/sync/sync.controller.ts`. Add import of `triggerIthinkBackfill`:
```typescript
import {
  triggerShopifySync, triggerMetaSync,
  triggerIthinkSync, triggerIthinkBackfill, triggerJudgeMeSync, triggerAllSync,
} from './sync.service';
```

Add the handler function after `syncIthinkHandler`:
```typescript
export async function syncIthinkBackfillHandler(req: Request, res: Response): Promise<void> {
  try {
    const { since, until } = req.query as { since?: string; until?: string };
    if (!since || !until) {
      res.status(400).json({ error: 'since and until query params required (YYYY-MM-DD)' });
      return;
    }
    handleApiResponse(res, { data: await triggerIthinkBackfill(since, until) });
  } catch (err) { handleErrorResponse(res, errOpts(err)); }
}
```

- [ ] **Step 3: Register the route in sync.routes.ts**

Open `backend/src/modules/sync/sync.routes.ts`. Add import:
```typescript
import {
  syncShopifyHandler, syncMetaHandler, syncIthinkHandler,
  syncIthinkBackfillHandler, syncJudgeMeHandler, syncAllHandler,
} from './sync.controller';
```

Add route after existing ithink route:
```typescript
router.post('/ithink/backfill', syncIthinkBackfillHandler);
```

- [ ] **Step 4: Typecheck**

```bash
cd backend && npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/sync/sync.service.ts \
        backend/src/modules/sync/sync.controller.ts \
        backend/src/modules/sync/sync.routes.ts
git commit -m "feat(ithink): expose /sync/ithink/backfill endpoint with since/until params"
```

---

## Task 9: Run the full backfill and verify

- [ ] **Step 1: Start the backend dev server**

```bash
cd backend && npm run dev
```

Wait for `Server running on port 4000`.

- [ ] **Step 2: Run the pincode healthcheck**

```bash
curl -s -X POST http://localhost:4000/api/sync/ithink \
  -H "Content-Type: application/json" | jq .
```
Expected: `{ "success": true, "data": { "message": "iThink sync triggered" } }` (even with 0 AWBs — no error).

- [ ] **Step 3: Trigger the full backfill via API**

```bash
curl -s -X POST \
  "http://localhost:4000/api/sync/ithink/backfill?since=2025-04-01&until=2026-04-20" \
  -H "Content-Type: application/json" | jq .
```
Expected: `{ "success": true, "data": { "message": "iThink backfill triggered", "since": "2025-04-01", "until": "2026-04-20" } }`. Watch server logs — should show `[iThink] Backfilling N orders` then `[iThink] Backfill complete — M shipments upserted`.

- [ ] **Step 4: Verify data in the database**

```bash
psql postgresql://shayn_user:mihil@localhost:5432/shayn_mis -c "
SELECT COUNT(*) AS total_shipments,
       COUNT(awb) FILTER (WHERE current_status_code = 'DL') AS delivered,
       COUNT(awb) FILTER (WHERE current_status_code LIKE 'RT%') AS rto,
       COUNT(awb) FILTER (WHERE current_status_code = 'UD') AS in_flight
FROM ithink_shipments;"
```
Expected: `total_shipments` > 0. If 0, check server logs for the error message — it will say what iThink returned.

- [ ] **Step 5: Trigger remittance for a past date**

```bash
psql postgresql://shayn_user:mihil@localhost:5432/shayn_mis -c "
SELECT remittance_date, cod_generated, cod_remitted FROM ithink_remittance LIMIT 5;"
```

If empty, check manually via the script:
```bash
cd backend && npx tsx -e "
import { syncRemittance } from './src/modules/ithink/ithink.sync';
syncRemittance('2026-04-19').then(() => console.log('done')).catch(console.error);
"
```

- [ ] **Step 6: Commit final verification note in git**

```bash
git add -A
git commit -m "feat(ithink): complete logistics pipeline — backfill + status + remittance"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by |
|---|---|
| Drive pipeline from Shopify order IDs (not iThink order listing) | Task 7 `backfillShipments` queries `shopify_orders` |
| Batch 50 order IDs per store-order-details call | Task 7 `for (let i = 0; i < ...; i += 50)` |
| Track endpoint uses `api.ithinklogistics.com` (NOT `my.`) | Task 2 `API_BASE` constant |
| Batch 10 AWBs per track call | Task 2 `trackAWBs` chunks by 10 |
| 500ms delay between batches | Task 2 `sleep(500)` after each chunk |
| Retry HTTP non-200 with 1s/3s/9s backoff | Task 2 `postTo` retry loop |
| Never log credentials | Task 2 logs endpoint + status only, never AUTH |
| `platform_id` sent as string `"2"` | Task 2 `environment.ithink.platformId` (string from env) |
| Endpoint 1: Store Order Details | Task 2 `getStoreOrderDetails` |
| Endpoint 2: Track (correct host) | Task 2 `trackAWBs` |
| Endpoint 3: Remittance summary | Task 2 `getRemittanceSummary` |
| Endpoint 4: Remittance details | Task 2 `getRemittanceDetails` |
| Endpoint 5: Pincode healthcheck | Task 2 `checkPincode` |
| Healthcheck script | Task 3 |
| One-off order smoke test | Task 4 |
| Schema: add columns to existing table (not parallel table) | Task 5 — columns added to `ithink_shipments` |
| New table for AWB-level remittance | Task 5 `ithink_remittance_details` |
| Raw response stored for audit | Task 7 `raw_response: item` in upsert |
| Broken endpoints NOT used (get_details, get-order-list) | Neither appears anywhere in new connector |
| Backfill via on-demand API endpoint | Task 8 `POST /sync/ithink/backfill?since=&until=` |

### Type consistency check
- `StoreOrderItem.awb_no` used in Task 7 ✅
- `StoreOrderItem.logistic` used in Task 7 ✅
- `TrackResult.current_status_code` used in Task 7 ✅
- `IthinkRemittanceDetail.upsert({remittance_date, awb, ...})` matches model in Task 6 ✅
- `backfillShipments(since, until)` signature matches Task 8 service call ✅
- `syncIthinkShipments()` and `syncDailyRemittance()` signatures unchanged for `triggerAllSync` compatibility ✅
