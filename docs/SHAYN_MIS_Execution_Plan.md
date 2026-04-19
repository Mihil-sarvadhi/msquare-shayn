# SHAYN MIS — V1 Execution Plan

> Status: Migrated to react-node-template structure (April 2026)

## Project Summary

Build a single-page MIS dashboard for SHAYN jewelry brand pulling real data from:
- **Shopify** (GraphQL Admin API v2026-01)
- **Meta Ads** (Marketing API v25.0)
- **iThink Logistics** (REST API v3.0.0)
- **Judge.me** (Reviews API v1)

**Stack:** Node.js + Express + Sequelize + PostgreSQL (backend) · React 19 + Vite + Tailwind + Recharts + Redux Toolkit (frontend)

---

## Environment Setup

### Backend `.env`

```env
# App
APP_ENV=local
PORT=4000
FRONTEND_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://shayn_user:password@localhost:5432/shayn_mis

# Auth
JWT_SECRET=your-jwt-secret-here

# Shopify
SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_API_VERSION=2026-01
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

# Meta Ads
META_USER_TOKEN=EAA...
META_AD_ACCOUNT_ID=act_1234567890
META_API_VERSION=v25.0

# iThink
ITHINK_ACCESS_TOKEN=your-access-token
ITHINK_SECRET_KEY=your-secret-key
ITHINK_BASE_URL=https://api.ithinklogistics.com

# Judge.me
JUDGEME_API_TOKEN=your-judgeme-token
JUDGEME_SHOP_DOMAIN=yourstore.myshopify.com
```

### Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

---

## Quick Start

```bash
# Root
npm run install:all
npm run db:migrate
npm run be:dev   # backend on :4000
npm run fe:dev   # frontend on :5000
```

---

## Database Migrations

Run via Sequelize CLI:
```bash
cd backend && npx sequelize-cli db:migrate
```

To undo all:
```bash
cd backend && npx sequelize-cli db:migrate:undo:all
```

---

## API Endpoints

All routes prefixed with `/api`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Connector health status |
| GET | `/dashboard/kpis` | KPI summary (revenue, orders, ROAS, RTO) |
| GET | `/dashboard/revenue-trend` | Daily revenue trend |
| GET | `/dashboard/meta-funnel` | Meta Ads funnel aggregate |
| GET | `/dashboard/campaigns` | Campaign-level breakdown |
| GET | `/dashboard/top-products` | Top 5 products by revenue |
| GET | `/dashboard/logistics` | Shipment status breakdown |
| GET | `/dashboard/abandoned-carts` | Abandoned checkout stats |
| GET | `/dashboard/reviews-summary` | Judge.me review summary |
| GET | `/dashboard/reviews-trend` | Review trend over time |
| GET | `/dashboard/top-rated-products` | Top rated products |
| GET | `/dashboard/recent-reviews` | 10 most recent reviews |
| GET | `/dashboard/all-reviews` | Paginated reviews with filters |
| POST | `/sync/shopify` | Trigger Shopify sync |
| POST | `/sync/meta` | Trigger Meta sync |
| POST | `/sync/ithink` | Trigger iThink sync |
| POST | `/sync/judgeme` | Trigger Judge.me sync |
| POST | `/webhooks/shopify/orders/create` | Shopify order webhook |
| POST | `/webhooks/shopify/orders/updated` | Shopify order update webhook |

Query params: `?range=7d|30d|mtd` (default: 30d)

---

## Cron Schedule

| Connector | Schedule | Description |
|-----------|----------|-------------|
| Shopify | Every 15 min | Orders + abandoned checkouts |
| Meta Ads | Every 6 hours | Campaign insights |
| iThink | Every 30 min | Shipment tracking |
| iThink Remittance | Daily 11pm | COD remittance |
| Judge.me | Daily 2am | Reviews + products |
