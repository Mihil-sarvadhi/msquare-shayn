# SHAYN MIS Platform — Complete Project Overview

> Version: 1.0 | Last Updated: April 2026 | Status: Active Development

---

## 1. Company Background

**Brand:** SHAYN — Indian D2C Jewelry Brand
**Business Model:** Omnichannel e-commerce (D2C + Marketplace)
**Sales Channels:**
- Shopify (primary D2C store)
- Amazon India
- Flipkart
- Myntra
- (Future) Other marketplaces

**Current Tech Stack in use:**
- Shopify — primary storefront and order management
- iThink Logistics — courier aggregator (Delhivery, Xpressbees, FedEx, etc.)
- Meta Ads (Facebook + Instagram) — primary paid marketing
- Judge.me — product reviews
- Unicommerce — marketplace order management (Amazon, Flipkart, Myntra) — *access pending*
- GoKwik — COD risk scoring / RTO reduction — *access pending*
- GA4 — web analytics — *API access not yet set up*
- Google Ads — *account currently inactive*

---

## 2. Problem Statement

SHAYN operates across multiple platforms — Shopify, Amazon, Flipkart, Myntra, Meta Ads, and iThink Logistics — each with its own dashboard. There is no unified view that shows:

- Total revenue across all channels
- Marketing spend vs actual revenue attributed
- Logistics performance (RTO rate, delivery success, NDR)
- Customer health (repeat rate, AOV trends)
- COD remittance vs actual collections

The team spends significant time manually collating data from multiple dashboards, CSV exports, and spreadsheets every morning. Decision-making is delayed and error-prone.

---

## 3. Solution — SHAYN MIS V1

A single-page Management Information System dashboard that pulls real data from live connectors, stores it in a central database, and presents it in one clean, consistent view.

**What it is:**
- A morning dashboard the team opens to understand yesterday's and last week's performance
- Real data from Shopify, Meta Ads, and iThink Logistics
- Consistent UI, one screen, no navigation

**What it is NOT:**
- Not an order management system
- Not an inventory management system
- Not a multi-page app
- Not a replacement for Shopify admin or Meta Ads Manager
- Not over-engineered with features that aren't needed yet

---

## 4. API Access Status

| Platform | API Access | Credentials Available | Status |
|---|---|---|---|
| Shopify | GraphQL Admin API v2026-01 | API Key + API Secret + Access Token | ✅ Live |
| Meta Ads | Marketing API v25.0 | User Token + App Token | ✅ Live |
| iThink Logistics | REST API v3.0.0 | Access Token + Secret Key | ✅ Live |
| Judge.me | REST API v1 | API Token + Shop Domain | ✅ Available (not in V1 scope) |
| Unicommerce | REST API | — | ❌ No response yet |
| GA4 | Data API | — | ❌ Not set up |
| Google Ads | API | — | ⚠️ Account inactive |
| GoKwik | REST API | — | ❌ No access yet |

---

## 5. Shopify API — What We Can Pull

**Endpoint:** `POST https://{store}.myshopify.com/admin/api/2026-01/graphql.json`
**Auth:** `X-Shopify-Access-Token` header

### Scopes Required (enable in Custom App settings)

| Scope | Unlocks |
|---|---|
| `read_orders` | Orders, abandoned checkouts, refunds, events |
| `read_all_orders` | Orders older than 60 days — **must request from Shopify separately** |
| `read_products` | Products, variants, collections |
| `read_inventory` | Inventory levels per location |
| `read_customers` | Customer profiles, LTV, order count |
| `read_discounts` | Discount codes, usage stats |

### Key APIs for SHAYN MIS

| # | Resource | GraphQL Query | Key Data |
|---|---|---|---|
| 1 | Orders | `orders` | Order ID, date, channel, total, payment mode (COD/Prepaid), status, customer, line items, SKUs |
| 2 | Order Count | `ordersCount` | Total order count for a date range |
| 3 | Abandoned Checkouts | `abandonedCheckouts` | Cart value, line items, email, stage abandoned, recovery URL |
| 4 | Customers | `customers` | Customer ID, name, email, LTV, order count, city, state |
| 5 | Products | `products` | Product ID, title, SKU, price, status |
| 6 | Inventory Levels | `inventoryLevels` | Available, committed, on-hand per location |
| 7 | Bulk Operations | `bulkOperationRunQuery` | 12-month historical backfill, zero rate limiting, JSONL output |
| 8 | ShopifyQL | `shopifyqlQuery` | Native analytics engine — revenue trends, AOV, conversion rate |
| 9 | Webhooks | Event subscriptions | Real-time: orders/create, fulfillments/create, refunds/create, checkouts/update, inventory_levels/update |

