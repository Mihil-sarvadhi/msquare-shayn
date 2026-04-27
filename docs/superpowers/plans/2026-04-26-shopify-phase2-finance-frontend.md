# Shopify Phase 2 — Slice 1B (Finance Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Frontend for the Finance backend shipped in Plan 1A. Adds 4 KPI tiles to the existing dashboard, creates a dedicated `/finance` page with revenue charts + payouts table + refunds breakdown, and adds the "Finance" link to TopNav.

**Architecture:** Mirrors existing dashboard patterns. ONE `financeSlice` for aggregated KPIs/breakdown/summaries (uses `Promise.all` like dashboardSlice), separate `payoutsSlice` / `refundsSlice` / `transactionsSlice` for paginated lists. New `src/services/finance/finance.api.ts` using `baseService`. New `src/pages/finance/page.tsx` route at `/finance`. Reuses existing `KpiCard`, `PageLoader`, `DateRangePicker`, `rangeSlice`, `buildRangeParams`, `formatINR`, Recharts.

**Tech Stack:** React 19, Vite 7, Redux Toolkit, Tailwind 3.4, Recharts 2.10, Axios.

**Spec reference:** `docs/superpowers/specs/2026-04-26-shopify-phase2-expansion-design.md` Sections 5 (data shapes), 6.2 (endpoint contracts), 7.1 (UI requirements), 7.4 (cross-cutting frontend conventions).

**Prerequisite:** Slice 1A backend complete and accessible at `/api/finance/*`.

---

## File Structure

**Create:**
- `frontend/src/types/finance-api.ts` — snake_case API response types (mirroring backend `finance.types.ts`)
- `frontend/src/types/finance.ts` — camelCase app-level types
- `frontend/src/services/finance/finance.api.ts` — API client
- `frontend/src/store/slices/financeSlice.ts` — KPIs + breakdown + payment split + refunds summary
- `frontend/src/store/slices/payoutsSlice.ts` — paginated list + detail
- `frontend/src/store/slices/refundsSlice.ts` — paginated refunds list
- `frontend/src/store/slices/transactionsSlice.ts` — paginated tx list
- `frontend/src/pages/finance/page.tsx` — main /finance page
- `frontend/src/pages/finance/components/RevenueBreakdownChart.tsx`
- `frontend/src/pages/finance/components/PaymentMethodDonut.tsx`
- `frontend/src/pages/finance/components/PayoutsTable.tsx`
- `frontend/src/pages/finance/components/PayoutDetailModal.tsx`
- `frontend/src/pages/finance/components/RefundsTable.tsx`
- `frontend/src/pages/finance/components/RefundRateChart.tsx`

**Modify:**
- `frontend/src/utils/constants/api.constant.ts` — add `finance` namespace
- `frontend/src/store/rootReducer.ts` — register 4 new slices
- `frontend/src/routes/route.tsx` — register `/finance` route
- `frontend/src/components/layout/TopNav.tsx` — add Finance link
- `frontend/src/pages/dashboard/page.tsx` — add 4 new KPI tiles row at top

---

## Task 1: API endpoints constant + types

- [ ] **Step 1.1: Add finance namespace to API_ENDPOINTS**

`frontend/src/utils/constants/api.constant.ts` — extend the existing `API_ENDPOINTS` object, adding:

```typescript
finance: {
  kpis: '/finance/kpis',
  revenueBreakdown: '/finance/revenue-breakdown',
  paymentMethodSplit: '/finance/payment-method-split',
  payouts: '/finance/payouts',
  payoutDetail: (id: number | string) => `/finance/payouts/${id}`,
  refunds: '/finance/refunds',
  refundsSummary: '/finance/refunds/summary',
  transactions: '/finance/transactions',
},
```

- [ ] **Step 1.2: Create snake_case API types** at `frontend/src/types/finance-api.ts`:

```typescript
export interface FinanceKpisApi {
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

export interface RevenueBreakdownPointApi {
  date: string;
  gross: number;
  discounts: number;
  refunds: number;
  tax: number;
  net: number;
}

export interface PaymentMethodSplitApi {
  cod: { count: number; amount: number };
  prepaid: { count: number; amount: number };
  breakdown_by_gateway: { gateway: string; count: number; amount: number }[];
}

export interface RefundsSummaryApi {
  refund_rate_over_time: { date: string; rate: number }[];
  top_reasons: { reason: string; count: number; amount: number }[];
  refunds_by_sku: { sku: string; count: number; amount: number }[];
}

export interface PayoutSummaryApi {
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
}

export interface BalanceTransactionApi {
  id: number;
  type: string;
  amount: number;
  fee: number | null;
  net: number | null;
  processed_at: string | null;
  transaction_id: string | null;
}

export interface PayoutDetailApi {
  payout: PayoutSummaryApi;
  balance_transactions: BalanceTransactionApi[];
}

export interface RefundRowApi {
  id: number;
  source_refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_currency: string;
  reason: string | null;
  refunded_at: string;
  restocked: boolean;
}

export interface TxRowApi {
  id: number;
  source_transaction_id: string;
  order_id: string;
  kind: string;
  status: string;
  gateway: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  processed_at: string | null;
}

export interface PaginationApi {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponseApi<T> {
  data: T[];
  pagination: PaginationApi;
}
```

- [ ] **Step 1.3: Lint + commit**

Run: `cd frontend && npm run lint 2>&1 | tail -10`. Then commit: `git add frontend/src/utils/constants/api.constant.ts frontend/src/types/finance-api.ts && git commit -m "feat(finance-fe): add API endpoints + types"`.

---

## Task 2: API service

- [ ] **Step 2.1: Create finance.api.ts** at `frontend/src/services/finance/finance.api.ts`. Follow the existing `dashboard.api.ts` style (use `baseService` directly, not `apiService` wrapper, because backend wraps responses in `{success, data, pagination}`):

```typescript
import baseService from '@/services/configs/baseService';
import { API_ENDPOINTS } from '@/utils/constants/api.constant';
import type {
  FinanceKpisApi,
  PaginatedResponseApi,
  PaymentMethodSplitApi,
  PayoutDetailApi,
  PayoutSummaryApi,
  RefundRowApi,
  RefundsSummaryApi,
  RevenueBreakdownPointApi,
  TxRowApi,
} from '@/types/finance-api';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  pagination?: { page: number; limit: number; total: number };
  message?: string;
}

interface RangeParams {
  from: string;
  to: string;
}

interface PaginatedParams extends RangeParams {
  page?: number;
  limit?: number;
}

export const financeApi = {
  getKpis: (params: RangeParams) =>
    baseService
      .get<ApiEnvelope<FinanceKpisApi>>(API_ENDPOINTS.finance.kpis, { params })
      .then((r) => r.data.data),

  getRevenueBreakdown: (params: RangeParams & { group_by: 'day' | 'week' | 'month' }) =>
    baseService
      .get<ApiEnvelope<RevenueBreakdownPointApi[]>>(API_ENDPOINTS.finance.revenueBreakdown, {
        params,
      })
      .then((r) => r.data.data),

  getPaymentMethodSplit: (params: RangeParams) =>
    baseService
      .get<ApiEnvelope<PaymentMethodSplitApi>>(API_ENDPOINTS.finance.paymentMethodSplit, {
        params,
      })
      .then((r) => r.data.data),

  listPayouts: (params: PaginatedParams & { status?: string }) =>
    baseService
      .get<ApiEnvelope<PayoutSummaryApi[]>>(API_ENDPOINTS.finance.payouts, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),

  getPayoutDetail: (id: number) =>
    baseService
      .get<ApiEnvelope<PayoutDetailApi>>(API_ENDPOINTS.finance.payoutDetail(id))
      .then((r) => r.data.data),

  listRefunds: (params: PaginatedParams & { reason?: string }) =>
    baseService
      .get<ApiEnvelope<RefundRowApi[]>>(API_ENDPOINTS.finance.refunds, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),

  getRefundsSummary: (params: RangeParams) =>
    baseService
      .get<ApiEnvelope<RefundsSummaryApi>>(API_ENDPOINTS.finance.refundsSummary, { params })
      .then((r) => r.data.data),

  listTransactions: (params: PaginatedParams & { gateway?: string; kind?: string }) =>
    baseService
      .get<ApiEnvelope<TxRowApi[]>>(API_ENDPOINTS.finance.transactions, { params })
      .then((r) => ({ rows: r.data.data, pagination: r.data.pagination })),
};
```

- [ ] **Step 2.2: Lint + commit**

---

## Task 3: Redux slices

Follow the existing `dashboardSlice.ts` pattern: `createAsyncThunk` + `extraReducers` with `pending/fulfilled/rejected`.

- [ ] **Step 3.1: financeSlice.ts** — combined thunk fetching kpis + breakdown + payment-split + refunds-summary in `Promise.all`. State shape: `{ kpis, breakdown, paymentSplit, refundsSummary, isLoading, error }`. Default export the reducer.

