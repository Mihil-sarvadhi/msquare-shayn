# Top Navigation Bar — Design Spec

**Date:** 2026-04-20  
**Status:** Approved

## Goal

Replace the collapsible left sidebar and mobile drawer with a single horizontal top navigation bar that spans the full width of the app. Nav style matches the reference image: text tabs with an active gold underline.

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ★ SHAYN MIS │ Dashboard  Marketing  Customers  Operations  Reviews  │ ● ● ● ●  [Sync All] │
└─────────────────────────────────────────────────────────────────────┘
│                        Page content (full width)                     │
```

- **Left:** Logo (star icon + "SHAYN MIS" text)
- **Center:** Nav tabs — Dashboard, Marketing, Customers, Operations, Reviews
- **Right:** Connector health dots + Sync All button
- Active tab: gold underline (`#B8860B`) + bold/dark text
- Inactive tab: muted (`#8C7B64`), darkens on hover
- Mobile: tabs scroll horizontally, health dots hidden, Sync All visible

## Files Changed

| File | Action |
|------|--------|
| `src/components/layout/TopNav.tsx` | **Create** — logo + nav tabs + right-side controls |
| `src/components/layout/AppShell.tsx` | **Rewrite** — remove sidebar block, use TopNav, full-width layout |
| `src/pages/dashboard/components/Header.tsx` | **Edit** — remove SHAYN brand (now in TopNav); keep range selector, health dots, Sync All |
| `src/components/layout/Sidebar.tsx` | **Delete** |
| `src/components/layout/MobileHeader.tsx` | **Delete** |
| `src/contexts/SidebarContext.tsx` | **Delete** |

## TopNav Data

TopNav reads directly from Redux (`dashboardSlice`) — no props needed, no prop drilling through AppShell:

```typescript
const health = useAppSelector((s) => s.dashboard.health);
const isSyncing = useAppSelector((s) => s.dashboard.loading);
const dispatch = useAppDispatch();
```

Sync All dispatches `syncAll` thunk (already exists in dashboard). Health dots and Sync All are always visible regardless of active page. The dashboard page's `Header.tsx` retains only the date-range selector.

## Navigation Items

```typescript
const NAV = [
  { label: 'Dashboard',  to: '/dashboard'  },
  { label: 'Marketing',  to: '/marketing'  },
  { label: 'Customers',  to: '/customers'  },
  { label: 'Operations', to: '/operations' },
  { label: 'Reviews',    to: '/reviews'    },
];
```

Icons are dropped — tabs are text-only to match the reference image style.

## Active Tab Style

```
border-b-2 border-[#B8860B] text-[#1A1208] font-semibold
```

Inactive:
```
text-[#8C7B64] hover:text-[#1A1208] transition-colors
```

## What Does NOT Change

- All route definitions in `src/routes/route.tsx`
- Redux slices, API calls, business logic
- Dashboard range selector (stays in `Header.tsx`)
- Auth flow, role guards, protected routes

## Out of Scope

- Any page content changes
- Marketing / Customers / Operations / Reviews page headers (unchanged)