### Historical Data Pull Strategy
- Use `bulkOperationRunQuery` with `created_at:>="2025-04-01"` filter
- Submit once → Shopify processes in background (5–20 mins) → delivers JSONL file
- **Prerequisite:** `read_all_orders` scope must be approved by Shopify

### Live Sync Strategy
- Webhooks for real-time: `orders/create`, `orders/updated`, `fulfillments/create`, `refunds/create`
- Polling every 15 min: `orders?updated_at_min={last_poll_time}` as backup for missed webhooks
- Polling every 15 min: `abandonedCheckouts?updated_at_min={last_poll_time}`

---

## 6. Meta Ads API — What We Can Pull

**Base URL:** `https://graph.facebook.com/v25.0/`
**Auth:** `access_token` query param (User Token)
**Single scope required:** `ads_read`

### Key APIs for SHAYN MIS

| # | Resource | Endpoint | Key Data |
|---|---|---|---|
| 1 | Account Insights | `GET /act_{ID}/insights` | Spend, impressions, reach, clicks, ROAS, purchases, purchase value |
| 2 | Campaign Insights | `GET /act_{ID}/insights?level=campaign` | Per-campaign: spend, impressions, clicks, ROAS, conversions |
| 3 | Ad Set Insights | `GET /{ADSET_ID}/insights` | Audience-level performance |
| 4 | Insights + Breakdown | `GET /act_{ID}/insights?breakdowns=publisher_platform` | Facebook vs Instagram split |
| 5 | Campaigns List | `GET /act_{ID}/campaigns` | Campaign ID, name, objective, status, budget |
| 6 | Async Insights | `POST + poll /act_{ID}/insights` | Large historical pulls without timeout |

### Key Insight Metrics Available
`spend`, `impressions`, `reach`, `clicks`, `ctr`, `cpm`, `cpc`, `actions` (conversions), `action_values` (revenue), `purchase_roas`, `cost_per_action_type`, `outbound_clicks`, `landing_page_views`, `video_thruplay_watched_actions`

### Historical Data Pull (12 months)
```
GET /act_{ID}/insights
  ?time_range={"since":"2025-04-01","until":"2026-04-17"}
  &time_increment=1
  &level=campaign
  &fields=campaign_name,spend,impressions,clicks,actions,action_values,purchase_roas
```

### 2025–2026 Important Changes
- **June 2025:** API now mirrors Ads Manager attribution — data is consistent with what you see in Ads Manager
- **January 2026:** 7d_view and 28d_view attribution windows deprecated — only `1d_click`, `7d_click`, `1d_view` remain
- **Reach with breakdowns:** Dates older than 13 months require async jobs (within our 12-month window, no issue)

### Live Sync Strategy
- Every 6 hours: pull today's campaign-level insights
- Daily at midnight: finalize yesterday's data
- Historical: async job for full 12 months on first run

---

## 7. iThink Logistics API — What We Can Pull

**Base URL (Production):** `https://my.ithinklogistics.com`
**Auth:** `access_token` + `secret_key` in JSON body of every POST request
**All endpoints are POST with Content-Type: application/json**

### Key APIs for SHAYN MIS

| # | Name | Endpoint | Key Data |
|---|---|---|---|
| 1 | Order Details | `POST /api_v3/order/get_details.json` | AWB, order no, customer, products (SKU/qty/price), courier, zone, billed charges (fwd/RTO/COD/GST), remittance amount, delivery status |
| 2 | Order Tracking | `POST /api_v3/order/track.json` | Live status (30 codes), scan history, NDR reason, OFD count, delivery/RTO dates (max 10 AWBs/call) |
| 3 | Get Remittance | `POST /api_v3/remittance/get.json` | Daily: COD generated, bill adjusted, transaction charges, GST, net COD remitted |
| 4 | Remittance Details | `POST /api_v3/remittance/get_details.json` | AWB-wise: AWB no, order no, COD amount, delivered date |
| 5 | Get Warehouse | `POST /api_v3/warehouse/get.json` | Registered pickup addresses |
| 6 | Pincode Check | `POST /api_v3/pincode/check.json` | Serviceability per courier for a pincode |
| 7 | Get Rate | `POST /api_v3/rate/check.json` | Per-courier rate, zone, TAT |

### Historical Data Pull (12 months)
Loop month by month — 12 API calls to `order/get_details.json`:
```json
{
  "data": {
    "awb_number_list": "",
    "start_date": "2025-04-01",
    "end_date": "2025-04-30",
    "access_token": "YOUR_TOKEN",
    "secret_key": "YOUR_SECRET"
  }
}
```

