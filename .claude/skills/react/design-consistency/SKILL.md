---
name: design-consistency
description: Ensure new pages and components follow the existing design system including color tokens, spacing scale, typography, icon conventions, animation patterns, responsive breakpoints, and reusable shared components
allowed tools: Read, Grep, Glob, Write, Edit
---

# Design Consistency Guide

When creating ANY new page or component, follow these design system rules to maintain visual consistency across the app.

## Color System (NEVER hardcode hex values)

| Purpose | Tailwind Classes | Hex |
|---------|-----------------|-----|
| Primary | `bg-indigo-500 text-indigo-600` | #6366F1 |
| Primary Light | `bg-indigo-50` | #EEF2FF |
| Success | `bg-green-50 text-green-600` | #4ADE80 |
| Warning | `bg-amber-50 text-amber-600` | #FBBF24 |
| Destructive | `bg-red-50 text-red-600` | #F87171 |
| Info | `bg-blue-50 text-blue-600` | #60A5FA |
| Muted text | `text-muted-foreground` | — |
| Borders | `border-gray-200` | #E5E7EB |
| Background | `bg-gray-50` | #F8F9FA |

**Status colors**: Always use `getStatusStyle()` from `@/utils/status-styles` — never manually compose bg/text color combos for statuses.

## Spacing Scale

### Container Padding
| Element | Classes |
|---------|---------|
| Page wrapper | `p-5` |
| Cards | `p-4` or `p-5` or `p-6` |
| Form fields | `px-3 py-2` |
| Badges/chips | `px-2.5 py-0.5` |
| Sidebar items | `px-3 py-2` |
| List items (general) | `px-4 py-3` |

### Gaps
| Context | Classes |
|---------|---------|
| Icon + text | `gap-2` |
| Sidebar items | `gap-2.5` |
| Filter bar items | `gap-3` |
| Section spacing | `mb-4` or `mb-6` |
| Vertical stacks | `space-y-1` to `space-y-4` |

### Buttons
| Size | Classes |
|------|---------|
| Default | `px-4 py-2` |
| Small | `px-3` |
| Large | `px-8` |
| Icon-only | `h-8 w-8 p-0` |

## Typography

| Usage | Classes |
|-------|---------|
| Page title | `text-lg font-semibold` |
| Section header | `text-sm font-semibold text-gray-900` |
| Table header | `uppercase tracking-wider text-xs text-muted-foreground/70` |
| Body text | `text-sm text-gray-600` |
| Muted/secondary | `text-sm text-muted-foreground` |
| Badge text | `text-xs font-medium` |
| Tiny label | `text-xs text-muted-foreground` |

## Icons (Lucide React ONLY)

**Always set `strokeWidth={1.5}`** — no exceptions.

| Size | Classes | Usage |
|------|---------|-------|
| Tiny | `h-3 w-3` | Inside badges, chevrons |
| Default | `h-4 w-4` | Buttons, list items |
| Medium | `h-5 w-5` | Headers, navigation |
| Large | `h-6 w-6` | Page icons, empty states |
| XL | `h-8 w-8` | Loading spinners, hero icons |

## Borders, Radius & Shadows

| Element | Classes |
|---------|---------|
| Default border | `border border-gray-200` |
| Separator | `border-b border-gray-200` |
| Cards | `rounded-lg shadow-sm border border-gray-200` |
| Buttons | `rounded-md` |
| Badges | `rounded-full` |
| Sidebar items | `rounded-xl` |
| Dropdowns | `rounded-md shadow-md` |
| Modals | `rounded-lg shadow-lg` |
| Input fields | `rounded-md border border-gray-200` |

## Responsive Breakpoints

| Breakpoint | Usage |
|------------|-------|
| `lg` (1024px) | Sidebar collapse/expand |
| `md` (768px) | Hide secondary table columns |
| `hidden lg:flex` | Show only on desktop |
| `hidden md:block` | Show from tablet up |

**Key dimensions**:
- TopBar height: `52px` (`h-[52px]`)
- Sidebar width: `220px` (expanded) / `64px` (collapsed)
- Page content: `flex-1` (fills remaining space)

## Reusable Components Checklist

**BEFORE creating any new component, check if one of these shared components already does what you need:**

| Need | Use This Component | Import From |
|------|--------------------|-------------|
| Empty state | `EmptyState` | `@/components/shared/EmptyState` |
| Full-page loading | `PageLoader` | `@/components/shared/PageLoader` |
| Inline spinner | `Loader2` | `lucide-react` (with `animate-spin`) |
| Error wrapper | `ErrorBoundary` | `@/components/shared/ErrorBoundary` |

## Page Layout Pattern (all pages MUST follow)

```tsx
<div className="flex-1 flex flex-col p-5">
  {/* Header: title + action buttons */}
  <div className="flex items-center justify-between mb-4">
    <h1 className="text-lg font-semibold">Page Title</h1>
    <Button>
      <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
      Add Item
    </Button>
  </div>

  {/* Filter bar: search + filters */}
  <div className="flex items-center gap-3 mb-4">
    {/* SearchInput + filter dropdowns */}
  </div>

  {/* Content: DataTable or card grid */}
  {isLoading ? (
    <PageLoader />
  ) : items.length === 0 ? (
    <EmptyState
      icon={FileText}
      title="No items found"
      description="Get started by creating your first item"
      actionLabel="Add Item"
      onAction={handleCreate}
    />
  ) : (
    /* DataTable or card grid */
    <div>Content here</div>
  )}

  {/* Dialogs rendered at bottom */}
  <ItemFormDialog open={isDialogOpen} onOpenChange={setDialogOpen} />
</div>
```

## Delete Confirmation Pattern

Use `AlertDialog` (not `Dialog`) for destructive confirmations:

```tsx
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete {Entity}?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        className="bg-red-600 hover:bg-red-700"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Design Token Sources

- CSS variables: `src/styles/globals.css`
- Tailwind config: `tailwind.config.ts`
- Status styles: `src/utils/status-styles.ts`
- Shared components: `src/components/shared/`
- UI primitives: `src/components/ui/`
