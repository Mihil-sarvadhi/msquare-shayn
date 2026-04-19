# SHAYN MIS — V1 Execution Plan for Claude Code

> This file is the complete technical execution plan. Read it entirely before starting.
> Build everything in sequence. Do not skip steps.

---

## Project Summary

Build a **single-page MIS dashboard** for SHAYN jewelry brand pulling real data from:
- **Shopify** (GraphQL Admin API v2026-01)
- **Meta Ads** (Marketing API v25.0)
- **iThink Logistics** (REST API v3.0.0)

**Stack:** Node.js + Express (backend) · PostgreSQL (database) · React + Tailwind + Recharts (frontend)
**Output:** One page, real data, three live connectors, clean jewelry-brand UI

---

## Repository Structure

```
shayn-mis/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # PostgreSQL connection pool
│   │   │   └── env.js               # Environment variable validation
│   │   ├── connectors/
│   │   │   ├── shopify.js           # Shopify GraphQL connector
│   │   │   ├── metaAds.js           # Meta Ads connector
│   │   │   └── ithink.js            # iThink Logistics connector
│   │   ├── jobs/
│   │   │   ├── scheduler.js         # node-cron job scheduler
│   │   │   ├── shopifySync.js       # Shopify polling job
│   │   │   ├── metaSync.js          # Meta Ads polling job
│   │   │   └── ithinkSync.js        # iThink polling job
│   │   ├── backfill/
│   │   │   ├── shopifyBackfill.js   # 12-month Shopify historical pull
│   │   │   ├── metaBackfill.js      # 12-month Meta Ads historical pull
│   │   │   └── ithinkBackfill.js    # 12-month iThink historical pull
│   │   ├── webhooks/
│   │   │   └── shopifyWebhook.js    # Shopify webhook receiver
│   │   ├── routes/
│   │   │   ├── dashboard.js         # Dashboard data endpoints
│   │   │   ├── health.js            # Connector health endpoint
│   │   │   └── sync.js              # Manual sync trigger endpoints
│   │   ├── db/
│   │   │   ├── migrate.js           # Run all migrations
│   │   │   └── migrations/
│   │   │       ├── 001_shopify.sql
│   │   │       ├── 002_meta.sql
│   │   │       ├── 003_ithink.sql
│   │   │       └── 004_health.sql
│   │   └── server.js                # Express app entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx            # Header with filters + health dots
│   │   │   ├── KPICard.jsx           # Single KPI card component
│   │   │   ├── RevenueChart.jsx      # Daily revenue line chart
│   │   │   ├── MetaFunnel.jsx        # Ads funnel chart
│   │   │   ├── PlatformOrders.jsx    # Platform breakdown + placeholders
│   │   │   ├── OrderStatus.jsx       # Order status donut chart
│   │   │   ├── CODSplit.jsx          # COD vs Prepaid donut chart
│   │   │   ├── LogisticsSummary.jsx  # iThink delivery metrics
│   │   │   ├── TopProducts.jsx       # Top 5 products table
│   │   │   ├── AbandonedCart.jsx     # Abandoned cart tile
│   │   │   ├── CustomerMetrics.jsx   # New vs returning tile
│   │   │   ├── CampaignTable.jsx     # Meta campaigns table
│   │   │   └── ComingSoon.jsx        # Placeholder tile for future connectors
│   │   ├── hooks/
│   │   │   └── useDashboard.js       # Central data fetching hook
│   │   ├── utils/
│   │   │   ├── formatters.js         # ₹1.2L formatter, date formatter
│   │   │   └── api.js               # Axios instance + base URL
│   │   ├── App.jsx
│   │   ├── index.jsx
│   │   └── index.css                # Tailwind base + custom CSS vars
│   ├── tailwind.config.js
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## Step 1 — Environment Setup

### 1.1 Create `.env` for backend

```env
# Database
DATABASE_URL=postgresql://shayn_user:password@localhost:5432/shayn_mis

# Shopify
SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_access_token
SHOPIFY_API_VERSION=2026-01
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Meta Ads
META_USER_TOKEN=your_user_token
META_APP_TOKEN=your_app_token
META_AD_ACCOUNT_ID=act_XXXXXXXXXX
META_API_VERSION=v25.0

# iThink Logistics
ITHINK_ACCESS_TOKEN=your_access_token
ITHINK_SECRET_KEY=your_secret_key
ITHINK_BASE_URL=https://my.ithinklogistics.com

