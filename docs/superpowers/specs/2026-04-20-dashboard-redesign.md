# Dashboard Redesign — Design Spec

**Date:** 2026-04-20
**Status:** Approved

## Goal

Restructure the dashboard card layout based on business-priority order, and replace the per-page "All Time" filter with a global custom date range picker in the TopNav.

---

## Part 1 — Dashboard Layout Restructuring

### Rationale (First-Principles)

A D2C jewelry brand manager opens the dashboard to answer three questions in order:
1. **How much are we making?** → Revenue KPIs
2. **Is our marketing working?** → Campaign + funnel performance
3. **Are orders being fulfilled cleanly?** → Logistics, RTO, COD

Reviews and product tables are reference data — important but not urgent on arrival. They move to the bottom.

### New Card Order

| Row | Cards | Grid | Change |
|-----|-------|------|--------|
| 1 | Total Revenue · Total Orders · AOV · Ad Spend · ROAS · RTO Rate | `lg:grid-cols-6` | Unchanged |
| 2 | Revenue Trend (2/3) · Meta Ads Funnel (1/3) | `lg:grid-cols-3` | Unchanged |
| 3 | Meta Campaigns Performance (2/3) · Order Status (1/3) | `lg:grid-cols-3` | **Campaigns moved up from row 5** |
| 4 | COD vs Prepaid · Logistics Overview · Abandoned Carts | `lg:grid-cols-3` | Restructured from row 3 |
| 5 | Customer Metrics · Orders by Platform · Top 5 Products | `lg:grid-cols-3` | Restructured from rows 3+4 |
| 6 | Review Summary (1/4) · Top Rated Products (1/4) · Recent Reviews (2/4) | `lg:grid-cols-4` | Consolidated from rows 4+5 |
| 7 | Top 10 SKUs (2/3) · Connector Status (1/3) | `lg:grid-cols-3` | Connector Status moved to bottom |

### Files Changed

| File | Action |
|------|--------|
| `frontend/src/pages/dashboard/page.tsx` | **Edit** — reorder grid sections to match new row order; remove `<Header>` import and usage |
| `frontend/src/pages/dashboard/components/Header.tsx` | **Delete** — range selector moves to TopNav; sub-header no longer needed |

---

## Part 2 — Global Date Range Filter

### User-Facing Behaviour

The range selector lives in `TopNav` — one control, all pages.

**Buttons:** `7 Days` | `30 Days` | `📅 Custom`

- `7 Days` / `30 Days` — work exactly as today (no change)
- `Custom` — opens a popover below the button with:
  - **From** date input (`<input type="date">`)
  - **To** date input (`<input type="date">`)
  - **Apply** button (disabled until both dates are filled and `from ≤ to`)
  - Once applied, button label changes to `📅 Apr 01 → Apr 20`
- Changing from Custom back to 7d/30d clears the custom dates

### Redux State

**New slice:** `frontend/src/store/slices/rangeSlice.ts`

```typescript
interface RangeState {
  preset: '7d' | '30d' | 'custom';
  startDate: string; // ISO date 'YYYY-MM-DD', empty string when not custom
  endDate: string;   // ISO date 'YYYY-MM-DD', empty string when not custom
}

const initialState: RangeState = { preset: '30d', startDate: '', endDate: '' };

// Actions:
// setPreset(preset: '7d' | '30d') — clears startDate/endDate
// setCustomRange({ startDate, endDate }) — sets preset to 'custom'
```

**dashboardSlice:** Remove `range` field. All date-range logic reads from `rangeSlice`.

**analyticsSlice:** Remove `range` field. All date-range logic reads from `rangeSlice`.

Both slices' `fetchDashboard` and `fetchAnalytics` thunks are updated to accept `RangeState` instead of a plain `range: string`. Pages read `rangeSlice` state and pass the full object when dispatching.

`useRefetchDashboard` in `dashboard.query.ts` currently reads `s.dashboard.range` — it must be updated to read from `s.range` (`rangeSlice`) and pass the full `RangeState` to `fetchDashboard`.

### API Call Changes

**Helper:** `frontend/src/utils/common-functions/buildRangeParams.ts`

