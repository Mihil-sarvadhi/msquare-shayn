# Shopify Phase 2 — Slice 1A (Finance Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend sync, storage, and REST API for Shopify Finance data: refunds, transactions, payouts, balance transactions, and locations. Backfills from 2023-01-01 to today; incremental sync joins existing 15-min cron tick. Exposes `/api/finance/*` endpoints powering dashboard KPIs and a dedicated finance page (frontend in Plan 1B).

**Architecture:** Source-agnostic table design (every table has `source`, `source_<entity>_id`, `source_metadata`). Each resource gets a fetch method on the Shopify connector, a mapper to the unified row shape, a repository, and a `ResourceHandler` registered with the Slice 0 orchestrator. The Finance service composes KPI aggregations across these tables. Bulk Operations API used for high-volume backfills (orders/refunds/transactions); paginated GraphQL for low-volume (locations/payouts/balance_transactions).

**Tech Stack:** Node.js 18+, Express, TypeScript 5.7, Sequelize 6, PostgreSQL, axios (existing in Shopify connector), Winston, Zod.

**Spec reference:** `docs/superpowers/specs/2026-04-26-shopify-phase2-expansion-design.md` Sections 4 (sync), 5.1 (data model), 6.2 (endpoints).

**Prerequisite:** Slice 0 (foundation) plan complete and merged. The orchestrator registry, `sync_cursors` table, and `SOURCE` constant must already exist.

---

## File Structure

**Migrations (create):**
- `backend/src/db/migrations/20260426000010-create-locations.js`
- `backend/src/db/migrations/20260426000011-create-orders-refunds.js`
- `backend/src/db/migrations/20260426000012-create-orders-transactions.js`
- `backend/src/db/migrations/20260426000013-create-payouts.js`
- `backend/src/db/migrations/20260426000014-create-balance-transactions.js`

**Models (create):**
- `backend/src/db/models/Location.ts`
- `backend/src/db/models/OrderRefund.ts`
- `backend/src/db/models/OrderTransaction.ts`
- `backend/src/db/models/Payout.ts`
- `backend/src/db/models/BalanceTransaction.ts`

**Modify:**
- `backend/src/db/models/index.ts` — barrel-export new models
- `backend/src/modules/shopify/shopify.connector.ts` — add fetch methods
- `backend/src/modules/jobs/scheduler.ts` — add Slice 1 resources to cron tick
- `backend/src/routes/index.ts` — mount finance routes

**Finance module (create):**
- `backend/src/modules/finance/finance.types.ts`
- `backend/src/modules/finance/finance.mapper.ts`
- `backend/src/modules/finance/locations.repository.ts`
- `backend/src/modules/finance/refunds.repository.ts`
- `backend/src/modules/finance/transactions.repository.ts`
- `backend/src/modules/finance/payouts.repository.ts`
- `backend/src/modules/finance/balance-transactions.repository.ts`
- `backend/src/modules/finance/finance.service.ts`
- `backend/src/modules/finance/finance.controller.ts`
- `backend/src/modules/finance/finance.routes.ts`
- `backend/src/modules/finance/finance.handlers.ts` — ResourceHandler implementations registered with orchestrator
- `backend/src/modules/finance/index.ts` — bootstrap that calls `registerResource()` for each handler

---

## Task 1: Create all 5 migrations

**Files:**
- Create: `backend/src/db/migrations/20260426000010-create-locations.js`
- Create: `backend/src/db/migrations/20260426000011-create-orders-refunds.js`
- Create: `backend/src/db/migrations/20260426000012-create-orders-transactions.js`
- Create: `backend/src/db/migrations/20260426000013-create-payouts.js`
- Create: `backend/src/db/migrations/20260426000014-create-balance-transactions.js`

> All 5 migrations follow the same pattern: composite unique index on `(source, source_<entity>_id)`, CHECK constraint on `source`, raw SQL via `queryInterface.sequelize.query`. JSONB for `source_metadata` and complex fields.

- [ ] **Step 1.1: Create locations migration**

`backend/src/db/migrations/20260426000010-create-locations.js`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_location_id TEXT NOT NULL,
        name TEXT,
        address JSONB,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        fulfills_online_orders BOOLEAN NOT NULL DEFAULT FALSE,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT locations_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT locations_source_unique UNIQUE (source, source_location_id)
      );

      CREATE INDEX IF NOT EXISTS idx_locations_source ON locations(source);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS locations;`);
  },
};
```

- [ ] **Step 1.2: Create orders_refunds migration**

`backend/src/db/migrations/20260426000011-create-orders-refunds.js`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS orders_refunds (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_refund_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        refund_amount NUMERIC(12,2) NOT NULL,
        refund_currency TEXT NOT NULL DEFAULT 'INR',
        reason TEXT,
        refunded_at TIMESTAMP WITH TIME ZONE,
        restocked BOOLEAN NOT NULL DEFAULT FALSE,
        refund_line_items JSONB,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT orders_refunds_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT orders_refunds_source_unique UNIQUE (source, source_refund_id)
      );

      CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON orders_refunds(order_id);
      CREATE INDEX IF NOT EXISTS idx_refunds_refunded_at ON orders_refunds(refunded_at);
      CREATE INDEX IF NOT EXISTS idx_refunds_source ON orders_refunds(source);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS orders_refunds;`);
  },
};
```

- [ ] **Step 1.3: Create orders_transactions migration**