For remittance: 365 calls to `remittance/get.json` — one per day, run as background job.

### Live Sync Strategy
- Every 30 min: `order/track.json` for all AWBs with non-terminal status
- Daily at 11pm: `remittance/get.json` for today's COD settlement
- **Rate limit note:** Max 10 AWBs per tracking call — batch 500 active AWBs = 50 calls over 30 min

---

## 8. Judge.me API — What We Can Pull (Future — not V1)

**Base URL:** `https://judge.me/api/v1`
**Auth:** `api_token` + `shop_domain` as query params

| # | Resource | Endpoint | Key Data |
|---|---|---|---|
| 1 | Reviews List | `GET /api/v1/reviews` | All reviews — rating, body, title, reviewer, date, photos, published status |
| 2 | Products List | `GET /api/v1/products` | Per-product average rating and review count |
| 3 | Aggregate Rating | `GET /api/reviews/aggregate_feed` | Store-wide average rating + total review count |
| 4 | Reviewer Detail | `GET /api/v1/reviewers/{ID}` | Reviewer name, email, review count |
| 5 | Webhook — New Review | Event push | Real-time new review notification |

**Note:** No direct endpoint for per-product average rating as a number — use Products List endpoint which includes `avg_rating` field, or read Shopify metafields (`product.metafields.judge_me.all_reviews_rating`).

---

## 9. Future Connectors (Not in V1)

### Unicommerce
- **Purpose:** Amazon, Flipkart, Myntra order management and fulfillment
- **Status:** No API access yet — awaiting response
- **What we'll pull:** Orders per marketplace, fulfillment status, returns, settlements
- **Join key with Shopify:** Order number / external platform order ID

### GA4
- **Purpose:** Website sessions, conversion funnel, traffic sources
- **Status:** API not set up — need to enable in GA4 Admin
- **Critical action:** Set GA4 data retention to 14 months **immediately** (irreversible if missed)
- **What we'll pull:** Sessions, users, conversion rate, landing pages, traffic source breakdown

### GoKwik
- **Purpose:** COD order risk scoring, RTO prediction
- **Status:** No API access
- **What we'll pull:** Risk score per order (stored as Shopify order metafield), COD confirmation rate
- **Join key:** Shopify order ID

### Google Ads
- **Status:** Account currently inactive — enable when active
- **What we'll pull:** Campaign spend, impressions, clicks, conversions

---

## 10. Cross-Platform Calculated Metrics

These are metrics no single platform can give — they come from joining data across connectors:

| Metric | Formula | Sources |
|---|---|---|
| True Net Revenue | Shopify order total − iThink billed charges − payment gateway % | Shopify + iThink |
| COD Recovery Rate | iThink remittance AWBs ÷ Shopify COD orders | Shopify + iThink |
| RTO Rate by State | iThink RTO count ÷ total shipments, grouped by customer_state | iThink + Shopify |
| Verified ROAS | Meta spend ÷ Shopify revenue (UTM source=facebook) | Meta + Shopify |
| Attribution Gap | Meta platform ROAS vs Shopify UTM-attributed revenue | Meta + Shopify |
| CAC | Meta total spend ÷ new Shopify customers (first order) | Meta + Shopify |
| Contribution Margin | Revenue − product cost − iThink charge − Meta spend | All three |
| OFD Count vs Delivery Rate | iThink ofd_count aggregated by courier and state | iThink |

**Join key for Shopify ↔ iThink:** Shopify fulfillment `tracking_number` field = iThink `awb_number`

---

## 11. V1 Dashboard — Single Page Layout

### Header Bar
- SHAYN MIS logo + version
- Date range filter: Last 7D / Last 30D / This Month / Custom
- Platform filter
- Connector health dots (green/amber/red): Shopify · Meta Ads · iThink
- Last synced timestamp

### Row 1 — KPI Cards (6 tiles)
| Card | Data | Source |
|---|---|---|
| Total Revenue | ₹X.XL | Shopify |
| Total Orders | X,XXX | Shopify |
| Avg Order Value | ₹X,XXX | Shopify (calculated) |
| Ad Spend | ₹X.XL | Meta Ads |
| ROAS | X.Xx | Meta Ads |
| RTO Rate | XX% | iThink |

### Row 2 — Charts
- **Left (2/3 width):** Revenue trend line chart — daily, last 30 days (Shopify)
- **Right (1/3 width):** Meta Ads funnel — Spend → Impressions → Clicks → Conversions