# App
PORT=4000
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
```

### 1.2 Create `.env` for frontend

```env
REACT_APP_API_URL=http://localhost:4000/api
```

---

## Step 2 — Database Setup

### 2.1 Create PostgreSQL database

```bash
createdb shayn_mis
createuser shayn_user
psql shayn_mis -c "GRANT ALL ON DATABASE shayn_mis TO shayn_user;"
```

### 2.2 Migration: `001_shopify.sql`

```sql
CREATE TABLE IF NOT EXISTS shopify_orders (
  order_id           TEXT PRIMARY KEY,
  order_name         TEXT,
  created_at         TIMESTAMPTZ,
  channel            TEXT,
  revenue            NUMERIC(12,2),
  payment_mode       TEXT,
  financial_status   TEXT,
  fulfillment_status TEXT,
  customer_id        TEXT,
  customer_email     TEXT,
  customer_city      TEXT,
  customer_state     TEXT,
  discount_code      TEXT,
  synced_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopify_order_lineitems (
  id           SERIAL PRIMARY KEY,
  order_id     TEXT REFERENCES shopify_orders(order_id) ON DELETE CASCADE,
  sku          TEXT,
  product_id   TEXT,
  title        TEXT,
  variant      TEXT,
  quantity     INTEGER,
  unit_price   NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS shopify_customers (
  customer_id   TEXT PRIMARY KEY,
  email         TEXT,
  first_name    TEXT,
  last_name     TEXT,
  city          TEXT,
  state         TEXT,
  orders_count  INTEGER,
  total_spent   NUMERIC(12,2),
  created_at    TIMESTAMPTZ,
  synced_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopify_abandoned_checkouts (
  checkout_id    TEXT PRIMARY KEY,
  created_at     TIMESTAMPTZ,
  cart_value     NUMERIC(12,2),
  email          TEXT,
  recovered      BOOLEAN DEFAULT FALSE,
  stage          TEXT,
  synced_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON shopify_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_mode ON shopify_orders(payment_mode);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON shopify_orders(channel);
CREATE INDEX IF NOT EXISTS idx_lineitems_order_id ON shopify_order_lineitems(order_id);
CREATE INDEX IF NOT EXISTS idx_lineitems_product_id ON shopify_order_lineitems(product_id);
```

### 2.3 Migration: `002_meta.sql`

```sql
CREATE TABLE IF NOT EXISTS meta_daily_insights (
  id              SERIAL PRIMARY KEY,
  date            DATE,
  campaign_id     TEXT,
  campaign_name   TEXT,
  objective       TEXT,
  status          TEXT,
  spend           NUMERIC(12,2),
  impressions     INTEGER,
  reach           INTEGER,
  clicks          INTEGER,
  ctr             NUMERIC(6,4),
  cpm             NUMERIC(10,4),
  cpc             NUMERIC(10,4),
  purchases       INTEGER,
  purchase_value  NUMERIC(12,2),
  roas            NUMERIC(8,4),
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_date ON meta_daily_insights(date);
CREATE INDEX IF NOT EXISTS idx_meta_campaign ON meta_daily_insights(campaign_id);
```

### 2.4 Migration: `003_ithink.sql`

```sql
CREATE TABLE IF NOT EXISTS ithink_shipments (
  awb                  TEXT PRIMARY KEY,
  order_id             TEXT,
  order_date           DATE,
  courier              TEXT,
  zone                 TEXT,
  payment_mode         TEXT,
  current_status       TEXT,
  current_status_code  TEXT,
  customer_state       TEXT,
  customer_city        TEXT,
  customer_pincode     TEXT,
  billed_fwd_charges   NUMERIC(10,2),
  billed_rto_charges   NUMERIC(10,2),
  billed_cod_charges   NUMERIC(10,2),
  billed_gst_charges   NUMERIC(10,2),
  billed_total         NUMERIC(10,2),
  remittance_amount    NUMERIC(10,2),
  ofd_count            INTEGER DEFAULT 0,
  delivered_date       DATE,
  rto_date             DATE,
  expected_delivery    DATE,
  synced_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ithink_remittance (
  id                SERIAL PRIMARY KEY,
  remittance_date   DATE UNIQUE,
  cod_generated     NUMERIC(12,2),
  bill_adjusted     NUMERIC(12,2),
  transaction_fee   NUMERIC(10,2),
  gst_charges       NUMERIC(10,2),
  wallet_amount     NUMERIC(12,2),
  advance_hold      NUMERIC(12,2),
  cod_remitted      NUMERIC(12,2),
  synced_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ithink_status ON ithink_shipments(current_status_code);
CREATE INDEX IF NOT EXISTS idx_ithink_order_date ON ithink_shipments(order_date);
CREATE INDEX IF NOT EXISTS idx_ithink_order_id ON ithink_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_ithink_remittance_date ON ithink_remittance(remittance_date);
```

### 2.5 Migration: `004_health.sql`

```sql
CREATE TABLE IF NOT EXISTS connector_health (
  id              SERIAL PRIMARY KEY,
  connector_name  TEXT UNIQUE,
  last_sync_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'unknown',
  error_message   TEXT,
  records_synced  INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO connector_health (connector_name, status)
VALUES ('shopify', 'unknown'), ('meta_ads', 'unknown'), ('ithink', 'unknown')
ON CONFLICT (connector_name) DO NOTHING;
```

---

## Step 3 — Backend: Connector Implementation

### 3.1 Shopify Connector (`connectors/shopify.js`)

```javascript
const axios = require('axios');

const SHOPIFY_ENDPOINT = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION}/graphql.json`;

const headers = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
};

// GraphQL query for recent orders (incremental sync)
const ORDERS_QUERY = `
  query GetOrders($query: String, $cursor: String) {
    orders(first: 250, query: $query, after: $cursor, sortKey: CREATED_AT) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          paymentGatewayNames
          totalPriceSet { shopMoney { amount currencyCode } }
          discountCodes { code }
          customer { id email defaultAddress { city province } }
          lineItems(first: 20) {
            edges {
              node {
                sku
                title
                quantity
                variant { id title }
                originalUnitPriceSet { shopMoney { amount } }
              }
            }
          }
        }
      }
    }
  }
`;

async function graphqlRequest(query, variables = {}) {
  const response = await axios.post(SHOPIFY_ENDPOINT, { query, variables }, { headers });
  if (response.data.errors) throw new Error(JSON.stringify(response.data.errors));
  return response.data.data;
}

async function fetchRecentOrders(updatedAtMin) {
  const queryStr = updatedAtMin ? `updated_at:>='${updatedAtMin}'` : 'created_at:>=2025-04-01';
  let allOrders = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await graphqlRequest(ORDERS_QUERY, { query: queryStr, cursor });
    const { edges, pageInfo } = data.orders;
    allOrders = allOrders.concat(edges.map(e => e.node));
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
    if (hasNextPage) await new Promise(r => setTimeout(r, 500)); // respect rate limits
  }
  return allOrders;
}

// Bulk operation for 12-month historical backfill
const BULK_ORDERS_QUERY = `
  mutation {
    bulkOperationRunQuery(
      query: """
      {
        orders(query: "created_at:>=2025-04-01") {
          edges { node {
            id name createdAt
            displayFinancialStatus displayFulfillmentStatus
            paymentGatewayNames
            totalPriceSet { shopMoney { amount } }
            discountCodes { code }
            customer { id email defaultAddress { city province } }
            lineItems {
              edges { node {
                sku title quantity
                originalUnitPriceSet { shopMoney { amount } }
              }}
            }
          }}
        }
      }
      """
    ) {
      bulkOperation { id status }
      userErrors { field message }
    }
  }
`;

async function startBulkBackfill() {
  const data = await graphqlRequest(BULK_ORDERS_QUERY);
  return data.bulkOperationRunQuery.bulkOperation;
}

async function checkBulkStatus(operationId) {
  const query = `
    query { bulkOperation(id: "${operationId}") { id status url errorCode } }
  `;
  const data = await graphqlRequest(query);
  return data.bulkOperation;
}

async function fetchAbandonedCheckouts(updatedAtMin) {
  const query = `
    query {
      abandonedCheckouts(first: 250) {
        edges { node {
          id createdAt abandonedCheckoutUrl
          totalPriceV2 { amount }
          email
          lineItems(first: 5) {
            edges { node { title quantity } }
          }
        }}
      }
    }
  `;
  const data = await graphqlRequest(query);
  return data.abandonedCheckouts.edges.map(e => e.node);
}

module.exports = { fetchRecentOrders, startBulkBackfill, checkBulkStatus, fetchAbandonedCheckouts };
```

### 3.2 Meta Ads Connector (`connectors/metaAds.js`)

```javascript
const axios = require('axios');

const BASE = `https://graph.facebook.com/${process.env.META_API_VERSION}`;
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID;
const TOKEN = process.env.META_USER_TOKEN;

const INSIGHT_FIELDS = [
  'campaign_id', 'campaign_name', 'objective', 'status',
  'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpm', 'cpc',
  'actions', 'action_values', 'purchase_roas'
].join(',');

async function fetchCampaignInsights(since, until) {
  const params = {
    access_token: TOKEN,
    time_range: JSON.stringify({ since, until }),
    time_increment: 1,       // one row per day per campaign
    level: 'campaign',
    fields: INSIGHT_FIELDS,
    limit: 500,
  };

  let allInsights = [];
  let url = `${BASE}/${AD_ACCOUNT}/insights`;

  while (url) {
    const res = await axios.get(url, { params: url === `${BASE}/${AD_ACCOUNT}/insights` ? params : {} });
    allInsights = allInsights.concat(res.data.data);
    url = res.data.paging?.next || null;
  }
  return allInsights;
}

// Async job for large date ranges (12-month backfill)
async function startAsyncInsightsJob(since, until) {
  const res = await axios.post(`${BASE}/${AD_ACCOUNT}/insights`, null, {
    params: {
      access_token: TOKEN,
      time_range: JSON.stringify({ since, until }),
      time_increment: 1,
      level: 'campaign',
      fields: INSIGHT_FIELDS,
    }
  });
  return res.data.report_run_id;
}

async function checkAsyncJobStatus(reportRunId) {
  const res = await axios.get(`${BASE}/${reportRunId}`, {
    params: { access_token: TOKEN }
  });
  return res.data;  // { id, async_status, async_percent_completion }
}

async function fetchAsyncJobResults(reportRunId) {
  const res = await axios.get(`${BASE}/${reportRunId}/insights`, {
    params: { access_token: TOKEN, limit: 500 }
  });
  return res.data.data;
}

function parseActions(actions = [], actionValues = []) {
  const purchases = actions.find(a => a.action_type === 'purchase')?.value || 0;
  const purchaseValue = actionValues.find(a => a.action_type === 'purchase')?.value || 0;
  return { purchases: parseInt(purchases), purchaseValue: parseFloat(purchaseValue) };
}

module.exports = { fetchCampaignInsights, startAsyncInsightsJob, checkAsyncJobStatus, fetchAsyncJobResults, parseActions };
```

### 3.3 iThink Connector (`connectors/ithink.js`)

```javascript
const axios = require('axios');

const BASE = process.env.ITHINK_BASE_URL;
const AUTH = {
  access_token: process.env.ITHINK_ACCESS_TOKEN,
  secret_key: process.env.ITHINK_SECRET_KEY,
};

async function post(endpoint, data) {
  const res = await axios.post(`${BASE}${endpoint}`, { data: { ...AUTH, ...data } }, {
    headers: { 'Content-Type': 'application/json' }
  });
  return res.data;
}

async function getOrderDetails(startDate, endDate) {
  return post('/api_v3/order/get_details.json', {
    awb_number_list: '',
    start_date: startDate,
    end_date: endDate,
  });
}

// Max 10 AWBs per call — batch them
async function trackOrders(awbList) {
  const results = {};
  const chunks = [];
  for (let i = 0; i < awbList.length; i += 10) {
    chunks.push(awbList.slice(i, i + 10));
  }
  for (const chunk of chunks) {
    const res = await post('/api_v3/order/track.json', {
      awb_number_list: chunk.join(','),
    });
    Object.assign(results, res.data || {});
    await new Promise(r => setTimeout(r, 200)); // throttle
  }
  return results;
}

async function getRemittance(date) {
  return post('/api_v3/remittance/get.json', { remittance_date: date });
}

async function getRemittanceDetails(date) {
  return post('/api_v3/remittance/get_details.json', { remittance_date: date });
}

module.exports = { getOrderDetails, trackOrders, getRemittance, getRemittanceDetails };
```

---

## Step 4 — Backend: Sync Jobs

### 4.1 Shopify Sync Job (`jobs/shopifySync.js`)

```javascript
const db = require('../config/database');
const shopify = require('../connectors/shopify');

async function syncShopifyOrders() {
  try {
    // Get last sync time
    const { rows } = await db.query(
      "SELECT last_sync_at FROM connector_health WHERE connector_name = 'shopify'"
    );
    const lastSync = rows[0]?.last_sync_at?.toISOString().split('T')[0];

    const orders = await shopify.fetchRecentOrders(lastSync);
    let count = 0;

    for (const order of orders) {
      const paymentMode = order.paymentGatewayNames?.includes('cash on delivery') ||
                          order.paymentGatewayNames?.some(g => g.toLowerCase().includes('cod'))
                          ? 'COD' : 'Prepaid';

      await db.query(`
        INSERT INTO shopify_orders
          (order_id, order_name, created_at, revenue, payment_mode,
           financial_status, fulfillment_status, customer_id, customer_email,
           customer_city, customer_state, discount_code)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (order_id) DO UPDATE SET
          financial_status = EXCLUDED.financial_status,
          fulfillment_status = EXCLUDED.fulfillment_status,
          synced_at = NOW()
      `, [
        order.id, order.name, order.createdAt,
        parseFloat(order.totalPriceSet?.shopMoney?.amount || 0),
        paymentMode, order.displayFinancialStatus, order.displayFulfillmentStatus,
        order.customer?.id, order.customer?.email,
        order.customer?.defaultAddress?.city, order.customer?.defaultAddress?.province,
        order.discountCodes?.[0]?.code || null
      ]);

      // Sync line items
      for (const { node: item } of (order.lineItems?.edges || [])) {
        await db.query(`
          INSERT INTO shopify_order_lineitems
            (order_id, sku, title, variant, quantity, unit_price)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT DO NOTHING
        `, [
          order.id, item.sku, item.title,
          item.variant?.title, item.quantity,
          parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || 0)
        ]);
      }
      count++;
    }

    await db.query(`
      UPDATE connector_health
      SET last_sync_at = NOW(), status = 'green', records_synced = $1, error_message = NULL
      WHERE connector_name = 'shopify'
    `, [count]);

    console.log(`[Shopify] Synced ${count} orders`);
  } catch (err) {
    await db.query(`
      UPDATE connector_health SET status = 'red', error_message = $1
      WHERE connector_name = 'shopify'
    `, [err.message]);
    console.error('[Shopify] Sync error:', err.message);
  }
}

module.exports = { syncShopifyOrders };
```

### 4.2 Meta Ads Sync Job (`jobs/metaSync.js`)

```javascript
const db = require('../config/database');
const meta = require('../connectors/metaAds');

async function syncMetaInsights() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const insights = await meta.fetchCampaignInsights(sevenDaysAgo, today);
    let count = 0;

    for (const insight of insights) {
      const { purchases, purchaseValue } = meta.parseActions(insight.actions, insight.action_values);
      const roas = insight.purchase_roas?.[0]?.value || 0;

      await db.query(`
        INSERT INTO meta_daily_insights
          (date, campaign_id, campaign_name, objective, status, spend,
           impressions, reach, clicks, ctr, cpm, cpc, purchases, purchase_value, roas)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (date, campaign_id) DO UPDATE SET
          spend = EXCLUDED.spend, impressions = EXCLUDED.impressions,
          clicks = EXCLUDED.clicks, purchases = EXCLUDED.purchases,
          purchase_value = EXCLUDED.purchase_value, roas = EXCLUDED.roas,
          synced_at = NOW()
      `, [
        insight.date_start, insight.campaign_id, insight.campaign_name,
        insight.objective, insight.status,
        parseFloat(insight.spend || 0), parseInt(insight.impressions || 0),
        parseInt(insight.reach || 0), parseInt(insight.clicks || 0),
        parseFloat(insight.ctr || 0), parseFloat(insight.cpm || 0),
        parseFloat(insight.cpc || 0), purchases, parseFloat(purchaseValue),
        parseFloat(roas)
      ]);
      count++;
    }

    await db.query(`
      UPDATE connector_health
      SET last_sync_at = NOW(), status = 'green', records_synced = $1, error_message = NULL
      WHERE connector_name = 'meta_ads'
    `, [count]);

    console.log(`[Meta Ads] Synced ${count} insight rows`);
  } catch (err) {
    await db.query(`
      UPDATE connector_health SET status = 'red', error_message = $1
      WHERE connector_name = 'meta_ads'
    `, [err.message]);
    console.error('[Meta Ads] Sync error:', err.message);
  }
}

module.exports = { syncMetaInsights };
```

### 4.3 iThink Sync Job (`jobs/ithinkSync.js`)

```javascript
const db = require('../config/database');
const ithink = require('../connectors/ithink');

async function syncIthinkShipments() {
  try {
    // Get AWBs with non-terminal status to refresh
    const { rows } = await db.query(`
      SELECT awb FROM ithink_shipments
      WHERE current_status_code NOT IN ('DL', 'CN')
      AND order_date >= NOW() - INTERVAL '30 days'
    `);

    const awbList = rows.map(r => r.awb);
    if (awbList.length === 0) return;

    const tracking = await ithink.trackOrders(awbList);
    let count = 0;

    for (const [awb, data] of Object.entries(tracking)) {
      if (data.message !== 'success') continue;
      await db.query(`
        UPDATE ithink_shipments SET
          current_status = $1,
          current_status_code = $2,
          ofd_count = $3,
          delivered_date = $4,
          rto_date = $5,
          synced_at = NOW()
        WHERE awb = $6
      `, [
        data.current_status, data.current_status_code,
        parseInt(data.ofd_count || 0),
        data.order_date_time?.delivery_date || null,
        data.order_date_time?.rto_delivered_date || null,
        awb
      ]);
      count++;
    }

    await db.query(`
      UPDATE connector_health
      SET last_sync_at = NOW(), status = 'green', records_synced = $1
      WHERE connector_name = 'ithink'
    `, [count]);

    console.log(`[iThink] Updated ${count} shipments`);
  } catch (err) {
    await db.query(`
      UPDATE connector_health SET status = 'red', error_message = $1
      WHERE connector_name = 'ithink'
    `, [err.message]);
    console.error('[iThink] Sync error:', err.message);
  }
}

async function syncDailyRemittance() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await ithink.getRemittance(today);
    if (res.status !== 'success' || !res.data?.length) return;

    const r = res.data[0];
    await db.query(`
      INSERT INTO ithink_remittance
        (remittance_date, cod_generated, bill_adjusted, transaction_fee,
         gst_charges, wallet_amount, advance_hold, cod_remitted)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (remittance_date) DO UPDATE SET
        cod_remitted = EXCLUDED.cod_remitted, synced_at = NOW()
    `, [
      today, r.cod_generated, r.bill_adjusted, r.transaction_charges,
      r.transaction_gst_charges, r.wallet_amount, r.advance_hold, r.cod_remitted
    ]);
    console.log(`[iThink] Remittance synced for ${today}`);
  } catch (err) {
    console.error('[iThink] Remittance sync error:', err.message);
  }
}