`backend/src/db/migrations/20260426000012-create-orders-transactions.js`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS orders_transactions (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_transaction_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL,
        gateway TEXT,
        amount NUMERIC(12,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        payment_method TEXT,
        processed_at TIMESTAMP WITH TIME ZONE,
        parent_transaction_id TEXT,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT orders_transactions_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT orders_transactions_kind_check
          CHECK (kind IN ('sale','authorization','capture','refund','void')),
        CONSTRAINT orders_transactions_status_check
          CHECK (status IN ('success','pending','failure','error')),
        CONSTRAINT orders_transactions_source_unique UNIQUE (source, source_transaction_id)
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON orders_transactions(order_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_processed_at ON orders_transactions(processed_at);
      CREATE INDEX IF NOT EXISTS idx_transactions_gateway ON orders_transactions(gateway);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS orders_transactions;`);
  },
};
```

- [ ] **Step 1.4: Create payouts migration**

`backend/src/db/migrations/20260426000013-create-payouts.js`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS payouts (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_payout_id TEXT NOT NULL,
        payout_date DATE,
        status TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        bank_summary JSONB,
        charges_gross NUMERIC(12,2),
        refunds_gross NUMERIC(12,2),
        adjustments_gross NUMERIC(12,2),
        fees_total NUMERIC(12,2),
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT payouts_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT payouts_status_check
          CHECK (status IN ('scheduled','in_transit','paid','failed','cancelled')),
        CONSTRAINT payouts_source_unique UNIQUE (source, source_payout_id)
      );

      CREATE INDEX IF NOT EXISTS idx_payouts_payout_date ON payouts(payout_date);
      CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS payouts;`);
  },
};
```

- [ ] **Step 1.5: Create balance_transactions migration**

`backend/src/db/migrations/20260426000014-create-balance-transactions.js`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS balance_transactions (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        source_balance_transaction_id TEXT NOT NULL,
        payout_id BIGINT REFERENCES payouts(id) ON DELETE SET NULL,
        source_payout_id TEXT,
        transaction_id TEXT,
        type TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        fee NUMERIC(12,2),
        net NUMERIC(12,2),
        processed_at TIMESTAMP WITH TIME ZONE,
        source_metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT balance_tx_source_check
          CHECK (source IN ('shopify','myntra','amazon','flipkart','unicommerce')),
        CONSTRAINT balance_tx_type_check
          CHECK (type IN ('charge','refund','adjustment','fee','dispute','reserve')),
        CONSTRAINT balance_tx_source_unique UNIQUE (source, source_balance_transaction_id)
      );

      CREATE INDEX IF NOT EXISTS idx_balance_tx_payout_id ON balance_transactions(payout_id);
      CREATE INDEX IF NOT EXISTS idx_balance_tx_source_payout_id ON balance_transactions(source_payout_id);
      CREATE INDEX IF NOT EXISTS idx_balance_tx_processed_at ON balance_transactions(processed_at);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS balance_transactions;`);
  },
};
```

- [ ] **Step 1.6: Run migrations**

Run: `cd backend && npm run db:migrate`
Expected: 5 lines `== 20260426000010..14: migrated`. No errors.

- [ ] **Step 1.7: Verify tables exist**

Run: `psql $DATABASE_URL -c "\dt locations orders_refunds orders_transactions payouts balance_transactions"`
Expected: all 5 tables listed.

- [ ] **Step 1.8: Commit**

```bash
git add backend/src/db/migrations/20260426000010-create-locations.js \
        backend/src/db/migrations/20260426000011-create-orders-refunds.js \
        backend/src/db/migrations/20260426000012-create-orders-transactions.js \
        backend/src/db/migrations/20260426000013-create-payouts.js \
        backend/src/db/migrations/20260426000014-create-balance-transactions.js
git commit -m "feat(db): add Phase 2 finance tables (locations, refunds, transactions, payouts, balance_transactions)"
```

---

## Task 2: Create all 5 Sequelize models

**Files:**
- Create: `backend/src/db/models/Location.ts`
- Create: `backend/src/db/models/OrderRefund.ts`
- Create: `backend/src/db/models/OrderTransaction.ts`
- Create: `backend/src/db/models/Payout.ts`
- Create: `backend/src/db/models/BalanceTransaction.ts`
- Modify: `backend/src/db/models/index.ts`

> Pattern: each model mirrors its migration columns; `source` typed as `SourceType` from constant; JSONB columns use `unknown` or specific shape types; `init()` uses `tableName` matching migration; `timestamps: true, underscored: true`.

- [ ] **Step 2.1: Create Location model**

`backend/src/db/models/Location.ts`:

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

interface LocationAttributes {
  id?: number;
  source: SourceType;
  source_location_id: string;
  name: string | null;
  address: Record<string, unknown> | null;
  active: boolean;
  fulfills_online_orders: boolean;
  source_metadata: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type LocationCreationAttributes = Optional<
  LocationAttributes,
  'id' | 'name' | 'address' | 'source_metadata' | 'created_at' | 'updated_at' | 'synced_at'
>;

export class Location
  extends Model<LocationAttributes, LocationCreationAttributes>
  implements LocationAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_location_id: string;
  declare name: string | null;
  declare address: Record<string, unknown> | null;
  declare active: boolean;
  declare fulfills_online_orders: boolean;
  declare source_metadata: Record<string, unknown> | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare readonly synced_at: Date;
}

Location.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_location_id: { type: DataTypes.TEXT, allowNull: false },
    name: { type: DataTypes.TEXT, allowNull: true },
    address: { type: DataTypes.JSONB, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    fulfills_online_orders: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Location',
    tableName: 'locations',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
```

- [ ] **Step 2.2: Create OrderRefund model**

`backend/src/db/models/OrderRefund.ts`:

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export interface RefundLineItem {
  sku: string;
  quantity: number;
  amount: number;
  restock_type?: string;
}

interface OrderRefundAttributes {
  id?: number;
  source: SourceType;
  source_refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_currency: string;
  reason: string | null;
  refunded_at: Date | null;
  restocked: boolean;
  refund_line_items: RefundLineItem[] | null;
  source_metadata: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type OrderRefundCreationAttributes = Optional<
  OrderRefundAttributes,
  'id' | 'reason' | 'refunded_at' | 'refund_line_items' | 'source_metadata' | 'created_at' | 'updated_at' | 'synced_at'
>;

export class OrderRefund
  extends Model<OrderRefundAttributes, OrderRefundCreationAttributes>
  implements OrderRefundAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_refund_id: string;
  declare order_id: string;
  declare refund_amount: number;
  declare refund_currency: string;
  declare reason: string | null;
  declare refunded_at: Date | null;
  declare restocked: boolean;
  declare refund_line_items: RefundLineItem[] | null;
  declare source_metadata: Record<string, unknown> | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare readonly synced_at: Date;
}

OrderRefund.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_refund_id: { type: DataTypes.TEXT, allowNull: false },
    order_id: { type: DataTypes.TEXT, allowNull: false },
    refund_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    refund_currency: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'INR' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    refunded_at: { type: DataTypes.DATE, allowNull: true },
    restocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    refund_line_items: { type: DataTypes.JSONB, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'OrderRefund',
    tableName: 'orders_refunds',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
```

- [ ] **Step 2.3: Create OrderTransaction model**

`backend/src/db/models/OrderTransaction.ts`:

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type TransactionKind = 'sale' | 'authorization' | 'capture' | 'refund' | 'void';
export type TransactionStatus = 'success' | 'pending' | 'failure' | 'error';

interface OrderTransactionAttributes {
  id?: number;
  source: SourceType;
  source_transaction_id: string;
  order_id: string;
  kind: TransactionKind;
  status: TransactionStatus;
  gateway: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  processed_at: Date | null;
  parent_transaction_id: string | null;
  source_metadata: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type OrderTransactionCreationAttributes = Optional<
  OrderTransactionAttributes,
  'id' | 'gateway' | 'payment_method' | 'processed_at' | 'parent_transaction_id'
  | 'source_metadata' | 'created_at' | 'updated_at' | 'synced_at'
>;

export class OrderTransaction
  extends Model<OrderTransactionAttributes, OrderTransactionCreationAttributes>
  implements OrderTransactionAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_transaction_id: string;
  declare order_id: string;
  declare kind: TransactionKind;
  declare status: TransactionStatus;
  declare gateway: string | null;
  declare amount: number;
  declare currency: string;
  declare payment_method: string | null;
  declare processed_at: Date | null;
  declare parent_transaction_id: string | null;
  declare source_metadata: Record<string, unknown> | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare readonly synced_at: Date;
}

OrderTransaction.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_transaction_id: { type: DataTypes.TEXT, allowNull: false },
    order_id: { type: DataTypes.TEXT, allowNull: false },
    kind: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.TEXT, allowNull: false },
    gateway: { type: DataTypes.TEXT, allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'INR' },
    payment_method: { type: DataTypes.TEXT, allowNull: true },
    processed_at: { type: DataTypes.DATE, allowNull: true },
    parent_transaction_id: { type: DataTypes.TEXT, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'OrderTransaction',
    tableName: 'orders_transactions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
```

- [ ] **Step 2.4: Create Payout model**

`backend/src/db/models/Payout.ts`:

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type PayoutStatus = 'scheduled' | 'in_transit' | 'paid' | 'failed' | 'cancelled';

interface PayoutAttributes {
  id?: number;
  source: SourceType;
  source_payout_id: string;
  payout_date: Date | null;
  status: PayoutStatus;
  amount: number;
  currency: string;
  bank_summary: Record<string, unknown> | null;
  charges_gross: number | null;
  refunds_gross: number | null;
  adjustments_gross: number | null;
  fees_total: number | null;
  source_metadata: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type PayoutCreationAttributes = Optional<
  PayoutAttributes,
  'id' | 'payout_date' | 'bank_summary' | 'charges_gross' | 'refunds_gross'
  | 'adjustments_gross' | 'fees_total' | 'source_metadata'
  | 'created_at' | 'updated_at' | 'synced_at'
>;

export class Payout
  extends Model<PayoutAttributes, PayoutCreationAttributes>
  implements PayoutAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_payout_id: string;
  declare payout_date: Date | null;
  declare status: PayoutStatus;
  declare amount: number;
  declare currency: string;
  declare bank_summary: Record<string, unknown> | null;
  declare charges_gross: number | null;
  declare refunds_gross: number | null;
  declare adjustments_gross: number | null;
  declare fees_total: number | null;
  declare source_metadata: Record<string, unknown> | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare readonly synced_at: Date;
}

Payout.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_payout_id: { type: DataTypes.TEXT, allowNull: false },
    payout_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.TEXT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'INR' },
    bank_summary: { type: DataTypes.JSONB, allowNull: true },
    charges_gross: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    refunds_gross: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    adjustments_gross: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    fees_total: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Payout',
    tableName: 'payouts',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
```

- [ ] **Step 2.5: Create BalanceTransaction model**

`backend/src/db/models/BalanceTransaction.ts`:

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import type { SourceType } from '../../constant/source.constant';

export type BalanceTransactionType = 'charge' | 'refund' | 'adjustment' | 'fee' | 'dispute' | 'reserve';

interface BalanceTransactionAttributes {
  id?: number;
  source: SourceType;
  source_balance_transaction_id: string;
  payout_id: number | null;
  source_payout_id: string | null;
  transaction_id: string | null;
  type: BalanceTransactionType;
  amount: number;
  fee: number | null;
  net: number | null;
  processed_at: Date | null;
  source_metadata: Record<string, unknown> | null;
  created_at?: Date;
  updated_at?: Date;
  synced_at?: Date;
}

type BalanceTransactionCreationAttributes = Optional<
  BalanceTransactionAttributes,
  'id' | 'payout_id' | 'source_payout_id' | 'transaction_id' | 'fee' | 'net'
  | 'processed_at' | 'source_metadata' | 'created_at' | 'updated_at' | 'synced_at'
>;

export class BalanceTransaction
  extends Model<BalanceTransactionAttributes, BalanceTransactionCreationAttributes>
  implements BalanceTransactionAttributes
{
  declare id: number;
  declare source: SourceType;
  declare source_balance_transaction_id: string;
  declare payout_id: number | null;
  declare source_payout_id: string | null;
  declare transaction_id: string | null;
  declare type: BalanceTransactionType;
  declare amount: number;
  declare fee: number | null;
  declare net: number | null;
  declare processed_at: Date | null;
  declare source_metadata: Record<string, unknown> | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare readonly synced_at: Date;
}

BalanceTransaction.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    source: { type: DataTypes.TEXT, allowNull: false },
    source_balance_transaction_id: { type: DataTypes.TEXT, allowNull: false },
    payout_id: { type: DataTypes.BIGINT, allowNull: true },
    source_payout_id: { type: DataTypes.TEXT, allowNull: true },
    transaction_id: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.TEXT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    fee: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    net: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    processed_at: { type: DataTypes.DATE, allowNull: true },
    source_metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    synced_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'BalanceTransaction',
    tableName: 'balance_transactions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
```

- [ ] **Step 2.6: Update models barrel**

Open `backend/src/db/models/index.ts` and append:

```typescript
export { Location } from './Location';
export { OrderRefund } from './OrderRefund';
export type { RefundLineItem } from './OrderRefund';
export { OrderTransaction } from './OrderTransaction';
export type { TransactionKind, TransactionStatus } from './OrderTransaction';
export { Payout } from './Payout';
export type { PayoutStatus } from './Payout';
export { BalanceTransaction } from './BalanceTransaction';
export type { BalanceTransactionType } from './BalanceTransaction';
```

- [ ] **Step 2.7: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [ ] **Step 2.8: Commit**

```bash
git add backend/src/db/models/Location.ts \
        backend/src/db/models/OrderRefund.ts \
        backend/src/db/models/OrderTransaction.ts \
        backend/src/db/models/Payout.ts \
        backend/src/db/models/BalanceTransaction.ts \
        backend/src/db/models/index.ts
git commit -m "feat(db): add Sequelize models for Phase 2 finance tables"
```

---

## Task 3: Shopify connector — fetch methods for Finance resources

**Files:**
- Modify: `backend/src/modules/shopify/shopify.connector.ts`

> Add 5 new fetch methods. Reuse the existing `graphqlRequest` helper. For high-volume historical data (refunds, transactions), provide a bulk-operation backfill function that submits a bulk query, polls for completion, downloads the JSONL, and yields parsed rows. For low-volume (payouts, balance_transactions, locations), use simple paginated GraphQL.

> Before writing code, read `backend/src/modules/shopify/shopify.connector.ts` to confirm the exact name of the existing `graphqlRequest` helper (it may be named differently, e.g., `shopifyGraphQL`). Use the existing name.

- [ ] **Step 3.1: Add Locations fetch (snapshot)**

In `backend/src/modules/shopify/shopify.connector.ts`, append:

```typescript
const LOCATIONS_QUERY = /* GraphQL */ `
  query Locations($cursor: String) {
    locations(first: 50, after: $cursor) {
      edges {
        cursor
        node {
          id
          name
          isActive
          fulfillsOnlineOrders
          address {
            address1
            address2
            city
            province
            country
            zip
            phone
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export interface ShopifyLocation {
  id: string;
  name: string;
  isActive: boolean;
  fulfillsOnlineOrders: boolean;
  address: Record<string, string | null>;
}

export async function fetchLocations(): Promise<ShopifyLocation[]> {
  const all: ShopifyLocation[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const data = await graphqlRequest<{ locations: { edges: { node: ShopifyLocation }[]; pageInfo: { hasNextPage: boolean; endCursor: string } } }>(
      LOCATIONS_QUERY,
      { cursor },
    );
    all.push(...data.locations.edges.map((e) => e.node));
    hasNextPage = data.locations.pageInfo.hasNextPage;
    cursor = data.locations.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}
```

- [ ] **Step 3.2: Add Payouts fetch (paginated)**

Append to `shopify.connector.ts`:

```typescript
const PAYOUTS_QUERY = /* GraphQL */ `
  query Payouts($cursor: String) {
    shopifyPaymentsAccount {
      payouts(first: 50, after: $cursor) {
        edges {
          cursor
          node {
            id
            issuedAt
            status
            net { amount currencyCode }
            summary {
              chargesGross { amount }
              refundsGross { amount }
              adjustmentsGross { amount }
              chargesFee { amount }
              refundsFee { amount }
              adjustmentsFee { amount }
            }
            bankAccount { accountNumberLastDigits bankName routingNumber }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export interface ShopifyPayout {
  id: string;
  issuedAt: string;
  status: string;
  net: { amount: string; currencyCode: string };
  summary: {
    chargesGross: { amount: string };
    refundsGross: { amount: string };
    adjustmentsGross: { amount: string };
    chargesFee: { amount: string };
    refundsFee: { amount: string };
    adjustmentsFee: { amount: string };
  };
  bankAccount: { accountNumberLastDigits: string | null; bankName: string | null; routingNumber: string | null } | null;
}

export async function fetchPayouts(sinceDate: Date | null): Promise<ShopifyPayout[]> {
  const all: ShopifyPayout[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const data = await graphqlRequest<{ shopifyPaymentsAccount: { payouts: { edges: { node: ShopifyPayout }[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } | null }>(
      PAYOUTS_QUERY,
      { cursor },
    );
    if (!data.shopifyPaymentsAccount) break; // store not on Shopify Payments
    const nodes = data.shopifyPaymentsAccount.payouts.edges.map((e) => e.node);
    if (sinceDate) {
      const filtered = nodes.filter((p) => new Date(p.issuedAt) >= sinceDate);
      all.push(...filtered);
      // If a node is older than sinceDate, stop paginating (results are date-desc)
      if (filtered.length < nodes.length) break;
    } else {
      all.push(...nodes);
    }
    hasNextPage = data.shopifyPaymentsAccount.payouts.pageInfo.hasNextPage;
    cursor = data.shopifyPaymentsAccount.payouts.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}
```

- [ ] **Step 3.3: Add Balance Transactions fetch (paginated)**

Append to `shopify.connector.ts`:

```typescript
const BALANCE_TRANSACTIONS_QUERY = /* GraphQL */ `
  query BalanceTransactions($cursor: String) {
    shopifyPaymentsAccount {
      balanceTransactions(first: 100, after: $cursor) {
        edges {
          cursor
          node {
            id
            type
            test
            transactionDate
            amount { amount }
            fee { amount }
            net { amount }
            associatedPayout { id }
            associatedOrder { id }
            sourceId
            sourceType
            sourceOrderTransactionId
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export interface ShopifyBalanceTransaction {
  id: string;
  type: string;
  test: boolean;
  transactionDate: string;
  amount: { amount: string };
  fee: { amount: string };
  net: { amount: string };
  associatedPayout: { id: string } | null;
  associatedOrder: { id: string } | null;
  sourceId: string | null;
  sourceType: string | null;
  sourceOrderTransactionId: string | null;
}

export async function fetchBalanceTransactions(sinceDate: Date | null): Promise<ShopifyBalanceTransaction[]> {
  const all: ShopifyBalanceTransaction[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const data = await graphqlRequest<{ shopifyPaymentsAccount: { balanceTransactions: { edges: { node: ShopifyBalanceTransaction }[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } | null }>(
      BALANCE_TRANSACTIONS_QUERY,
      { cursor },
    );
    if (!data.shopifyPaymentsAccount) break;
    const nodes = data.shopifyPaymentsAccount.balanceTransactions.edges.map((e) => e.node);
    if (sinceDate) {
      const filtered = nodes.filter((t) => new Date(t.transactionDate) >= sinceDate);
      all.push(...filtered);
      if (filtered.length < nodes.length) break;
    } else {
      all.push(...nodes);
    }
    hasNextPage = data.shopifyPaymentsAccount.balanceTransactions.pageInfo.hasNextPage;
    cursor = data.shopifyPaymentsAccount.balanceTransactions.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}
```

- [ ] **Step 3.4: Add Refunds fetch — bulk operation for backfill, delta for incremental**

Append to `shopify.connector.ts`:

```typescript
const REFUNDS_BULK_QUERY = /* GraphQL */ `
  {
    orders(query: "updated_at:>=2023-01-01") {
      edges {
        node {
          id
          refunds {
            id
            createdAt
            note
            totalRefundedSet { shopMoney { amount currencyCode } }
            refundLineItems(first: 50) {
              edges {
                node {
                  quantity
                  restockType
                  subtotalSet { shopMoney { amount } }
                  lineItem { sku }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const REFUNDS_DELTA_QUERY = /* GraphQL */ `
  query RefundsDelta($queryStr: String!, $cursor: String) {
    orders(first: 100, after: $cursor, query: $queryStr) {
      edges {
        cursor
        node {
          id
          refunds {
            id
            createdAt
            note
            totalRefundedSet { shopMoney { amount currencyCode } }
            refundLineItems(first: 50) {
              edges {
                node {
                  quantity
                  restockType
                  subtotalSet { shopMoney { amount } }
                  lineItem { sku }
                }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export interface ShopifyRefundLineItem {
  quantity: number;
  restockType: string | null;
  subtotalSet: { shopMoney: { amount: string } };
  lineItem: { sku: string | null } | null;
}

export interface ShopifyRefund {
  id: string;
  createdAt: string;
  note: string | null;
  totalRefundedSet: { shopMoney: { amount: string; currencyCode: string } };
  refundLineItems: { edges: { node: ShopifyRefundLineItem }[] };
}

export interface ShopifyOrderWithRefunds {
  id: string;
  refunds: ShopifyRefund[];
}

export async function fetchRefundsDelta(sinceDate: Date): Promise<ShopifyOrderWithRefunds[]> {
  const queryStr = `updated_at:>=${sinceDate.toISOString().slice(0, 10)} financial_status:partially_refunded,refunded`;
  const all: ShopifyOrderWithRefunds[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const data = await graphqlRequest<{ orders: { edges: { node: ShopifyOrderWithRefunds }[]; pageInfo: { hasNextPage: boolean; endCursor: string } } }>(
      REFUNDS_DELTA_QUERY,
      { queryStr, cursor },
    );
    all.push(...data.orders.edges.map((e) => e.node));
    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

// Bulk-op backfill: submit, poll, download. Reuse existing bulk-op helpers
// from backfill.ts if they exist; otherwise inline a minimal implementation.
// See backend/src/modules/shopify/shopify.backfill.ts for the existing pattern.
export async function fetchRefundsBulk(): Promise<{ url: string; opId: string }> {
  const submitQuery = /* GraphQL */ `
    mutation {
      bulkOperationRunQuery(
        query: """${REFUNDS_BULK_QUERY}"""
      ) {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `;
  const submitResp = await graphqlRequest<{ bulkOperationRunQuery: { bulkOperation: { id: string; status: string }; userErrors: { message: string }[] } }>(
    submitQuery,
  );
  if (submitResp.bulkOperationRunQuery.userErrors.length > 0) {
    throw new Error(`Bulk op submit failed: ${submitResp.bulkOperationRunQuery.userErrors.map((e) => e.message).join('; ')}`);
  }
  const opId = submitResp.bulkOperationRunQuery.bulkOperation.id;

  const pollQuery = /* GraphQL */ `
    query { currentBulkOperation { id status errorCode url } }
  `;
  let url: string | null = null;
  for (let i = 0; i < 360; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await graphqlRequest<{ currentBulkOperation: { id: string; status: string; errorCode: string | null; url: string | null } }>(pollQuery);
    if (poll.currentBulkOperation.status === 'COMPLETED') {
      url = poll.currentBulkOperation.url;
      break;
    }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(poll.currentBulkOperation.status)) {
      throw new Error(`Bulk op ${poll.currentBulkOperation.status}: ${poll.currentBulkOperation.errorCode}`);
    }
  }
  if (!url) throw new Error('Bulk op did not complete within 30 minutes');
  return { url, opId };
}
```

> If `backend/src/modules/shopify/shopify.backfill.ts` already exposes a generic `runBulkOperation(query)` helper, prefer using it instead of the inline implementation above. Read that file first.

- [ ] **Step 3.5: Add Transactions fetch — bulk + delta**

Append to `shopify.connector.ts`:

```typescript
const TRANSACTIONS_BULK_QUERY = /* GraphQL */ `
  {
    orders(query: "updated_at:>=2023-01-01") {
      edges {
        node {
          id
          transactions {
            id
            kind
            status
            gateway
            paymentDetails {
              ... on CardPaymentDetails { paymentMethodName }
            }
            amountSet { shopMoney { amount currencyCode } }
            processedAt
            parentTransaction { id }
          }
        }
      }
    }
  }
`;

const TRANSACTIONS_DELTA_QUERY = /* GraphQL */ `
  query TxDelta($queryStr: String!, $cursor: String) {
    orders(first: 100, after: $cursor, query: $queryStr) {
      edges {
        cursor
        node {
          id
          transactions {
            id
            kind
            status
            gateway
            amountSet { shopMoney { amount currencyCode } }
            processedAt
            parentTransaction { id }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export interface ShopifyTransaction {
  id: string;
  kind: string;
  status: string;
  gateway: string | null;
  amountSet: { shopMoney: { amount: string; currencyCode: string } };
  processedAt: string | null;
  parentTransaction: { id: string } | null;
  paymentDetails?: { paymentMethodName?: string } | null;
}

export interface ShopifyOrderWithTransactions {
  id: string;
  transactions: ShopifyTransaction[];
}

export async function fetchTransactionsDelta(sinceDate: Date): Promise<ShopifyOrderWithTransactions[]> {
  const queryStr = `updated_at:>=${sinceDate.toISOString().slice(0, 10)}`;
  const all: ShopifyOrderWithTransactions[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const data = await graphqlRequest<{ orders: { edges: { node: ShopifyOrderWithTransactions }[]; pageInfo: { hasNextPage: boolean; endCursor: string } } }>(
      TRANSACTIONS_DELTA_QUERY,
      { queryStr, cursor },
    );
    all.push(...data.orders.edges.map((e) => e.node));
    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

export async function fetchTransactionsBulk(): Promise<{ url: string; opId: string }> {
  const submitQuery = /* GraphQL */ `
    mutation {
      bulkOperationRunQuery(
        query: """${TRANSACTIONS_BULK_QUERY}"""
      ) {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `;
  const submitResp = await graphqlRequest<{ bulkOperationRunQuery: { bulkOperation: { id: string; status: string }; userErrors: { message: string }[] } }>(
    submitQuery,
  );
  if (submitResp.bulkOperationRunQuery.userErrors.length > 0) {
    throw new Error(`Bulk op submit failed: ${submitResp.bulkOperationRunQuery.userErrors.map((e) => e.message).join('; ')}`);
  }
  const opId = submitResp.bulkOperationRunQuery.bulkOperation.id;

  const pollQuery = /* GraphQL */ `
    query { currentBulkOperation { id status errorCode url } }
  `;
  let url: string | null = null;
  for (let i = 0; i < 360; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await graphqlRequest<{ currentBulkOperation: { id: string; status: string; errorCode: string | null; url: string | null } }>(pollQuery);
    if (poll.currentBulkOperation.status === 'COMPLETED') {
      url = poll.currentBulkOperation.url;
      break;
    }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(poll.currentBulkOperation.status)) {
      throw new Error(`Bulk op ${poll.currentBulkOperation.status}: ${poll.currentBulkOperation.errorCode}`);
    }
  }
  if (!url) throw new Error('Bulk op did not complete within 30 minutes');
  return { url, opId };
}
```

> Note: only one bulk operation can run per shop at a time. If you trigger refunds backfill and transactions backfill in the same `runBackfillAll` call, the second one will fail with `OPERATION_IN_PROGRESS`. The orchestrator runs handlers sequentially (per Slice 0 service code: `for (const handler of handlers)`), so this is fine — but each bulk op can take 30+ minutes.

- [ ] **Step 3.6: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [ ] **Step 3.7: Commit**

```bash
git add backend/src/modules/shopify/shopify.connector.ts
git commit -m "feat(shopify): add fetch methods for locations, payouts, balance txns, refunds, transactions"
```

---

## Task 4: Create finance module — types and mappers

**Files:**
- Create: `backend/src/modules/finance/finance.types.ts`
- Create: `backend/src/modules/finance/finance.mapper.ts`

- [ ] **Step 4.1: Create finance.types.ts**

`backend/src/modules/finance/finance.types.ts`:

```typescript
export interface FinanceKpis {
  gross_revenue: number;
  total_discounts: number;
  total_tax: number;
  total_shipping: number;
  total_refunds: number;
  net_revenue: number;
  payouts_received: number;
  shopify_fees: number;
  fees_pct: number;
  refund_rate: number;
  refund_count: number;
  order_count: number;
}

export interface RevenueBreakdownPoint {
  date: string; // ISO date
  gross: number;
  discounts: number;
  refunds: number;
  tax: number;
  net: number;
}

export interface PaymentMethodSplit {
  cod: { count: number; amount: number };
  prepaid: { count: number; amount: number };
  breakdown_by_gateway: { gateway: string; count: number; amount: number }[];
}

export interface RefundsSummary {
  refund_rate_over_time: { date: string; rate: number }[];
  top_reasons: { reason: string; count: number; amount: number }[];
  refunds_by_sku: { sku: string; count: number; amount: number }[];
}

export interface PayoutDetail {
  payout: {
    id: number;
    source_payout_id: string;
    payout_date: string | null;
    status: string;
    amount: number;
    currency: string;
    bank_summary: Record<string, unknown> | null;
    charges_gross: number | null;
    refunds_gross: number | null;
    adjustments_gross: number | null;
    fees_total: number | null;
  };
  balance_transactions: {
    id: number;
    type: string;
    amount: number;
    fee: number | null;
    net: number | null;
    processed_at: string | null;
    transaction_id: string | null;
  }[];
}

export type GroupBy = 'day' | 'week' | 'month';
```

- [ ] **Step 4.2: Create finance.mapper.ts**

`backend/src/modules/finance/finance.mapper.ts`:

```typescript
import { SOURCE } from '@constant';
import type {
  ShopifyLocation,
  ShopifyPayout,
  ShopifyBalanceTransaction,
  ShopifyOrderWithRefunds,
  ShopifyOrderWithTransactions,
} from '@modules/shopify/shopify.connector';

const SHOPIFY_PAYOUT_STATUS: Record<string, 'scheduled' | 'in_transit' | 'paid' | 'failed' | 'cancelled'> = {
  SCHEDULED: 'scheduled',
  IN_TRANSIT: 'in_transit',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELED: 'cancelled',
};

const SHOPIFY_BALANCE_TYPE: Record<string, 'charge' | 'refund' | 'adjustment' | 'fee' | 'dispute' | 'reserve'> = {
  CHARGE: 'charge',
  REFUND: 'refund',
  ADJUSTMENT: 'adjustment',
  FEE: 'fee',
  DISPUTE: 'dispute',
  RESERVE: 'reserve',
};

const SHOPIFY_TX_KIND: Record<string, 'sale' | 'authorization' | 'capture' | 'refund' | 'void'> = {
  SALE: 'sale',
  AUTHORIZATION: 'authorization',
  CAPTURE: 'capture',
  REFUND: 'refund',
  VOID: 'void',
};

const SHOPIFY_TX_STATUS: Record<string, 'success' | 'pending' | 'failure' | 'error'> = {
  SUCCESS: 'success',
  PENDING: 'pending',
  FAILURE: 'failure',
  ERROR: 'error',
};

function gid(id: string): string {
  // Shopify uses gid://shopify/<Type>/<numeric>; we keep the full GID for traceability,
  // but consumers may prefer the numeric portion. For now, keep the full GID.
  return id;
}

export function mapLocation(loc: ShopifyLocation) {
  return {
    source: SOURCE.SHOPIFY,
    source_location_id: gid(loc.id),
    name: loc.name,
    address: loc.address,
    active: loc.isActive,
    fulfills_online_orders: loc.fulfillsOnlineOrders,
    source_metadata: null,
    synced_at: new Date(),
  };
}

export function mapPayout(p: ShopifyPayout) {
  const chargesFee = parseFloat(p.summary.chargesFee.amount);
  const refundsFee = parseFloat(p.summary.refundsFee.amount);
  const adjustmentsFee = parseFloat(p.summary.adjustmentsFee.amount);
  return {
    source: SOURCE.SHOPIFY,
    source_payout_id: gid(p.id),
    payout_date: p.issuedAt ? new Date(p.issuedAt) : null,
    status: SHOPIFY_PAYOUT_STATUS[p.status.toUpperCase()] ?? 'scheduled',
    amount: parseFloat(p.net.amount),
    currency: p.net.currencyCode,
    bank_summary: p.bankAccount,
    charges_gross: parseFloat(p.summary.chargesGross.amount),
    refunds_gross: parseFloat(p.summary.refundsGross.amount),
    adjustments_gross: parseFloat(p.summary.adjustmentsGross.amount),
    fees_total: chargesFee + refundsFee + adjustmentsFee,
    source_metadata: null,
    synced_at: new Date(),
  };
}

export function mapBalanceTransaction(t: ShopifyBalanceTransaction) {
  return {
    source: SOURCE.SHOPIFY,
    source_balance_transaction_id: gid(t.id),
    payout_id: null, // resolved by repository after payouts synced
    source_payout_id: t.associatedPayout ? gid(t.associatedPayout.id) : null,
    transaction_id: t.sourceOrderTransactionId ?? t.sourceId,
    type: SHOPIFY_BALANCE_TYPE[t.type.toUpperCase()] ?? 'adjustment',
    amount: parseFloat(t.amount.amount),
    fee: parseFloat(t.fee.amount),
    net: parseFloat(t.net.amount),
    processed_at: t.transactionDate ? new Date(t.transactionDate) : null,
    source_metadata: null,
    synced_at: new Date(),
  };
}

export function mapRefunds(orderWithRefunds: ShopifyOrderWithRefunds) {
  return orderWithRefunds.refunds.map((r) => ({
    source: SOURCE.SHOPIFY,
    source_refund_id: gid(r.id),
    order_id: gid(orderWithRefunds.id),
    refund_amount: parseFloat(r.totalRefundedSet.shopMoney.amount),
    refund_currency: r.totalRefundedSet.shopMoney.currencyCode,
    reason: r.note,
    refunded_at: r.createdAt ? new Date(r.createdAt) : null,
    restocked: r.refundLineItems.edges.some((e) => e.node.restockType !== 'NO_RESTOCK'),
    refund_line_items: r.refundLineItems.edges.map((e) => ({
      sku: e.node.lineItem?.sku ?? '',
      quantity: e.node.quantity,
      amount: parseFloat(e.node.subtotalSet.shopMoney.amount),
      restock_type: e.node.restockType ?? undefined,
    })),
    source_metadata: null,
    synced_at: new Date(),
  }));
}

export function mapTransactions(orderWithTx: ShopifyOrderWithTransactions) {
  return orderWithTx.transactions.map((t) => ({
    source: SOURCE.SHOPIFY,
    source_transaction_id: gid(t.id),
    order_id: gid(orderWithTx.id),
    kind: SHOPIFY_TX_KIND[t.kind.toUpperCase()] ?? 'sale',
    status: SHOPIFY_TX_STATUS[t.status.toUpperCase()] ?? 'success',
    gateway: t.gateway,
    amount: parseFloat(t.amountSet.shopMoney.amount),
    currency: t.amountSet.shopMoney.currencyCode,
    payment_method: t.paymentDetails?.paymentMethodName ?? null,
    processed_at: t.processedAt ? new Date(t.processedAt) : null,
    parent_transaction_id: t.parentTransaction ? gid(t.parentTransaction.id) : null,
    source_metadata: null,
    synced_at: new Date(),
  }));
}
```

- [ ] **Step 4.3: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [ ] **Step 4.4: Commit**

```bash
git add backend/src/modules/finance/finance.types.ts backend/src/modules/finance/finance.mapper.ts
git commit -m "feat(finance): add types and Shopify→unified mappers"
```

---

## Task 5: Repositories

**Files:**
- Create: `backend/src/modules/finance/locations.repository.ts`
- Create: `backend/src/modules/finance/refunds.repository.ts`
- Create: `backend/src/modules/finance/transactions.repository.ts`
- Create: `backend/src/modules/finance/payouts.repository.ts`
- Create: `backend/src/modules/finance/balance-transactions.repository.ts`

> Per `node.md`: writes via Sequelize `bulkCreate` with `updateOnDuplicate`; reads via raw SQL with named replacements. Each repo exports an `upsertMany` write function and read functions used by service.

- [ ] **Step 5.1: Create locations.repository.ts**

```typescript
import { Location } from '@db/models';
import { SOURCE } from '@constant';

export async function upsertLocations(rows: Parameters<typeof Location.bulkCreate>[0]): Promise<number> {
  if (rows.length === 0) return 0;
  await Location.bulkCreate(rows, {
    updateOnDuplicate: ['name', 'address', 'active', 'fulfills_online_orders', 'source_metadata', 'synced_at', 'updated_at'],
  });
  return rows.length;
}

export async function listLocations(): Promise<Location[]> {
  return Location.findAll({ where: { source: SOURCE.SHOPIFY }, order: [['name', 'ASC']] });
}
```

- [ ] **Step 5.2: Create refunds.repository.ts**

```typescript
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { OrderRefund } from '@db/models';
import { SOURCE } from '@constant';

export async function upsertRefunds(rows: Parameters<typeof OrderRefund.bulkCreate>[0]): Promise<number> {
  if (rows.length === 0) return 0;
  await OrderRefund.bulkCreate(rows, {
    updateOnDuplicate: ['order_id', 'refund_amount', 'refund_currency', 'reason', 'refunded_at', 'restocked', 'refund_line_items', 'source_metadata', 'synced_at', 'updated_at'],
  });
  return rows.length;
}

export interface RefundsListParams {
  from: Date;
  to: Date;
  page: number;
  limit: number;
  reason?: string;
}

export interface RefundRow {
  id: number;
  source_refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_currency: string;
  reason: string | null;
  refunded_at: string;
  restocked: boolean;
}

export async function listRefunds(params: RefundsListParams): Promise<{ rows: RefundRow[]; total: number }> {
  const offset = (params.page - 1) * params.limit;
  const where: string[] = [`source = :source`, `refunded_at >= :from`, `refunded_at <= :to`];
  const replacements: Record<string, unknown> = {
    source: SOURCE.SHOPIFY,
    from: params.from,
    to: params.to,
    limit: params.limit,
    offset,
  };
  if (params.reason) {
    where.push(`reason = :reason`);
    replacements.reason = params.reason;
  }
  const whereClause = where.join(' AND ');

  const rows = await sequelize.query<RefundRow>(
    `SELECT id, source_refund_id, order_id, refund_amount, refund_currency, reason, refunded_at, restocked
       FROM orders_refunds
       WHERE ${whereClause}
       ORDER BY refunded_at DESC
       LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements },
  );

  const totalResult = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM orders_refunds WHERE ${whereClause}`,
    { type: QueryTypes.SELECT, replacements },
  );
  return { rows, total: parseInt(totalResult[0]?.count ?? '0', 10) };
}

export async function refundSummaryAggregates(from: Date, to: Date): Promise<{
  total_refunds: number;
  refund_count: number;
  by_reason: { reason: string; count: number; amount: number }[];
}> {
  const totals = await sequelize.query<{ total_refunds: string; refund_count: string }>(
    `SELECT COALESCE(SUM(refund_amount),0)::text AS total_refunds, COUNT(*)::text AS refund_count
       FROM orders_refunds
       WHERE source = :source AND refunded_at BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  const byReason = await sequelize.query<{ reason: string; count: string; amount: string }>(
    `SELECT COALESCE(reason, 'Unspecified') AS reason, COUNT(*)::text AS count, SUM(refund_amount)::text AS amount
       FROM orders_refunds
       WHERE source = :source AND refunded_at BETWEEN :from AND :to
       GROUP BY COALESCE(reason, 'Unspecified')
       ORDER BY SUM(refund_amount) DESC
       LIMIT 10`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  return {
    total_refunds: parseFloat(totals[0]?.total_refunds ?? '0'),
    refund_count: parseInt(totals[0]?.refund_count ?? '0', 10),
    by_reason: byReason.map((r) => ({ reason: r.reason, count: parseInt(r.count, 10), amount: parseFloat(r.amount) })),
  };
}
```

- [ ] **Step 5.3: Create transactions.repository.ts**

```typescript
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { OrderTransaction } from '@db/models';
import { SOURCE } from '@constant';

export async function upsertTransactions(rows: Parameters<typeof OrderTransaction.bulkCreate>[0]): Promise<number> {
  if (rows.length === 0) return 0;
  await OrderTransaction.bulkCreate(rows, {
    updateOnDuplicate: ['order_id', 'kind', 'status', 'gateway', 'amount', 'currency', 'payment_method', 'processed_at', 'parent_transaction_id', 'source_metadata', 'synced_at', 'updated_at'],
  });
  return rows.length;
}

export interface PaymentMethodSplitRow {
  is_cod: boolean;
  count: number;
  amount: number;
}

export async function paymentMethodSplit(from: Date, to: Date): Promise<{
  cod: { count: number; amount: number };
  prepaid: { count: number; amount: number };
  by_gateway: { gateway: string; count: number; amount: number }[];
}> {
  const splits = await sequelize.query<{ is_cod: boolean; count: string; amount: string }>(
    `SELECT (LOWER(COALESCE(gateway,'')) IN ('cod','cash_on_delivery')) AS is_cod,
            COUNT(*)::text AS count,
            SUM(amount)::text AS amount
       FROM orders_transactions
       WHERE source = :source
         AND kind IN ('sale','capture')
         AND status = 'success'
         AND processed_at BETWEEN :from AND :to
       GROUP BY (LOWER(COALESCE(gateway,'')) IN ('cod','cash_on_delivery'))`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );

  const byGateway = await sequelize.query<{ gateway: string; count: string; amount: string }>(
    `SELECT COALESCE(gateway, 'unknown') AS gateway, COUNT(*)::text AS count, SUM(amount)::text AS amount
       FROM orders_transactions
       WHERE source = :source
         AND kind IN ('sale','capture')
         AND status = 'success'
         AND processed_at BETWEEN :from AND :to
       GROUP BY COALESCE(gateway, 'unknown')
       ORDER BY SUM(amount) DESC`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );

  const cod = splits.find((s) => s.is_cod) ?? { count: '0', amount: '0' };
  const prepaid = splits.find((s) => !s.is_cod) ?? { count: '0', amount: '0' };

  return {
    cod: { count: parseInt(cod.count, 10), amount: parseFloat(cod.amount) },
    prepaid: { count: parseInt(prepaid.count, 10), amount: parseFloat(prepaid.amount) },
    by_gateway: byGateway.map((r) => ({ gateway: r.gateway, count: parseInt(r.count, 10), amount: parseFloat(r.amount) })),
  };
}

export interface TxListParams {
  from: Date;
  to: Date;
  page: number;
  limit: number;
  gateway?: string;
  kind?: string;
}

export async function listTransactions(params: TxListParams) {
  const offset = (params.page - 1) * params.limit;
  const where: string[] = [`source = :source`, `processed_at BETWEEN :from AND :to`];
  const replacements: Record<string, unknown> = {
    source: SOURCE.SHOPIFY,
    from: params.from,
    to: params.to,
    limit: params.limit,
    offset,
  };
  if (params.gateway) { where.push(`gateway = :gateway`); replacements.gateway = params.gateway; }
  if (params.kind) { where.push(`kind = :kind`); replacements.kind = params.kind; }
  const whereClause = where.join(' AND ');

  const rows = await sequelize.query(
    `SELECT id, source_transaction_id, order_id, kind, status, gateway, amount, currency, payment_method, processed_at
       FROM orders_transactions
       WHERE ${whereClause}
       ORDER BY processed_at DESC
       LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements },
  );
  const totalResult = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM orders_transactions WHERE ${whereClause}`,
    { type: QueryTypes.SELECT, replacements },
  );
  return { rows, total: parseInt(totalResult[0]?.count ?? '0', 10) };
}
```

- [ ] **Step 5.4: Create payouts.repository.ts**

```typescript
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { Payout } from '@db/models';
import { SOURCE } from '@constant';

export async function upsertPayouts(rows: Parameters<typeof Payout.bulkCreate>[0]): Promise<number> {
  if (rows.length === 0) return 0;
  await Payout.bulkCreate(rows, {
    updateOnDuplicate: ['payout_date', 'status', 'amount', 'currency', 'bank_summary', 'charges_gross', 'refunds_gross', 'adjustments_gross', 'fees_total', 'source_metadata', 'synced_at', 'updated_at'],
  });
  return rows.length;
}

export async function payoutAggregates(from: Date, to: Date): Promise<{ payouts_received: number; shopify_fees: number }> {
  const result = await sequelize.query<{ payouts_received: string; shopify_fees: string }>(
    `SELECT COALESCE(SUM(amount),0)::text AS payouts_received,
            COALESCE(SUM(fees_total),0)::text AS shopify_fees
       FROM payouts
       WHERE source = :source AND payout_date BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  return {
    payouts_received: parseFloat(result[0]?.payouts_received ?? '0'),
    shopify_fees: parseFloat(result[0]?.shopify_fees ?? '0'),
  };
}

export async function listPayouts(params: { from: Date; to: Date; page: number; limit: number; status?: string }) {
  const offset = (params.page - 1) * params.limit;
  const where: string[] = [`source = :source`, `payout_date BETWEEN :from AND :to`];
  const replacements: Record<string, unknown> = {
    source: SOURCE.SHOPIFY,
    from: params.from,
    to: params.to,
    limit: params.limit,
    offset,
  };
  if (params.status) { where.push(`status = :status`); replacements.status = params.status; }
  const whereClause = where.join(' AND ');

  const rows = await sequelize.query(
    `SELECT id, source_payout_id, payout_date, status, amount, currency, charges_gross, refunds_gross, adjustments_gross, fees_total
       FROM payouts
       WHERE ${whereClause}
       ORDER BY payout_date DESC
       LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements },
  );
  const totalResult = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM payouts WHERE ${whereClause}`,
    { type: QueryTypes.SELECT, replacements },
  );
  return { rows, total: parseInt(totalResult[0]?.count ?? '0', 10) };
}

export async function findPayoutById(id: number) {
  const result = await sequelize.query(
    `SELECT id, source_payout_id, payout_date, status, amount, currency, bank_summary, charges_gross, refunds_gross, adjustments_gross, fees_total
       FROM payouts WHERE id = :id LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { id } },
  );
  return result[0] ?? null;
}
```

- [ ] **Step 5.5: Create balance-transactions.repository.ts**

```typescript
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { BalanceTransaction } from '@db/models';
import { SOURCE } from '@constant';

export async function upsertBalanceTransactions(
  rows: Parameters<typeof BalanceTransaction.bulkCreate>[0],
): Promise<number> {
  if (rows.length === 0) return 0;
  await BalanceTransaction.bulkCreate(rows, {
    updateOnDuplicate: ['payout_id', 'source_payout_id', 'transaction_id', 'type', 'amount', 'fee', 'net', 'processed_at', 'source_metadata', 'synced_at', 'updated_at'],
  });
  return rows.length;
}

// Resolve foreign-key payout_id by matching source_payout_id once payouts are synced.
export async function linkBalanceTransactionsToPayouts(): Promise<number> {
  const [, affectedRows] = await sequelize.query(
    `UPDATE balance_transactions bt
        SET payout_id = p.id
       FROM payouts p
       WHERE bt.source_payout_id IS NOT NULL
         AND bt.payout_id IS NULL
         AND bt.source = p.source
         AND bt.source_payout_id = p.source_payout_id`,
  );
  return Number(affectedRows ?? 0);
}

export async function listBalanceTransactionsForPayout(payoutId: number) {
  return sequelize.query(
    `SELECT id, type, amount, fee, net, processed_at, transaction_id
       FROM balance_transactions
       WHERE payout_id = :payoutId
       ORDER BY processed_at ASC`,
    { type: QueryTypes.SELECT, replacements: { payoutId } },
  );
}
```

- [ ] **Step 5.6: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [ ] **Step 5.7: Commit**

```bash
git add backend/src/modules/finance/locations.repository.ts \
        backend/src/modules/finance/refunds.repository.ts \
        backend/src/modules/finance/transactions.repository.ts \
        backend/src/modules/finance/payouts.repository.ts \
        backend/src/modules/finance/balance-transactions.repository.ts
git commit -m "feat(finance): add repositories with upserts and read queries"
```

---

## Task 6: Resource handlers — register with orchestrator

**Files:**
- Create: `backend/src/modules/finance/finance.handlers.ts`
- Create: `backend/src/modules/finance/index.ts`

- [ ] **Step 6.1: Create finance.handlers.ts**

`backend/src/modules/finance/finance.handlers.ts`:

```typescript
import { logger } from '@logger/logger';
import { SOURCE } from '@constant';
import {
  fetchLocations,
  fetchPayouts,
  fetchBalanceTransactions,
  fetchRefundsDelta,
  fetchTransactionsDelta,
  fetchRefundsBulk,
  fetchTransactionsBulk,
} from '@modules/shopify/shopify.connector';
import {
  mapLocation,
  mapPayout,
  mapBalanceTransaction,
  mapRefunds,
  mapTransactions,
} from './finance.mapper';
import { upsertLocations } from './locations.repository';
import { upsertRefunds } from './refunds.repository';
import { upsertTransactions } from './transactions.repository';
import { upsertPayouts } from './payouts.repository';
import {
  upsertBalanceTransactions,
  linkBalanceTransactionsToPayouts,
} from './balance-transactions.repository';
import type { ResourceHandler, SyncResult } from '@modules/sync-orchestrator/sync-orchestrator.types';

const SHOPIFY_BACKFILL_FROM = new Date('2023-01-01T00:00:00.000Z');

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; duration_ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, duration_ms: Date.now() - start };
}

export const locationsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'locations',
  backfill: async (): Promise<SyncResult> => {
    const { result: locations, duration_ms } = await timed(fetchLocations);
    const rows = locations.map(mapLocation);
    const count = await upsertLocations(rows);
    return { resource: 'locations', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
  incremental: async (): Promise<SyncResult> => {
    // Locations are a small snapshot — refetch every tick.
    const { result: locations, duration_ms } = await timed(fetchLocations);
    const rows = locations.map(mapLocation);
    const count = await upsertLocations(rows);
    return { resource: 'locations', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
};

export const payoutsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'payouts',
  backfill: async (): Promise<SyncResult> => {
    const { result: payouts, duration_ms } = await timed(() => fetchPayouts(SHOPIFY_BACKFILL_FROM));
    const rows = payouts.map(mapPayout);
    const count = await upsertPayouts(rows);
    await linkBalanceTransactionsToPayouts();
    return { resource: 'payouts', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
  incremental: async ({ sinceDate }): Promise<SyncResult> => {
    const { result: payouts, duration_ms } = await timed(() => fetchPayouts(sinceDate));
    const rows = payouts.map(mapPayout);
    const count = await upsertPayouts(rows);
    await linkBalanceTransactionsToPayouts();
    return { resource: 'payouts', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
};

export const balanceTransactionsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'balance_transactions',
  backfill: async (): Promise<SyncResult> => {
    const { result: txs, duration_ms } = await timed(() => fetchBalanceTransactions(SHOPIFY_BACKFILL_FROM));
    const rows = txs.map(mapBalanceTransaction);
    const count = await upsertBalanceTransactions(rows);
    await linkBalanceTransactionsToPayouts();
    return { resource: 'balance_transactions', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
  incremental: async ({ sinceDate }): Promise<SyncResult> => {
    const { result: txs, duration_ms } = await timed(() => fetchBalanceTransactions(sinceDate));
    const rows = txs.map(mapBalanceTransaction);
    const count = await upsertBalanceTransactions(rows);
    await linkBalanceTransactionsToPayouts();
    return { resource: 'balance_transactions', source: SOURCE.SHOPIFY, records_synced: count, duration_ms };
  },
};

async function downloadAndParseBulkJsonl(url: string): Promise<unknown[]> {
  // Download the JSONL file and parse line-by-line.
  // If a helper exists in shopify.backfill.ts, prefer it.
  const axios = (await import('axios')).default;
  const response = await axios.get<string>(url, { responseType: 'text' });
  const lines = response.data.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((l) => JSON.parse(l) as unknown);
}

export const refundsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'refunds',
  backfill: async (): Promise<SyncResult> => {
    const start = Date.now();
    const { url, opId } = await fetchRefundsBulk();
    const lines = await downloadAndParseBulkJsonl(url);

    // Bulk JSONL returns a flat list of objects. Orders have no parentId; nested
    // refund items have __parentId = order's GID. Group them.
    type LineNode = Record<string, unknown> & { id?: string; __parentId?: string };
    const orders = new Map<string, { id: string; refunds: unknown[] }>();
    for (const node of lines as LineNode[]) {
      if (!node.__parentId) {
        // Top-level: order
        if (typeof node.id === 'string') orders.set(node.id, { id: node.id, refunds: [] });
      } else if (node.__parentId && typeof node.__parentId === 'string') {
        const parent = orders.get(node.__parentId);
        if (parent) parent.refunds.push(node);
      }
    }
    let totalRefunds = 0;
    for (const order of orders.values()) {
      // The shape from bulk JSONL is similar but flatter; map carefully.
      // For now, normalize: each refund has id, createdAt, note, totalRefundedSet, refundLineItems flattened.
      // TODO during implementation: read a sample JSONL to confirm the exact shape and adjust mapping.
      const mapped = mapRefunds({
        id: order.id,
        refunds: order.refunds as Parameters<typeof mapRefunds>[0]['refunds'],
      });
      totalRefunds += await upsertRefunds(mapped);
    }
    logger.info(`[Refunds Backfill] op=${opId} orders=${orders.size} refunds=${totalRefunds}`);
    return { resource: 'refunds', source: SOURCE.SHOPIFY, records_synced: totalRefunds, duration_ms: Date.now() - start, bulk_op_id: opId };
  },
  incremental: async ({ sinceDate }): Promise<SyncResult> => {
    const start = Date.now();
    const since = sinceDate ?? new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h fallback
    const orders = await fetchRefundsDelta(since);
    let total = 0;
    for (const order of orders) {
      total += await upsertRefunds(mapRefunds(order));
    }
    return { resource: 'refunds', source: SOURCE.SHOPIFY, records_synced: total, duration_ms: Date.now() - start };
  },
};

export const transactionsHandler: ResourceHandler = {
  source: SOURCE.SHOPIFY,
  resource: 'transactions',
  backfill: async (): Promise<SyncResult> => {
    const start = Date.now();
    const { url, opId } = await fetchTransactionsBulk();
    const lines = await downloadAndParseBulkJsonl(url);
    type LineNode = Record<string, unknown> & { id?: string; __parentId?: string };
    const orders = new Map<string, { id: string; transactions: unknown[] }>();
    for (const node of lines as LineNode[]) {
      if (!node.__parentId) {
        if (typeof node.id === 'string') orders.set(node.id, { id: node.id, transactions: [] });
      } else if (typeof node.__parentId === 'string') {
        const parent = orders.get(node.__parentId);
        if (parent) parent.transactions.push(node);
      }
    }
    let total = 0;
    for (const order of orders.values()) {
      const mapped = mapTransactions({
        id: order.id,
        transactions: order.transactions as Parameters<typeof mapTransactions>[0]['transactions'],
      });
      total += await upsertTransactions(mapped);
    }
    logger.info(`[Transactions Backfill] op=${opId} orders=${orders.size} txs=${total}`);
    return { resource: 'transactions', source: SOURCE.SHOPIFY, records_synced: total, duration_ms: Date.now() - start, bulk_op_id: opId };
  },
  incremental: async ({ sinceDate }): Promise<SyncResult> => {
    const start = Date.now();
    const since = sinceDate ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orders = await fetchTransactionsDelta(since);
    let total = 0;
    for (const order of orders) {
      total += await upsertTransactions(mapTransactions(order));
    }
    return { resource: 'transactions', source: SOURCE.SHOPIFY, records_synced: total, duration_ms: Date.now() - start };
  },
};
```

> **Implementation note for the engineer:** The bulk-JSONL parsing in `refundsHandler.backfill` and `transactionsHandler.backfill` requires confirming the exact node shape returned by Shopify's bulk operation. Before final commit, run a backfill on a small subset (modify the GraphQL `query:` filter to e.g. `updated_at:>=2026-04-01`), inspect 1-2 lines of the JSONL file, and confirm the mapper produces correct rows. If shapes differ, adjust the `Parameters<typeof mapRefunds>[0]['refunds']` cast to a properly-shaped intermediate type.

- [ ] **Step 6.2: Create finance/index.ts (registers handlers on import)**

`backend/src/modules/finance/index.ts`:

```typescript
import { registerResource } from '@modules/sync-orchestrator/sync-orchestrator.registry';
import {
  locationsHandler,
  payoutsHandler,
  balanceTransactionsHandler,
  refundsHandler,
  transactionsHandler,
} from './finance.handlers';

export function registerFinanceResources(): void {
  registerResource(locationsHandler);
  registerResource(payoutsHandler);
  registerResource(balanceTransactionsHandler);
  registerResource(refundsHandler);
  registerResource(transactionsHandler);
}

export * from './finance.types';
```

- [ ] **Step 6.3: Wire registration into app bootstrap**

Open `backend/src/index.ts` (or wherever the server starts; check `backend/src/app.ts` first). Find the location where the scheduler is started or where modules initialize. Add:

```typescript
import { registerFinanceResources } from '@modules/finance';

// ...near server startup, after sequelize.authenticate() succeeds:
registerFinanceResources();
```

- [ ] **Step 6.4: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [ ] **Step 6.5: Commit**

```bash
git add backend/src/modules/finance/finance.handlers.ts backend/src/modules/finance/index.ts backend/src/index.ts backend/src/app.ts 2>/dev/null
git commit -m "feat(finance): register Slice 1 resource handlers with sync orchestrator"
```

---

## Task 7: Finance service — KPIs and aggregations

**Files:**
- Create: `backend/src/modules/finance/finance.service.ts`

- [ ] **Step 7.1: Create finance.service.ts**

`backend/src/modules/finance/finance.service.ts`:

```typescript
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { SOURCE } from '@constant';
import {
  refundSummaryAggregates,
  listRefunds as listRefundsRepo,
  type RefundsListParams,
} from './refunds.repository';
import {
  paymentMethodSplit as paymentMethodSplitRepo,
  listTransactions as listTransactionsRepo,
  type TxListParams,
} from './transactions.repository';
import {
  payoutAggregates,
  listPayouts as listPayoutsRepo,
  findPayoutById,
} from './payouts.repository';
import { listBalanceTransactionsForPayout } from './balance-transactions.repository';
import { listLocations } from './locations.repository';
import type {
  FinanceKpis,
  RevenueBreakdownPoint,
  PaymentMethodSplit,
  RefundsSummary,
  PayoutDetail,
  GroupBy,
} from './finance.types';

interface OrderTotals {
  gross_revenue: number;
  total_discounts: number;
  total_tax: number;
  total_shipping: number;
  order_count: number;
}

async function orderTotals(from: Date, to: Date): Promise<OrderTotals> {
  // Sums over shopify_orders for the period. Adjust column names to match the
  // existing shopify_orders schema (revenue, total_discounts, total_tax, total_shipping).
  const result = await sequelize.query<{
    gross_revenue: string;
    total_discounts: string;
    total_tax: string;
    total_shipping: string;
    order_count: string;
  }>(
    `SELECT COALESCE(SUM(revenue),0)::text AS gross_revenue,
            COALESCE(SUM(total_discounts),0)::text AS total_discounts,
            COALESCE(SUM(total_tax),0)::text AS total_tax,
            COALESCE(SUM(total_shipping),0)::text AS total_shipping,
            COUNT(*)::text AS order_count
       FROM shopify_orders
       WHERE created_at BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );
  const row = result[0];
  return {
    gross_revenue: parseFloat(row?.gross_revenue ?? '0'),
    total_discounts: parseFloat(row?.total_discounts ?? '0'),
    total_tax: parseFloat(row?.total_tax ?? '0'),
    total_shipping: parseFloat(row?.total_shipping ?? '0'),
    order_count: parseInt(row?.order_count ?? '0', 10),
  };
}

export async function getKpis(from: Date, to: Date): Promise<FinanceKpis> {
  const [orders, refunds, payouts] = await Promise.all([
    orderTotals(from, to),
    refundSummaryAggregates(from, to),
    payoutAggregates(from, to),
  ]);

  // Per spec Section 8: net_revenue = gross - discounts - refunds - tax - shipping
  const net_revenue = orders.gross_revenue - orders.total_discounts - refunds.total_refunds - orders.total_tax - orders.total_shipping;
  const fees_pct = payouts.payouts_received > 0 ? (payouts.shopify_fees / payouts.payouts_received) * 100 : 0;
  const refund_rate = orders.order_count > 0 ? (refunds.refund_count / orders.order_count) * 100 : 0;

  return {
    gross_revenue: orders.gross_revenue,
    total_discounts: orders.total_discounts,
    total_tax: orders.total_tax,
    total_shipping: orders.total_shipping,
    total_refunds: refunds.total_refunds,
    net_revenue,
    payouts_received: payouts.payouts_received,
    shopify_fees: payouts.shopify_fees,
    fees_pct,
    refund_rate,
    refund_count: refunds.refund_count,
    order_count: orders.order_count,
  };
}

export async function getRevenueBreakdown(from: Date, to: Date, groupBy: GroupBy): Promise<RevenueBreakdownPoint[]> {
  const truncUnit = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month';
  const orderRows = await sequelize.query<{ bucket: string; gross: string; discounts: string; tax: string; shipping: string }>(
    `SELECT date_trunc('${truncUnit}', created_at)::date::text AS bucket,
            COALESCE(SUM(revenue),0)::text AS gross,
            COALESCE(SUM(total_discounts),0)::text AS discounts,
            COALESCE(SUM(total_tax),0)::text AS tax,
            COALESCE(SUM(total_shipping),0)::text AS shipping
       FROM shopify_orders
       WHERE created_at BETWEEN :from AND :to
       GROUP BY bucket
       ORDER BY bucket ASC`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );

  const refundRows = await sequelize.query<{ bucket: string; refunds: string }>(
    `SELECT date_trunc('${truncUnit}', refunded_at)::date::text AS bucket,
            COALESCE(SUM(refund_amount),0)::text AS refunds
       FROM orders_refunds
       WHERE source = :source AND refunded_at BETWEEN :from AND :to
       GROUP BY bucket`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );

  const refundMap = new Map(refundRows.map((r) => [r.bucket, parseFloat(r.refunds)]));

  return orderRows.map((r) => {
    const gross = parseFloat(r.gross);
    const discounts = parseFloat(r.discounts);
    const tax = parseFloat(r.tax);
    const shipping = parseFloat(r.shipping);
    const refunds = refundMap.get(r.bucket) ?? 0;
    return {
      date: r.bucket,
      gross,
      discounts,
      refunds,
      tax,
      net: gross - discounts - refunds - tax - shipping,
    };
  });
}

export async function getPaymentMethodSplit(from: Date, to: Date): Promise<PaymentMethodSplit> {
  const split = await paymentMethodSplitRepo(from, to);
  return {
    cod: split.cod,
    prepaid: split.prepaid,
    breakdown_by_gateway: split.by_gateway,
  };
}

export async function getRefundsSummary(from: Date, to: Date): Promise<RefundsSummary> {
  const summary = await refundSummaryAggregates(from, to);
  const orders = await orderTotals(from, to);

  const rateRows = await sequelize.query<{ bucket: string; refund_count: string; order_count: string }>(
    `SELECT date_trunc('day', created_at)::date::text AS bucket, COUNT(*)::text AS order_count
       FROM shopify_orders WHERE created_at BETWEEN :from AND :to GROUP BY bucket`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );
  const refundRateRows = await sequelize.query<{ bucket: string; refund_count: string }>(
    `SELECT date_trunc('day', refunded_at)::date::text AS bucket, COUNT(*)::text AS refund_count
       FROM orders_refunds WHERE source = :source AND refunded_at BETWEEN :from AND :to GROUP BY bucket`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  const orderMap = new Map(rateRows.map((r) => [r.bucket, parseInt(r.order_count, 10)]));
  const refundMap = new Map(refundRateRows.map((r) => [r.bucket, parseInt(r.refund_count, 10)]));
  const allBuckets = new Set([...orderMap.keys(), ...refundMap.keys()]);
  const refund_rate_over_time = Array.from(allBuckets)
    .sort()
    .map((bucket) => {
      const oc = orderMap.get(bucket) ?? 0;
      const rc = refundMap.get(bucket) ?? 0;
      return { date: bucket, rate: oc > 0 ? (rc / oc) * 100 : 0 };
    });

  const skuRows = await sequelize.query<{ sku: string; count: string; amount: string }>(
    `WITH refund_lines AS (
       SELECT (jsonb_array_elements(refund_line_items))->>'sku' AS sku,
              ((jsonb_array_elements(refund_line_items))->>'amount')::numeric AS amount
       FROM orders_refunds
       WHERE source = :source AND refunded_at BETWEEN :from AND :to
     )
     SELECT sku, COUNT(*)::text AS count, SUM(amount)::text AS amount
     FROM refund_lines
     WHERE sku IS NOT NULL AND sku <> ''
     GROUP BY sku
     ORDER BY SUM(amount) DESC
     LIMIT 20`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );

  return {
    refund_rate_over_time,
    top_reasons: summary.by_reason,
    refunds_by_sku: skuRows.map((r) => ({ sku: r.sku, count: parseInt(r.count, 10), amount: parseFloat(r.amount) })),
  };
}

export async function listPayouts(params: { from: Date; to: Date; page: number; limit: number; status?: string }) {
  return listPayoutsRepo(params);
}

export async function getPayoutDetail(id: number): Promise<PayoutDetail | null> {
  const payout = await findPayoutById(id);
  if (!payout) return null;
  const balance_transactions = await listBalanceTransactionsForPayout(id);
  return { payout: payout as PayoutDetail['payout'], balance_transactions: balance_transactions as PayoutDetail['balance_transactions'] };
}

export async function listRefunds(params: RefundsListParams) {
  return listRefundsRepo(params);
}

export async function listTransactions(params: TxListParams) {
  return listTransactionsRepo(params);
}

export async function getLocations() {
  return listLocations();
}
```

- [ ] **Step 7.2: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

> If `shopify_orders` columns are named differently (e.g., `subtotal` instead of `revenue`), adjust the SQL in `orderTotals` and `getRevenueBreakdown`. Read `backend/src/db/models/ShopifyOrder.ts` to confirm column names before this step.

- [ ] **Step 7.3: Commit**

```bash
git add backend/src/modules/finance/finance.service.ts
git commit -m "feat(finance): add KPI service with revenue, refunds, payouts aggregations"
```

---

## Task 8: Finance controller and routes

**Files:**
- Create: `backend/src/modules/finance/finance.controller.ts`
- Create: `backend/src/modules/finance/finance.routes.ts`
- Modify: `backend/src/routes/index.ts`

- [ ] **Step 8.1: Create finance.controller.ts**

`backend/src/modules/finance/finance.controller.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { handleApiResponse } from '@utils/handleResponse';
import { AppError } from '@utils/appError';
import { ERROR_TYPES } from '@constant';
import * as service from './finance.service';

const dateString = z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid date' });

const rangeSchema = z.object({
  from: dateString,
  to: dateString,
});

const breakdownSchema = rangeSchema.extend({
  group_by: z.enum(['day', 'week', 'month']).default('day'),
});

const paginatedSchema = rangeSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const refundsListSchema = paginatedSchema.extend({
  reason: z.string().optional(),
});

const txListSchema = paginatedSchema.extend({
  gateway: z.string().optional(),
  kind: z.string().optional(),
});

const payoutsListSchema = paginatedSchema.extend({
  status: z.string().optional(),
});

function parseRange(q: Record<string, string | undefined>): { from: Date; to: Date } {
  const parsed = rangeSchema.parse(q);
  return { from: new Date(parsed.from), to: new Date(parsed.to) };
}

export async function kpisHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const range = parseRange(req.query as Record<string, string>);
    const data = await service.getKpis(range.from, range.to);
    handleApiResponse(res, { data });
  } catch (err) { next(err); }
}

export async function revenueBreakdownHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = breakdownSchema.parse(req.query);
    const data = await service.getRevenueBreakdown(new Date(parsed.from), new Date(parsed.to), parsed.group_by);
    handleApiResponse(res, { data });
  } catch (err) { next(err); }
}

export async function paymentMethodSplitHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const range = parseRange(req.query as Record<string, string>);
    const data = await service.getPaymentMethodSplit(range.from, range.to);
    handleApiResponse(res, { data });
  } catch (err) { next(err); }
}

export async function payoutsListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = payoutsListSchema.parse(req.query);
    const data = await service.listPayouts({
      from: new Date(parsed.from), to: new Date(parsed.to),
      page: parsed.page, limit: parsed.limit, status: parsed.status,
    });
    handleApiResponse(res, { data: data.rows, pagination: { page: parsed.page, limit: parsed.limit, total: data.total } });
  } catch (err) { next(err); }
}

export async function payoutDetailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      throw new AppError({ errorType: ERROR_TYPES.BAD_REQUEST, message: 'Invalid payout id', code: 'INVALID_ID' });
    }
    const data = await service.getPayoutDetail(id);
    if (!data) {
      throw new AppError({ errorType: ERROR_TYPES.NOT_FOUND, message: 'Payout not found', code: 'NOT_FOUND' });
    }
    handleApiResponse(res, { data });
  } catch (err) { next(err); }
}

export async function refundsListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = refundsListSchema.parse(req.query);
    const data = await service.listRefunds({
      from: new Date(parsed.from), to: new Date(parsed.to),
      page: parsed.page, limit: parsed.limit, reason: parsed.reason,
    });
    handleApiResponse(res, { data: data.rows, pagination: { page: parsed.page, limit: parsed.limit, total: data.total } });
  } catch (err) { next(err); }
}

export async function refundsSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const range = parseRange(req.query as Record<string, string>);
    const data = await service.getRefundsSummary(range.from, range.to);
    handleApiResponse(res, { data });
  } catch (err) { next(err); }
}

export async function transactionsListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = txListSchema.parse(req.query);
    const data = await service.listTransactions({
      from: new Date(parsed.from), to: new Date(parsed.to),
      page: parsed.page, limit: parsed.limit,
      gateway: parsed.gateway, kind: parsed.kind,
    });
    handleApiResponse(res, { data: data.rows, pagination: { page: parsed.page, limit: parsed.limit, total: data.total } });
  } catch (err) { next(err); }
}
```

> If `AppError` constructor or `ERROR_TYPES.BAD_REQUEST` constant has different names, check `backend/src/utils/appError.ts` and `backend/src/constant/errorTypes.constant.ts` and adjust.

- [ ] **Step 8.2: Create finance.routes.ts**

`backend/src/modules/finance/finance.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import * as controller from './finance.controller';

const router = Router();

router.use(authenticate);

router.get('/kpis', controller.kpisHandler);
router.get('/revenue-breakdown', controller.revenueBreakdownHandler);
router.get('/payment-method-split', controller.paymentMethodSplitHandler);
router.get('/payouts', controller.payoutsListHandler);
router.get('/payouts/:id', controller.payoutDetailHandler);
router.get('/refunds', controller.refundsListHandler);
router.get('/refunds/summary', controller.refundsSummaryHandler);
router.get('/transactions', controller.transactionsListHandler);

export default router;
```

- [ ] **Step 8.3: Mount routes**

Open `backend/src/routes/index.ts` and add:

```typescript
import financeRoutes from '@modules/finance/finance.routes';

router.use('/finance', financeRoutes);
```

- [ ] **Step 8.4: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [ ] **Step 8.5: Commit**

```bash
git add backend/src/modules/finance/finance.controller.ts backend/src/modules/finance/finance.routes.ts backend/src/routes/index.ts
git commit -m "feat(finance): add controller and route registration for /api/finance/*"
```

---

## Task 9: Add Slice 1 to incremental cron tick

**Files:**
- Modify: `backend/src/modules/jobs/scheduler.ts`

> The Slice 0 orchestrator's `runIncrementalAll('shopify')` invokes every registered handler. We just need to ensure the cron tick calls it. The existing 15-min cron tick already handles orders/customers — we add a separate 15-min schedule for finance resources to keep them from interfering with each other in case of long bulk-op polls.

- [ ] **Step 9.1: Add finance sync schedule**

Open `backend/src/modules/jobs/scheduler.ts`. Find the existing Shopify cron block (e.g., `cron.schedule('*/15 * * * *', ...)`). Below it, add:

```typescript
import { runIncrementalAll } from '@modules/sync-orchestrator/sync-orchestrator.service';
import { SOURCE } from '@constant';

// ...

// Every 15 min — Phase 2 finance + future slice resources (Catalog, Marketing/Risk)
cron.schedule(
  '*/15 * * * *',
  async () => {
    logger.info('[Cron] Running orchestrator incremental for shopify...');
    try {
      const results = await runIncrementalAll(SOURCE.SHOPIFY);
      logger.info(`[Cron] Orchestrator synced ${results.length} resources`);
    } catch (err) {
      logger.error(`[Cron] Orchestrator failure: ${(err as Error).message}`);
    }
  },
  TZ,
);
```

> If `TZ` symbol is named differently in scheduler.ts (e.g., inline `{ timezone: 'Asia/Kolkata' }`), use whatever the existing pattern shows.

- [ ] **Step 9.2: Verify TypeScript compiles**

Run: `cd backend && npm run typecheck`
Expected: PASS.

- [ ] **Step 9.3: Commit**

```bash
git add backend/src/modules/jobs/scheduler.ts
git commit -m "feat(scheduler): add 15-min orchestrator tick for Phase 2 resources"
```

---

## Task 10: End-to-end backend verification

- [ ] **Step 10.1: Lint check**

Run: `cd backend && npm run lint`
Expected: 0 errors, 0 warnings.

If errors appear, fix them inline. Most common: unused imports, missing return types on exported functions. Do NOT use `eslint-disable`; fix the underlying issue.

- [ ] **Step 10.2: Start dev server**

Run: `cd backend && npm run dev`
Wait for `Server running on port 4000` and look for log line `[startup] registered finance handlers` (or equivalent — depends on whether you added a startup log to `registerFinanceResources`). No errors should appear.

- [ ] **Step 10.3: Verify orchestrator sees registered resources**

In another terminal, with admin JWT in `$TOKEN`:

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/sync/shopify/backfill?resource=locations"
```

Expected: HTTP 202.

Watch the dev server logs. Expected log lines:
- `[Backfill] Starting shopify:locations from 2023-01-01T00:00:00.000Z`
- `[Backfill] Completed shopify:locations — N records in Mms`

- [ ] **Step 10.4: Verify location data**

Run: `psql $DATABASE_URL -c "SELECT id, name, active FROM locations LIMIT 5"`
Expected: rows from your Shopify store (1+ location).

- [ ] **Step 10.5: Trigger payouts backfill**

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/sync/shopify/backfill?resource=payouts"
```

Wait for completion in logs. Then:

```bash
psql $DATABASE_URL -c "SELECT COUNT(*), MIN(payout_date), MAX(payout_date), SUM(amount) FROM payouts WHERE source='shopify'"
```

Expected: realistic count, date range from 2023 onward, total matches Shopify admin Payouts page.

- [ ] **Step 10.6: Trigger balance_transactions backfill**

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/sync/shopify/backfill?resource=balance_transactions"
```

Verify foreign-key linkage:

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM balance_transactions WHERE source='shopify' AND payout_id IS NOT NULL"
```

Expected: most rows have non-null `payout_id` (the linkBalanceTransactionsToPayouts join worked).

- [ ] **Step 10.7: Trigger refunds backfill (CAUTION: bulk operation, may take 30+ min)**

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/sync/shopify/backfill?resource=refunds"
```

This kicks off a Shopify Bulk Operation. Poll progress:

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/sync/cursors?source=shopify" | jq
```

Wait for `status: 'idle'` on the refunds row. Then:

```bash
psql $DATABASE_URL -c "SELECT COUNT(*), SUM(refund_amount) FROM orders_refunds WHERE source='shopify'"
```

Verify against Shopify admin Refunds page.

> If the bulk operation fails or returns unexpected JSONL shape, inspect the JSONL by saving its URL from the connector code (add a temporary `logger.info` of the URL) and `curl`ing it. Adjust the mapping in `refundsHandler.backfill`.

- [ ] **Step 10.8: Trigger transactions backfill**

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/sync/shopify/backfill?resource=transactions"
```

Wait for completion, then:

```bash
psql $DATABASE_URL -c "SELECT kind, COUNT(*), SUM(amount) FROM orders_transactions WHERE source='shopify' GROUP BY kind"
```

Expected: capture/sale rows summing close to gross_revenue from `shopify_orders`.

- [ ] **Step 10.9: Verify KPI endpoint returns sensible data**

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/finance/kpis?from=2024-01-01&to=2024-12-31" | jq
```

Expected JSON with non-zero `gross_revenue`, `net_revenue`, `payouts_received`, `refund_rate`. Sanity-check against Shopify admin Reports for the same date range.

- [ ] **Step 10.10: Verify payment-method-split**

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/finance/payment-method-split?from=2024-01-01&to=2024-12-31" | jq
```

Expected: cod + prepaid breakdown with realistic ratios for an Indian D2C jewelry brand (typical split varies).

- [ ] **Step 10.11: Verify payout detail endpoint**

```bash
PAYOUT_ID=$(psql $DATABASE_URL -t -c "SELECT id FROM payouts ORDER BY payout_date DESC LIMIT 1" | xargs)
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/finance/payouts/$PAYOUT_ID" | jq
```

Expected: payout row + array of balance_transactions whose net amounts sum to the payout amount.

- [ ] **Step 10.12: Verify incremental sync runs in cron**

Wait until the next `*/15 *` minute boundary. Watch logs for `[Cron] Running orchestrator incremental for shopify...` followed by per-resource completions.

Then:

```bash
psql $DATABASE_URL -c "SELECT resource, last_synced_at, status FROM sync_cursors WHERE source='shopify'"
```

Expected: all 5 finance resources show recent `last_synced_at`.

- [ ] **Step 10.13: Stop dev server**

Press Ctrl+C.

- [ ] **Step 10.14: Update PROGRESS.md**

Append to whichever PROGRESS.md exists:

```markdown
### 2026-04-26 — Shopify Phase 2 Slice 1A (Finance Backend)
**Built:**
- 5 new tables (locations, orders_refunds, orders_transactions, payouts, balance_transactions)
- 5 fetch methods on Shopify connector (incl. bulk-op for refunds/transactions)
- Source-agnostic mappers + repositories + handlers registered with orchestrator
- Finance service with KPI aggregator, revenue breakdown, payment-method split, refund summary
- 8 endpoints under /api/finance/*
- Slice 1 resources added to 15-min cron tick

**Files affected:**
- backend/src/db/migrations/20260426000010..14*.js (5 new)
- backend/src/db/models/{Location,OrderRefund,OrderTransaction,Payout,BalanceTransaction}.ts (5 new)
- backend/src/modules/shopify/shopify.connector.ts (modified)
- backend/src/modules/finance/* (new module: 11 files)
- backend/src/modules/jobs/scheduler.ts (modified)
- backend/src/routes/index.ts (modified)

**Decisions:**
- Bulk-op for refunds + transactions (3+ years of historical data); paginated for payouts/balance_tx/locations
- Net revenue formula: gross - discounts - refunds - tax - shipping
- balance_transactions.payout_id resolved via post-sync JOIN on (source, source_payout_id)

**Notes for Slice 1B (Frontend):**
- Backend types live in backend/src/modules/finance/finance.types.ts — frontend should mirror these as snake_case API types in src/types/finance-api.ts
- Currency: all values are INR; no conversion needed for Shayn
- All endpoints require JWT but no role gate (read-only — except /api/sync/* which requires ADMIN)
```

- [ ] **Step 10.15: Commit progress update**

```bash
git add .claude/PROGRESS.md backend/.claude/PROGRESS.md 2>/dev/null
git commit -m "docs(progress): record Shopify Phase 2 Slice 1A backend completion"
```

---

## Slice 1A Ship Gate

Confirm all of the following before declaring Slice 1A done:

- [ ] `cd backend && npm run typecheck` → no errors
- [ ] `cd backend && npm run lint` → no errors, no warnings
- [ ] All 5 migrations applied (`psql $DATABASE_URL -c "\dt"` lists them)
- [ ] Backfill of all 5 finance resources completed end-to-end (cursors all show `status='idle'`)
- [ ] `GET /api/finance/kpis` returns non-zero net_revenue for last full year
- [ ] `GET /api/finance/payouts/:id` returns payout + linked balance_transactions
- [ ] 15-min cron tick updates `sync_cursors.last_synced_at` for all finance resources
- [ ] No console.log added (use logger only)
- [ ] All commits pushed to feature branch (after user explicitly authorizes push — see git rules)

When all boxes ticked, Slice 1A is done. Slice 1B (Frontend) plan will be written next, referencing the actual response shapes from these endpoints.