### Row 3 — Platform + Order Breakdown
- **Left:** Orders by platform (Shopify live, Amazon/Flipkart/Myntra as "Coming Soon")
- **Center:** Order status breakdown — fulfilled/unfulfilled/cancelled (Shopify)
- **Right:** COD vs Prepaid split — donut chart (Shopify)

### Row 4 — Logistics + Products
- **Left:** Logistics summary — Delivered / In Transit / OFD / RTO / NDR (iThink)
- **Right:** Top 5 products by revenue — table with rank, name, orders, revenue (Shopify)

### Row 5 — Footer Metrics
- Abandoned cart value + count (Shopify)
- New vs Returning customers (Shopify)
- Meta campaign table — name, spend, impressions, ROAS (Meta Ads)

---

## 12. Architecture Decision — Connector Strategy

**Chosen approach:** Each platform = separate connector with its own credentials, sync schedule, error handling, and health status. Not a monolithic integration.

```
┌─────────────────────────────────────────────────────┐
│                  SHAYN MIS Backend                   │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Shopify    │  │  Meta Ads    │  │  iThink   │ │
│  │  Connector   │  │  Connector   │  │ Connector │ │
│  │  15min+WH    │  │   6hr poll   │  │ 30min poll│ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                │        │
│         └─────────────────┴────────────────┘        │
│                           │                         │
│                ┌──────────▼──────────┐              │
│                │    PostgreSQL DB     │              │
│                │  (central storage)  │              │
│                └──────────┬──────────┘              │
│                           │                         │
│                ┌──────────▼──────────┐              │
│                │   REST API Layer    │              │
│                │  (Node.js/Express)  │              │
│                └──────────┬──────────┘              │
└───────────────────────────┼─────────────────────────┘
                            │
              ┌─────────────▼────────────┐
              │   React Single-Page      │
              │   Dashboard (Frontend)   │
              └──────────────────────────┘
```

**Why this approach:**
- Each connector fails independently — one platform going down doesn't affect others
- Credentials are isolated — Shopify token not near Meta credentials
- Easy to add new connectors (Unicommerce, GA4) without touching existing code
- Each connector has its own retry logic, rate limit handling, error logging

---

## 13. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React + Recharts + Tailwind CSS | Component-based UI, flexible charting, utility CSS |
| Backend | Node.js + Express | Same language as frontend, large ecosystem, async-friendly |
| Database | PostgreSQL | Relational, great for time-series aggregations, mature |
| Job Queue | node-cron or Bull | Scheduled polling jobs |
| Hosting | DigitalOcean | Simple, affordable, direct control |
| Process Manager | PM2 | Keep Node.js processes alive |

### DigitalOcean Setup
- **Droplet 1:** Backend (Node.js + Express + Bull jobs) + PostgreSQL (same machine for V1)
- **Droplet 2:** Frontend (React build served via Nginx)
- **Domain:** Internal access only for V1 (no public URL needed)

---

## 14. Database Schema

```sql
-- SHOPIFY

CREATE TABLE shopify_orders (
  order_id           TEXT PRIMARY KEY,
  order_name         TEXT,
  created_at         TIMESTAMPTZ,
  channel            TEXT,
  revenue            NUMERIC(12,2),
  payment_mode       TEXT,           -- 'COD' | 'Prepaid'
  financial_status   TEXT,
  fulfillment_status TEXT,
  customer_id        TEXT,
  customer_email     TEXT,
  customer_city      TEXT,
  customer_state     TEXT,
  discount_code      TEXT,
  synced_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shopify_order_lineitems (
  id           SERIAL PRIMARY KEY,
  order_id     TEXT REFERENCES shopify_orders(order_id),
  sku          TEXT,
  product_id   TEXT,
  title        TEXT,
  variant      TEXT,
  quantity     INTEGER,
  unit_price   NUMERIC(10,2)
);

CREATE TABLE shopify_customers (
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

CREATE TABLE shopify_abandoned_checkouts (
  checkout_id    TEXT PRIMARY KEY,
  created_at     TIMESTAMPTZ,
  cart_value     NUMERIC(12,2),
  email          TEXT,
  recovered      BOOLEAN DEFAULT FALSE,
  stage          TEXT,
  synced_at      TIMESTAMPTZ DEFAULT NOW()
);

-- META ADS

CREATE TABLE meta_daily_insights (
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

-- ITHINK LOGISTICS

CREATE TABLE ithink_shipments (
  awb                  TEXT PRIMARY KEY,
  order_id             TEXT,
  order_date           DATE,
  courier              TEXT,
  zone                 TEXT,
  payment_mode         TEXT,           -- 'COD' | 'Prepaid'
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

CREATE TABLE ithink_remittance (
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

-- CONNECTOR HEALTH

CREATE TABLE connector_health (
  id              SERIAL PRIMARY KEY,
  connector_name  TEXT UNIQUE,    -- 'shopify' | 'meta_ads' | 'ithink'
  last_sync_at    TIMESTAMPTZ,
  status          TEXT,           -- 'green' | 'amber' | 'red'
  error_message   TEXT,
  records_synced  INTEGER,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR DASHBOARD QUERIES

CREATE INDEX idx_orders_created_at ON shopify_orders(created_at);
CREATE INDEX idx_orders_payment_mode ON shopify_orders(payment_mode);
CREATE INDEX idx_meta_insights_date ON meta_daily_insights(date);
CREATE INDEX idx_meta_insights_campaign ON meta_daily_insights(campaign_id);
CREATE INDEX idx_ithink_status ON ithink_shipments(current_status_code);
CREATE INDEX idx_ithink_order_date ON ithink_shipments(order_date);
```