module.exports = { syncIthinkShipments, syncDailyRemittance };
```

### 4.4 Scheduler (`jobs/scheduler.js`)

```javascript
const cron = require('node-cron');
const { syncShopifyOrders } = require('./shopifySync');
const { syncMetaInsights } = require('./metaSync');
const { syncIthinkShipments, syncDailyRemittance } = require('./ithinkSync');

function startScheduler() {
  // Shopify: every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Running Shopify sync...');
    await syncShopifyOrders();
  });

  // Meta Ads: every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Cron] Running Meta Ads sync...');
    await syncMetaInsights();
  });

  // iThink tracking: every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Cron] Running iThink tracking sync...');
    await syncIthinkShipments();
  });

  // iThink remittance: daily at 11pm
  cron.schedule('0 23 * * *', async () => {
    console.log('[Cron] Running iThink remittance sync...');
    await syncDailyRemittance();
  });

  console.log('[Scheduler] All cron jobs started');
}

module.exports = { startScheduler };
```

---

## Step 5 — Backend: Dashboard API Routes

### 5.1 Dashboard Routes (`routes/dashboard.js`)

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Helper: get date range from query params
function getDateRange(req) {
  const { range } = req.query;
  const end = new Date();
  const start = new Date();
  if (range === '7d') start.setDate(start.getDate() - 7);
  else if (range === '30d') start.setDate(start.getDate() - 30);
  else if (range === 'mtd') start.setDate(1);
  else start.setDate(start.getDate() - 30); // default 30d
  return {
    since: start.toISOString().split('T')[0],
    until: end.toISOString().split('T')[0],
  };
}

// GET /api/dashboard/kpis
router.get('/kpis', async (req, res) => {
  const { since, until } = getDateRange(req);
  try {
    const [shopifyKPIs, metaKPIs, ithinkKPIs] = await Promise.all([
      db.query(`
        SELECT
          COALESCE(SUM(revenue), 0) AS total_revenue,
          COUNT(*) AS total_orders,
          COALESCE(AVG(revenue), 0) AS aov,
          COUNT(DISTINCT customer_id) AS unique_customers,
          SUM(CASE WHEN payment_mode = 'COD' THEN 1 ELSE 0 END) AS cod_orders,
          SUM(CASE WHEN payment_mode = 'Prepaid' THEN 1 ELSE 0 END) AS prepaid_orders
        FROM shopify_orders
        WHERE created_at::date BETWEEN $1 AND $2
          AND financial_status != 'voided'
      `, [since, until]),
      db.query(`
        SELECT
          COALESCE(SUM(spend), 0) AS total_spend,
          COALESCE(SUM(impressions), 0) AS total_impressions,
          COALESCE(SUM(clicks), 0) AS total_clicks,
          COALESCE(SUM(purchases), 0) AS total_purchases,
          COALESCE(SUM(purchase_value), 0) AS total_purchase_value,
          CASE WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend) ELSE 0 END AS roas
        FROM meta_daily_insights
        WHERE date BETWEEN $1 AND $2
      `, [since, until]),
      db.query(`
        SELECT
          COUNT(*) AS total_shipments,
          SUM(CASE WHEN current_status_code = 'DL' THEN 1 ELSE 0 END) AS delivered,
          SUM(CASE WHEN current_status_code LIKE 'RT%' THEN 1 ELSE 0 END) AS rto,
          SUM(CASE WHEN current_status_code = 'UD' AND current_status LIKE '%Out For Delivery%' THEN 1 ELSE 0 END) AS ofd,
          SUM(CASE WHEN current_status = 'Undelivered' THEN 1 ELSE 0 END) AS ndr
        FROM ithink_shipments
        WHERE order_date BETWEEN $1 AND $2
      `, [since, until]),
    ]);

    const s = shopifyKPIs.rows[0];
    const m = metaKPIs.rows[0];
    const i = ithinkKPIs.rows[0];
    const rtoRate = i.total_shipments > 0
      ? ((i.rto / i.total_shipments) * 100).toFixed(1)
      : 0;

    res.json({
      revenue: parseFloat(s.total_revenue),
      orders: parseInt(s.total_orders),
      aov: parseFloat(s.aov),
      customers: parseInt(s.unique_customers),
      codOrders: parseInt(s.cod_orders),
      prepaidOrders: parseInt(s.prepaid_orders),
      adSpend: parseFloat(m.total_spend),
      impressions: parseInt(m.total_impressions),
      clicks: parseInt(m.total_clicks),
      purchases: parseInt(m.total_purchases),
      purchaseValue: parseFloat(m.total_purchase_value),
      roas: parseFloat(m.roas),
      totalShipments: parseInt(i.total_shipments),
      delivered: parseInt(i.delivered),
      rto: parseInt(i.rto),
      ofd: parseInt(i.ofd),
      ndr: parseInt(i.ndr),
      rtoRate: parseFloat(rtoRate),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/revenue-trend
router.get('/revenue-trend', async (req, res) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(`
      SELECT
        created_at::date AS date,
        SUM(revenue) AS revenue,
        COUNT(*) AS orders
      FROM shopify_orders
      WHERE created_at::date BETWEEN $1 AND $2
        AND financial_status != 'voided'
      GROUP BY created_at::date
      ORDER BY date ASC
    `, [since, until]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/meta-funnel
router.get('/meta-funnel', async (req, res) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(`
      SELECT
        SUM(spend) AS spend,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(purchases) AS purchases,
        SUM(purchase_value) AS purchase_value,
        CASE WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend) ELSE 0 END AS roas
      FROM meta_daily_insights
      WHERE date BETWEEN $1 AND $2
    `, [since, until]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/campaigns
router.get('/campaigns', async (req, res) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(`
      SELECT
        campaign_id, campaign_name, objective,
        SUM(spend) AS spend,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(purchases) AS purchases,
        SUM(purchase_value) AS purchase_value,
        CASE WHEN SUM(spend) > 0 THEN SUM(purchase_value) / SUM(spend) ELSE 0 END AS roas
      FROM meta_daily_insights
      WHERE date BETWEEN $1 AND $2
      GROUP BY campaign_id, campaign_name, objective
      ORDER BY spend DESC
      LIMIT 20
    `, [since, until]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/top-products
router.get('/top-products', async (req, res) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(`
      SELECT
        li.product_id,
        li.title,
        SUM(li.quantity * li.unit_price) AS revenue,
        SUM(li.quantity) AS units_sold,
        COUNT(DISTINCT o.order_id) AS orders
      FROM shopify_order_lineitems li
      JOIN shopify_orders o ON o.order_id = li.order_id
      WHERE o.created_at::date BETWEEN $1 AND $2
        AND o.financial_status != 'voided'
      GROUP BY li.product_id, li.title
      ORDER BY revenue DESC
      LIMIT 5
    `, [since, until]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/logistics
router.get('/logistics', async (req, res) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(`
      SELECT
        current_status,
        current_status_code,
        COUNT(*) AS count
      FROM ithink_shipments
      WHERE order_date BETWEEN $1 AND $2
      GROUP BY current_status, current_status_code
      ORDER BY count DESC
    `, [since, until]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/abandoned-carts
router.get('/abandoned-carts', async (req, res) => {
  const { since, until } = getDateRange(req);
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) AS count,
        COALESCE(SUM(cart_value), 0) AS total_value,
        COALESCE(AVG(cart_value), 0) AS avg_value
      FROM shopify_abandoned_checkouts
      WHERE created_at::date BETWEEN $1 AND $2
        AND recovered = FALSE
    `, [since, until]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 5.2 Health Route (`routes/health.js`)

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM connector_health ORDER BY connector_name');
  res.json(rows);
});