```typescript
export function buildRangeParams(range: RangeState): Record<string, string> {
  if (range.preset === 'custom') {
    return { startDate: range.startDate, endDate: range.endDate };
  }
  return { range: range.preset }; // '7d' or '30d'
}
```

Used in both `dashboard.api.ts` and `analytics.api.ts` — replaces the hardcoded `{ range }` param.

### Frontend Files Changed

| File | Action |
|------|--------|
| `frontend/src/store/slices/rangeSlice.ts` | **Create** — shared range state |
| `frontend/src/store/rootReducer.ts` | **Edit** — register `rangeSlice` |
| `frontend/src/store/slices/dashboardSlice.ts` | **Edit** — remove `range` field; thunk reads from `rangeSlice` |
| `frontend/src/store/slices/analyticsSlice.ts` | **Edit** — remove `range` field; thunk reads from `rangeSlice` |
| `frontend/src/components/layout/TopNav.tsx` | **Edit** — add range selector + custom date popover |
| `frontend/src/utils/common-functions/buildRangeParams.ts` | **Create** — converts `RangeState` → query params |
| `frontend/src/services/dashboard/dashboard.api.ts` | **Edit** — use `buildRangeParams` |
| `frontend/src/services/analytics/analytics.api.ts` | **Edit** — use `buildRangeParams` |
| `frontend/src/pages/analytics/AnalyticsHeader.tsx` | **Edit** — remove range selector buttons and `setAnalyticsRange` dispatch; keep sticky `title` + `subtitle` heading block |
| `frontend/src/services/dashboard/dashboard.query.ts` | **Edit** — `useRefetchDashboard` reads from `rangeSlice` (`s.range`) instead of `s.dashboard.range` |
| `frontend/src/pages/dashboard/page.tsx` | **Edit** — remove `handleRangeChange` and range-related dispatch |
| `frontend/src/pages/marketing/page.tsx` | **Edit** — remove local range dispatch; read from `rangeSlice` |
| `frontend/src/pages/customers/page.tsx` | **Edit** — same |
| `frontend/src/pages/operations/page.tsx` | **Edit** — same |

### Backend Files Changed

**New util:** `backend/src/utils/resolveDateRange.ts`

```typescript
interface DateRangeQuery {
  range?: string;
  startDate?: string;
  endDate?: string;
}

interface DateRange {
  since: string;
  until: string;
}

export function resolveDateRange(query: DateRangeQuery): DateRange {
  const today = new Date().toISOString().split('T')[0];

  // Custom date range takes priority
  if (query.startDate && query.endDate) {
    if (query.startDate > query.endDate) {
      throw new AppError({ errorType: ERROR_TYPES.VALIDATION, message: 'startDate must be before endDate', code: 'INVALID_DATE_RANGE' });
    }
    return { since: query.startDate, until: query.endDate };
  }

  // Preset ranges
  const end = new Date();
  const start = new Date();
  if (query.range === '7d') start.setDate(start.getDate() - 7);
  else if (query.range === 'all') return { since: '2020-01-01', until: today };
  else start.setDate(start.getDate() - 30); // default: 30d

  return {
    since: start.toISOString().split('T')[0],
    until: today,
  };
}
```

This replaces the duplicated `getDateRange()` functions in both services.

| File | Action |
|------|--------|
| `backend/src/utils/resolveDateRange.ts` | **Create** — single source of truth for date range resolution |
| `backend/src/modules/dashboard/dashboard.service.ts` | **Edit** — delete `getDateRange()`, import and use `resolveDateRange` |
| `backend/src/modules/analytics/analytics.service.ts` | **Edit** — delete `getDateRange()`, import and use `resolveDateRange` |
| `backend/src/modules/dashboard/dashboard.controller.ts` | **Edit** — pass full `req.query` (with `startDate`/`endDate`) to service |
| `backend/src/modules/analytics/analytics.controller.ts` | **Edit** — same |

**No changes to repository files** — they already accept `(since: string, until: string)` and execute raw SQL with named replacements. The `resolveDateRange` util handles the conversion upstream.

---

## Out of Scope

- Reviews page layout (unchanged)
- Any new API endpoints
- Changing existing API paths
- Connector Status card content or styling
- Adding date validation on frontend inputs beyond `from ≤ to`