- [ ] **Step 3.2: payoutsSlice.ts** — thunks: `fetchPayouts(params)`, `fetchPayoutDetail(id)`. State: `{ rows, pagination, detail, isLoading, isError, isLoadingDetail }`.

- [ ] **Step 3.3: refundsSlice.ts** — thunks: `fetchRefunds(params)`. State: `{ rows, pagination, isLoading, isError }`.

- [ ] **Step 3.4: transactionsSlice.ts** — thunks: `fetchTransactions(params)`. State: `{ rows, pagination, isLoading, isError }`.

- [ ] **Step 3.5: Register all 4 in rootReducer.ts**

- [ ] **Step 3.6: Lint + commit**

---

## Task 4: Dashboard KPI tiles (4 new tiles)

- [ ] **Step 4.1: Edit `frontend/src/pages/dashboard/page.tsx`** — add a new top KPI row showing 4 tiles: True Net Revenue, Cash Received (Payouts), Shopify Fees %, Refund Rate. Dispatch `fetchFinanceOverview` on mount with current rangeSlice values. Use existing `KpiCard` component. Use `formatINR` for money values.

- [ ] **Step 4.2: Lint + commit**

---

## Task 5: Finance page

- [ ] **Step 5.1: Create `frontend/src/pages/finance/page.tsx`** — exports `FinancePage`. Layout:
  - Header: page title + `DateRangePicker` (reuse existing component)
  - Row 1 (6 KPI tiles): Gross Revenue, Discounts, Tax, Shipping, Refunds, Net Revenue (prominent)
  - Row 2: `<RevenueBreakdownChart />` (full width) + `<PaymentMethodDonut />` (right side, 1/3 width)
  - Row 3: `<PayoutsTable />`
  - Row 4: `<RefundRateChart />` + `<RefundsTable />`
  - Loading: `PageLoader` while initial fetch
  - Error: standard error block matching dashboard's pattern

- [ ] **Step 5.2: Create RevenueBreakdownChart.tsx** — Recharts stacked bar, x=date, stacked: gross, discounts, refunds, tax, net. Tooltip uses `formatINR`.

- [ ] **Step 5.3: Create PaymentMethodDonut.tsx** — Recharts PieChart showing COD vs Prepaid totals + by-gateway breakdown table below.

- [ ] **Step 5.4: Create PayoutsTable.tsx** — paginated table, columns: payout_date, status, amount, fees, click row to open `<PayoutDetailModal />`.

- [ ] **Step 5.5: Create PayoutDetailModal.tsx** — fetches `getPayoutDetail(id)` on open, shows payout summary + balance_transactions table.

- [ ] **Step 5.6: Create RefundsTable.tsx** — paginated, columns: refunded_at, order_id, amount, reason.

- [ ] **Step 5.7: Create RefundRateChart.tsx** — Recharts LineChart of refund_rate_over_time + tabular top reasons + top SKUs.

- [ ] **Step 5.8: Lint + commit each subcomponent in batches**

---

## Task 6: Routing + TopNav

- [ ] **Step 6.1: Register `/finance` route in `frontend/src/routes/route.tsx`** — lazy-loaded, wrapped with ProtectedRoute matching dashboard's pattern.

- [ ] **Step 6.2: Add "Finance" entry to NAV array in `frontend/src/components/layout/TopNav.tsx`** — between "Dashboard" and "Marketing".

- [ ] **Step 6.3: Lint + commit**

---

## Task 7: Build verification

- [ ] **Step 7.1: `cd frontend && npm run build`** — must pass with 0 errors.

- [ ] **Step 7.2: `cd frontend && npm run lint`** — must pass with 0 warnings.

- [ ] **Step 7.3: Browser smoke test**

  Start dev server, navigate to `/finance`, verify:
  - Date range picker loads + changing range refetches
  - KPI tiles render with non-zero values
  - Revenue breakdown chart renders
  - Payment method donut renders
  - Payouts table paginates; clicking opens detail modal with linked balance_transactions
  - Refunds table paginates; refund rate chart renders

  Note: requires Slice 1A backfill to have completed so data exists.

- [ ] **Step 7.4: Final commit + push to remote (after explicit user approval)**

---

## Slice 1B Ship Gate

- [ ] `npm run lint` passes (0 warnings)
- [ ] `npm run build` passes
- [ ] `/finance` page loads in browser without console errors
- [ ] All 4 dashboard KPI tiles render real numbers
- [ ] Payouts table click-through to detail modal works
- [ ] No `console.log` left in code