module.exports = router;
```

### 5.3 Express Server (`server.js`)

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Routes
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/health', require('./routes/health'));
app.use('/api/sync', require('./routes/sync'));

// Webhooks (raw body needed for HMAC verification)
app.use('/webhooks/shopify', express.raw({ type: 'application/json' }), require('./webhooks/shopifyWebhook'));

// Start scheduler
const { startScheduler } = require('./jobs/scheduler');
startScheduler();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SHAYN MIS Backend running on port ${PORT}`));
```

---

## Step 6 — Backend: Backfill Scripts

### 6.1 iThink Backfill (`backfill/ithinkBackfill.js`)

```javascript
const db = require('../config/database');
const ithink = require('../connectors/ithink');

async function backfillIthink() {
  console.log('[iThink Backfill] Starting 12-month pull...');

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
    months.push({
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${lastDay}`,
    });
  }

  let totalInserted = 0;
  for (const { start, end } of months) {
    console.log(`[iThink Backfill] Fetching ${start} → ${end}...`);
    try {
      const res = await ithink.getOrderDetails(start, end);
      if (res.status !== 'success' || !res.data) continue;

      for (const [awb, order] of Object.entries(res.data)) {
        await db.query(`
          INSERT INTO ithink_shipments
            (awb, order_id, order_date, courier, zone, payment_mode,
             current_status, billed_fwd_charges, billed_rto_charges,
             billed_cod_charges, billed_gst_charges, billed_total,
             remittance_amount, ofd_count, delivered_date, customer_state,
             customer_city, customer_pincode)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          ON CONFLICT (awb) DO NOTHING
        `, [
          awb, order.order, order.order_date?.split(' ')[0], order.logistic,
          order.billing_zone, order.payment_mode === 'cod' ? 'COD' : 'Prepaid',
          order.latest_courier_status,
          parseFloat(order.billing_fwd_charges || 0),
          parseFloat(order.billing_rto_charges || 0),
          parseFloat(order.billing_cod_charges || 0),
          parseFloat(order.billing_gst_charges || 0),
          parseFloat(order.billed_total_charges || 0),
          parseFloat(order.remittance_amount || 0),
          parseInt(order.ofd_count || 0),
          order.expected_delivery_date || null,
          order.customer_state, order.customer_city, order.customer_pincode,
        ]);
        totalInserted++;
      }
    } catch (err) {
      console.error(`[iThink Backfill] Error for ${start}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 1000)); // 1 second between months
  }
  console.log(`[iThink Backfill] Done. Inserted ${totalInserted} shipments.`);
}