---

## 15. Historical Backfill Plan

Run once before launch. All data lands in PostgreSQL, then live sync takes over.

| Step | Source | Method | Est. Time |
|---|---|---|---|
| 1 | Shopify orders (12 months) | `bulkOperationRunQuery` | 15–20 min |
| 2 | Shopify customers | `bulkOperationRunQuery` | 5 min |
| 3 | Meta Ads (12 months, daily) | Async insights job | 5 min |
| 4 | iThink shipments (12 months) | Month-by-month loop (12 calls) | 5 min |
| 5 | iThink remittance (12 months) | Day-by-day loop (365 calls) | 10 min |

**Total estimated time: 35–45 minutes**

**Pre-requisite before running backfill:**
- [ ] `read_all_orders` scope approved by Shopify
- [ ] Meta User Token valid and `ads_read` permission confirmed
- [ ] iThink credentials tested with one live AWB

---

## 16. UI Design System

| Element | Spec |
|---|---|
| Font | Inter (all weights) |
| Primary accent | SHAYN Gold `#B8860B` |
| Background | Warm ivory `#FDFAF4` |
| Card background | White `#FFFFFF` |
| Card border | `#F0EBE0` |
| Positive delta | Sage green `#2D7D46` |
| Negative delta | Soft red `#9B2235` |
| Warning | Amber `#B45309` |
| Number format | ₹1.2L (not ₹1,20,000) |
| Date format | 17 Apr 2026 |
| Border radius | 12px cards, 8px buttons |
| Shadow | `0 1px 3px rgba(0,0,0,0.08)` |

---

## 17. V1 Scope Control

### ✅ In scope
- Single-page dashboard
- 6 KPI cards
- Revenue trend chart
- Meta Ads funnel chart
- Orders by platform (with placeholders)
- COD vs Prepaid split
- Logistics summary (delivered/RTO/NDR counts)
- Top 5 products table
- Meta campaigns table
- Abandoned cart summary tile
- Connector health indicator
- Date range filter (7D / 30D / This Month)

### ❌ Out of scope for V1
- Order management page
- Inventory module
- Customer detail pages
- Individual order tracking
- Review analytics
- Deep analytics / drill-downs
- Multi-user auth
- Role-based access control

---

## 18. Future Roadmap (Phase 2+)

| Feature | Dependency | Priority |
|---|---|---|
| Unicommerce connector (Amazon/Flipkart/Myntra) | Unicommerce API access | High |
| GA4 connector (sessions, funnel) | GA4 API setup + 14-month retention | High |
| GoKwik RTO risk scores | GoKwik API access | Medium |
| Google Ads connector | Account reactivation | Medium |
| Platform comparison (Shopify vs Marketplaces) | Unicommerce connector | High |
| Deep product analytics | V1 complete | Medium |
| Customer cohort analysis | V1 complete | Low |
| Inventory intelligence | V1 complete | Low |
| Auto-alerts (RTO spike, ROAS drop) | V1 complete | Medium |

---

## 19. Immediate Action Items (Pre-Build)

- [ ] Apply for Shopify `read_all_orders` scope via Partner Dashboard
- [ ] Set GA4 data retention to 14 months in GA4 Admin **TODAY** (irreversible)
- [ ] Test iThink credentials: make one call to `order/track.json` with a live AWB
- [ ] Test Meta User Token: call `act_{ID}/insights?date_preset=last_7d`
- [ ] Confirm whether GoKwik pushes risk score to Shopify order metafields
- [ ] Chase Unicommerce for API access

---

*Document maintained by: Development Team | Project: SHAYN MIS Platform*