backfillIthink().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
```

---

## Step 7 — Frontend: React Dashboard

### 7.1 `package.json` dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.0",
    "axios": "^1.6.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.383.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### 7.2 Tailwind Config (`tailwind.config.js`)

```javascript
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: '#B8860B', light: '#D4A017', pale: '#FEF9EE' },
        ivory: '#FDFAF4',
        ink: '#1A1208',
        muted: '#8C7B64',
        parch: '#F0EBE0',
        emerald: { DEFAULT: '#2D7D46', light: '#ECFDF5' },
        ruby: { DEFAULT: '#9B2235', light: '#FEF2F2' },
        amber: { DEFAULT: '#B45309', light: '#FFFBEB' },
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' },
    },
  },
};
```

### 7.3 Number Formatter (`utils/formatters.js`)

```javascript
// Format ₹1,23,456 → ₹1.2L
export function formatINR(value) {
  if (!value || isNaN(value)) return '₹0';
  const num = parseFloat(value);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

export function formatNum(value) {
  if (!value) return '0';
  return parseInt(value).toLocaleString('en-IN');
}

export function formatPct(value, decimals = 1) {
  return `${parseFloat(value || 0).toFixed(decimals)}%`;
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
```

### 7.4 Central Data Hook (`hooks/useDashboard.js`)

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

export function useDashboard(range = '30d') {
  const [data, setData] = useState({
    kpis: null, revenueTrend: [], metaFunnel: null,
    campaigns: [], topProducts: [], logistics: [],
    abandonedCarts: null, health: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = { range };
    setLoading(true);

    Promise.all([
      axios.get(`${API}/dashboard/kpis`, { params }),
      axios.get(`${API}/dashboard/revenue-trend`, { params }),
      axios.get(`${API}/dashboard/meta-funnel`, { params }),
      axios.get(`${API}/dashboard/campaigns`, { params }),
      axios.get(`${API}/dashboard/top-products`, { params }),
      axios.get(`${API}/dashboard/logistics`, { params }),
      axios.get(`${API}/dashboard/abandoned-carts`, { params }),
      axios.get(`${API}/health`),
    ])
      .then(([kpis, revTrend, funnel, camps, prods, logi, carts, health]) => {
        setData({
          kpis: kpis.data,
          revenueTrend: revTrend.data,
          metaFunnel: funnel.data,
          campaigns: camps.data,
          topProducts: prods.data,
          logistics: logi.data,
          abandonedCarts: carts.data,
          health: health.data,
        });
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [range]);

  return { data, loading, error };
}
```

### 7.5 Main App (`App.jsx`)

```jsx
import React, { useState } from 'react';
import { useDashboard } from './hooks/useDashboard';
import Header from './components/Header';
import KPICard from './components/KPICard';
import RevenueChart from './components/RevenueChart';
import MetaFunnel from './components/MetaFunnel';
import OrderStatus from './components/OrderStatus';
import CODSplit from './components/CODSplit';
import LogisticsSummary from './components/LogisticsSummary';
import TopProducts from './components/TopProducts';
import AbandonedCart from './components/AbandonedCart';
import CampaignTable from './components/CampaignTable';
import ComingSoon from './components/ComingSoon';
import { formatINR, formatNum, formatPct } from './utils/formatters';

export default function App() {
  const [range, setRange] = useState('30d');
  const { data, loading, error } = useDashboard(range);
  const { kpis, revenueTrend, metaFunnel, campaigns, topProducts, logistics, abandonedCarts, health } = data;

  return (
    <div className="min-h-screen bg-ivory font-sans">
      <Header range={range} setRange={setRange} health={health} />

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* Row 1 — KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-28 animate-pulse border border-parch" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPICard label="Total Revenue" value={formatINR(kpis?.revenue)} accent="#B8860B" />
            <KPICard label="Total Orders" value={formatNum(kpis?.orders)} accent="#2D7D46" />
            <KPICard label="Avg Order Value" value={formatINR(kpis?.aov)} accent="#B8860B" />
            <KPICard label="Ad Spend" value={formatINR(kpis?.adSpend)} accent="#9B2235" />
            <KPICard label="ROAS" value={`${parseFloat(kpis?.roas || 0).toFixed(2)}x`} accent="#2D7D46" />
            <KPICard label="RTO Rate" value={formatPct(kpis?.rtoRate)} accent={kpis?.rtoRate > 20 ? "#9B2235" : "#2D7D46"} />
          </div>
        )}

        {/* Row 2 — Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-parch shadow-card p-5">
            <h3 className="font-semibold text-ink mb-4 font-serif text-lg">Revenue Trend</h3>
            <RevenueChart data={revenueTrend} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-5">
            <h3 className="font-semibold text-ink mb-4 font-serif text-lg">Meta Ads Funnel</h3>
            <MetaFunnel data={metaFunnel} loading={loading} />
          </div>
        </div>

        {/* Row 3 — Platform + Order Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-parch shadow-card p-5">
            <h3 className="font-semibold text-ink mb-4 font-serif text-lg">Orders by Platform</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-body">Shopify D2C</span>
                <span className="font-mono font-bold text-ink">{formatNum(kpis?.orders)}</span>
              </div>
              <ComingSoon label="Amazon" />
              <ComingSoon label="Flipkart" />
              <ComingSoon label="Myntra" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-5">
            <h3 className="font-semibold text-ink mb-4 font-serif text-lg">Order Status</h3>
            <OrderStatus kpis={kpis} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-5">
            <h3 className="font-semibold text-ink mb-4 font-serif text-lg">COD vs Prepaid</h3>
            <CODSplit kpis={kpis} loading={loading} />
          </div>
        </div>

        {/* Row 4 — Logistics + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-parch shadow-card p-5">
            <h3 className="font-semibold text-ink mb-4 font-serif text-lg">Logistics Overview</h3>
            <LogisticsSummary logistics={logistics} kpis={kpis} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-5">
            <h3 className="font-semibold text-ink mb-4 font-serif text-lg">Top 5 Products</h3>
            <TopProducts products={topProducts} loading={loading} />
          </div>
        </div>

        {/* Row 5 — Footer metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-parch shadow-card p-5">
            <h3 className="font-semibold text-ink mb-3 font-serif text-lg">Abandoned Carts</h3>
            <AbandonedCart data={abandonedCarts} loading={loading} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-5">
            <h3 className="font-semibold text-ink mb-3 font-serif text-lg">Customer Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted">Total Customers</span>
                <span className="font-mono font-bold text-ink">{formatNum(kpis?.customers)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">COD Orders</span>
                <span className="font-mono font-bold text-ink">{formatNum(kpis?.codOrders)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Prepaid Orders</span>
                <span className="font-mono font-bold text-emerald">{formatNum(kpis?.prepaidOrders)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-5">
            <h3 className="font-semibold text-ink mb-3 font-serif text-lg">Connector Status</h3>
            {health.map(h => (
              <div key={h.connector_name} className="flex justify-between items-center mb-2">
                <span className="text-sm capitalize text-muted">{h.connector_name.replace('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${h.status === 'green' ? 'bg-emerald' : h.status === 'amber' ? 'bg-amber' : 'bg-ruby'}`} />
                  <span className="text-xs text-muted">{h.last_sync_at ? new Date(h.last_sync_at).toLocaleTimeString() : 'Never'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Table */}
        <div className="bg-white rounded-xl border border-parch shadow-card p-5">
          <h3 className="font-semibold text-ink mb-4 font-serif text-lg">Meta Campaigns Performance</h3>
          <CampaignTable campaigns={campaigns} loading={loading} />
        </div>

      </main>
    </div>
  );
}
```

---

## Step 8 — Backend `package.json`

```json
{
  "name": "shayn-mis-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "migrate": "node src/db/migrate.js",
    "backfill:shopify": "node src/backfill/shopifyBackfill.js",
    "backfill:meta": "node src/backfill/metaBackfill.js",
    "backfill:ithink": "node src/backfill/ithinkBackfill.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.0",
    "express": "^4.18.0",
    "node-cron": "^3.0.0",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

---

## Step 9 — Execution Sequence for Claude Code

Run these commands **in exact order**:

```bash
# 1. Create project structure
mkdir -p shayn-mis/backend/src/{config,connectors,jobs,backfill,webhooks,routes,db/migrations}
mkdir -p shayn-mis/frontend/src/{components,hooks,utils}

# 2. Install backend dependencies
cd shayn-mis/backend && npm install

# 3. Set up .env from .env.example (fill in real credentials)

# 4. Create PostgreSQL database and run migrations
npm run migrate

# 5. Start backend in dev mode
npm run dev

# 6. Run backfill scripts (run once, in order)
npm run backfill:shopify   # ~15 min — waits for bulk operation to complete
npm run backfill:meta      # ~5 min
npm run backfill:ithink    # ~5 min (loops 12 months)

# 7. Install frontend dependencies
cd ../frontend && npm install

# 8. Start frontend dev server
npm start
```

---

## Step 10 — Component Implementation Notes

When building each React component, follow these rules:

1. **KPICard** — accent color bar on top (3px), label small uppercase, value large serif font, delta badge (green ↑ / red ↓) if comparison data available
2. **RevenueChart** — `LineChart` from Recharts, gold line `#B8860B`, no grid on x-axis, y-axis shows ₹ values in L format, tooltip shows date + ₹ value
3. **MetaFunnel** — vertical funnel using `BarChart`, 4 bars: Impressions / Clicks / Purchases / (calculated) CTR, soft colors
4. **OrderStatus** — `PieChart` with 3 segments: Fulfilled (gold), Unfulfilled (amber), Cancelled (ruby)
5. **CODSplit** — `PieChart` with 2 segments: COD (amber), Prepaid (emerald)
6. **LogisticsSummary** — 5 stat tiles in a grid: Delivered (green), In Transit (blue), OFD (amber), RTO (red), NDR (red)
7. **TopProducts** — simple table with rank (#1–#5), product name (truncated at 25 chars), units sold, revenue
8. **CampaignTable** — columns: Campaign Name, Spend, Impressions, Clicks, CTR, Purchases, ROAS — sortable by spend
9. **ComingSoon** — grey pill badge with "Coming Soon" text — used for Amazon/Flipkart/Myntra tiles
10. **Header** — SHAYN logo left, range selector (7D/30D/MTD buttons) center, connector health dots right

---

## Step 11 — Connector Health Logic

Update `connector_health` table after every sync:
- **green** = synced successfully in last 20 minutes (Shopify), 7 hours (Meta), 35 minutes (iThink)
- **amber** = last successful sync was more than expected interval ago
- **red** = last sync threw an error (error_message is set)

Dashboard header shows three colored dots. Clicking a dot shows the last error message in a tooltip.

---

## Step 12 — What NOT to Build in V1

Do not build:
- Login / authentication
- Multiple pages or routing
- Inventory module
- Order detail pages
- Customer detail pages
- Review analytics
- Any Unicommerce integration
- Any GA4 integration
- Any GoKwik integration
- Settings page
- User management

These are Phase 2. The V1 scope is strictly what is described above.

---

## Completion Checklist

- [ ] PostgreSQL database created with all 4 migrations run
- [ ] Backend `.env` filled with real credentials
- [ ] Backend running on port 4000, all 7 dashboard API endpoints returning data
- [ ] Shopify backfill complete (12 months in `shopify_orders` table)
- [ ] Meta Ads backfill complete (12 months in `meta_daily_insights` table)
- [ ] iThink backfill complete (12 months in `ithink_shipments` table)
- [ ] All 3 cron jobs running (Shopify 15min, Meta 6hr, iThink 30min)
- [ ] Frontend running and showing real data in all sections
- [ ] KPI cards showing real numbers from DB
- [ ] Revenue trend chart rendering with real daily data
- [ ] Meta funnel chart rendering with real campaign data
- [ ] Logistics summary showing real shipment counts
- [ ] Top 5 products table populated
- [ ] Campaign table populated with real Meta campaigns
- [ ] Connector health dots showing green for all three connectors
- [ ] Date range filter (7D / 30D / MTD) working and updating all charts + cards
- [ ] Coming Soon tiles in place for Amazon, Flipkart, Myntra

---

*Execution plan for: SHAYN MIS V1 | Prepared for Claude Code*
