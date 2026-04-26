---
name: design-system
description: Complete portable design system — color tokens, typography scale, spacing system, icon rules, animation library, component anatomy, layout patterns, responsive strategy, interactive states, form patterns, detail view architecture, and visual hierarchy rules. Use this skill when building any new product UI to replicate the project design language.
allowed tools: Read, Grep, Glob, Write, Edit
---

# Design System — Portable Reference

> This document captures the complete visual language of the product. Apply these rules to any React + Tailwind CSS project to achieve the same professional, clean, information-dense UI.

---

## 1. Design Philosophy

- **Clean & Professional**: Minimal chrome, maximum content density
- **Soft & Approachable**: Rounded corners, subtle shadows, muted borders — never harsh
- **Information-Dense**: Compact layouts that show more data without feeling cramped
- **Consistent Rhythm**: Predictable spacing, sizing, and color patterns throughout
- **Motion with Purpose**: Animations enhance feedback, never distract

---

## 2. Color System

### 2.1 Core Palette (CSS Variables)

Define these in `:root` inside `@layer base`. Use RGB triplets for alpha-value support:

```css
@layer base {
  :root {
    /* Background & Foreground */
    --background: 248 249 250;          /* #F8F9FA — Cool off-white page bg */
    --foreground: 55 65 81;             /* #374151 — Gray 700 body text */

    /* Primary (Indigo) */
    --primary: 99 102 241;              /* #6366F1 — Indigo 500, brand color */
    --primary-foreground: 255 255 255;  /* White text on primary */
    --primary-light: 238 242 255;       /* #EEF2FF — Indigo 50, light bg */

    /* Muted (Neutral) */
    --muted: 243 244 246;              /* #F3F4F6 — Gray 100 */
    --muted-foreground: 107 114 128;   /* #6B7280 — Gray 500 */

    /* Border */
    --border: 229 231 235;             /* #E5E7EB — Gray 200 */

    /* Accent */
    --accent: 243 244 246;             /* #F3F4F6 — Gray 100 */
    --accent-foreground: 55 65 81;     /* #374151 — Gray 700 */

    /* Cards & Surfaces */
    --card: 255 255 255;               /* Pure white */
    --card-foreground: 55 65 81;       /* Gray 700 */
    --sidebar-bg: 255 255 255;         /* Pure white */

    /* Semantic: Destructive (Red) */
    --destructive: 248 113 113;        /* #F87171 — Red 400 */
    --destructive-foreground: 255 255 255;
    --destructive-light: 254 226 226;  /* #FEE2E2 — Red 100 */

    /* Semantic: Success (Green) */
    --success: 74 222 128;             /* #4ADE80 — Green 400 */
    --success-light: 220 252 231;      /* #DCFCE7 — Green 100 */

    /* Semantic: Warning (Amber) */
    --warning: 251 191 36;             /* #FBBF24 — Amber 400 */
    --warning-light: 254 243 199;      /* #FEF3C7 — Amber 100 */

    /* Semantic: Info (Blue) */
    --info: 96 165 250;                /* #60A5FA — Blue 400 */
    --info-light: 219 234 254;         /* #DBEAFE — Blue 100 */

    /* Border Radius */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-2xl: 24px;

    /* Shadows — Deliberately soft (low opacity) */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.03);
    --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.04);
    --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.06);
    --shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.08);

    /* Layout */
    --topbar-height: 52px;
    --sidebar-width: 220px;
    --sidebar-collapsed-width: 64px;
  }
}
```

### 2.2 Global Resets

```css
body {
  @apply bg-background text-foreground antialiased;
  font-feature-settings: "cv11", "ss01";  /* OpenType features for cleaner glyphs */
}

* {
  @apply border-border;  /* Default border color for all elements */
}
```

### 2.3 Color Usage Rules

| Purpose | Tailwind Classes | When to Use |
|---------|-----------------|-------------|
| Primary action | `bg-indigo-600 hover:bg-indigo-700 text-white` | Buttons, CTAs |
| Primary subtle | `bg-indigo-50 text-indigo-600` | Active states, selected items |
| Primary ring | `ring-1 ring-indigo-200/50` | Icon containers, focus |
| Success | `bg-green-50 text-green-600 border-green-200` | Completed, present, positive |
| Warning | `bg-amber-50 text-amber-600 border-amber-200` | In progress, attention needed |
| Destructive | `bg-red-50 text-red-600 border-red-200` | Errors, delete, absent |
| Info | `bg-blue-50 text-blue-600 border-blue-200` | Informational, scheduled |
| Neutral badge | `bg-gray-100 text-gray-600` | Default/inactive states |
| Muted text | `text-muted-foreground` | Secondary information |
| Dimmed text | `text-muted-foreground/60` | Tertiary, least important |
| Borders | `border-gray-200` or `border-border` | Standard dividers |
| Subtle borders | `border-border/50` or `border-border/60` | Soft separation |

### 2.4 Opacity Patterns

```
Hover backgrounds:   hover:bg-muted/50, hover:bg-indigo-50/50
Border muting:       border-border/50, border-border/60, border-border/40
Text muting:         text-muted-foreground/60, text-muted-foreground/70
Ring opacity:        ring-indigo-200/50, ring-black/5
Disabled:            disabled:opacity-50
Group reveal:        opacity-0 group-hover:opacity-100 transition-opacity
```

### 2.5 Status Badge Color Pattern

Every status uses the **light bg + darker text + translucent border** pattern:

```
Status      → bg-{color}-50    text-{color}-600    border-{color}-200
Scheduled   → bg-blue-50       text-blue-700       border-blue-200
In Progress → bg-green-50      text-green-700      border-green-200
Pending     → bg-amber-50      text-amber-700      border-amber-200
Completed   → bg-gray-50       text-gray-600        border-gray-200
Cancelled   → bg-red-50        text-red-700         border-red-200
Special     → bg-purple-50     text-purple-700      border-purple-200
```

### 2.6 Dynamic API Color Support

When backend sends hex colors, convert to badge styles:

```typescript
function hexToBadgeStyle(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,   // 10% opacity bg
    color: hex,                                         // Full color text
    borderColor: `rgba(${r}, ${g}, ${b}, 0.2)`,        // 20% opacity border
  };
}
```

---

## 3. Typography

### 3.1 Type Scale

| Level | Classes | Usage |
|-------|---------|-------|
| Page title (large) | `text-2xl font-semibold` | Greeting headers, hero text |
| Page title | `text-lg font-semibold` | Standard page headers |
| Dialog title | `text-base font-semibold leading-snug` | Modal headers |
| Card title | `text-sm font-medium` or `text-[13px] font-semibold` | Card names |
| Section header | `text-[11px] font-bold uppercase tracking-wider` | Section labels |
| Table header | `text-xs uppercase tracking-wider text-muted-foreground/70` | Column headers |
| Body text | `text-sm` | Standard content |
| Small body | `text-xs` | Metadata, badges, labels |
| Tiny text | `text-[10px]` | Ultra-compact badges, counts |
| Micro text | `text-[9px]` | Avatar initials, minimal labels |

### 3.2 Font Weights

| Weight | Tailwind | Usage |
|--------|----------|-------|
| Regular (400) | (default) | Body text |
| Medium (500) | `font-medium` | Badges, buttons, labels |
| Semibold (600) | `font-semibold` | Headers, important labels |
| Bold (700) | `font-bold` | Section titles, stat values |

### 3.3 Text Utilities

```
tracking-wider    — Letter spacing for uppercase labels
tracking-wide     — Moderate spacing for small caps
tabular-nums      — Monospaced numbers (time, IDs, stats)
truncate          — Single-line ellipsis overflow
line-clamp-2      — Multi-line truncate (2 lines)
leading-tight     — Compact line height (headings)
leading-snug      — Slightly compact (dialog titles)
leading-relaxed   — Loose line height (markdown content)
```

### 3.4 Text Color Hierarchy

```
Level 1 (Primary):    text-foreground          — Main content, titles
Level 2 (Secondary):  text-muted-foreground    — Supporting text, labels
Level 3 (Tertiary):   text-muted-foreground/60 — Least important, hints
Level 4 (Inverted):   text-white               — On colored backgrounds
Level 5 (Active):     text-indigo-600          — Selected, active, links
```

---

## 4. Spacing System

### 4.1 Gap Scale (between sibling elements)

| Gap | Value | Usage |
|-----|-------|-------|
| `gap-0.5` | 2px | Minimal (icon pairs) |
| `gap-1` | 4px | Tight (icon + text in badges) |
| `gap-1.5` | 6px | Standard tight (icon + text pairs) |
| `gap-2` | 8px | Standard/default (most common) |
| `gap-2.5` | 10px | Medium (sidebar items) |
| `gap-3` | 12px | Larger (filter bars, card headers) |
| `gap-4` | 16px | Large (section spacing) |
| `gap-5` | 20px | Extra large (two-column form grids) |

### 4.2 Padding Scale

| Element | Horizontal | Vertical | Combined |
|---------|-----------|----------|----------|
| Badge/chip (xs) | `px-1.5` | `py-0.5` | `px-1.5 py-0.5` |
| Badge/chip (sm) | `px-2` | `py-0.5` | `px-2 py-0.5` |
| Badge/chip (md) | `px-2.5` | `py-0.5` | `px-2.5 py-0.5` |
| Sidebar item | `px-3` | `py-2` | `px-3 py-2` |
| Card (compact) | `px-3` | `py-3` | `p-3` |
| Card (standard) | `px-4` | `py-4` | `p-4` |
| Dialog header | `px-5` or `px-6` | `py-3.5` | — |
| Dialog body | `px-5` or `px-6` | `py-4` | — |
| Dialog footer | `px-5` or `px-6` | `py-3` | — |
| Page wrapper | — | — | `p-5` |
| Stat card | — | — | `p-3.5` |

### 4.3 Margin Patterns

- Prefer `gap` over `margin` for sibling spacing
- Section bottom spacing: `mb-4` (standard), `mb-6` (large sections)
- Small bottom spacing: `mb-1`, `mb-2`
- Top margin after borders: `mt-1.5`, `pt-2`, `pt-3`

---

## 5. Icons

### 5.1 Rules

- **Library**: Lucide React (exclusively)
- **Stroke width**: ALWAYS `strokeWidth={1.5}` — no exceptions
- **Sizing**: Use Tailwind classes, not `size` prop

### 5.2 Size Scale

| Size | Classes | Usage |
|------|---------|-------|
| Dot | `h-2 w-2`, `h-2.5 w-2.5` | Status dots, indicators |
| Tiny | `h-3 w-3` | Inside badges, chevrons, breadcrumbs |
| Small | `h-3.5 w-3.5` | Compact buttons, inline actions |
| Default | `h-4 w-4` | Standard buttons, list items (most common) |
| Medium | `h-5 w-5` | Headers, navigation |
| Large | `h-6 w-6` | Page icons, empty state secondary |
| XL | `h-8 w-8` | Empty state primary, hero icons |

### 5.3 Icon Containers

Icons in headers/badges are wrapped in colored containers:

```
Small:   h-6 w-6  rounded-md   flex items-center justify-center
Medium:  h-8 w-8  rounded-lg   flex items-center justify-center bg-indigo-50
Large:   h-9 w-9  rounded-xl   flex items-center justify-center bg-indigo-50
XL:      h-10 w-10 rounded-xl  flex items-center justify-center bg-indigo-50
Empty:   h-16 w-16 rounded-full flex items-center justify-center bg-indigo-50
```

With ring: add `ring-1 ring-indigo-200/50`

### 5.4 Icon Colors

```
Default:     text-muted-foreground
Active:      text-indigo-500, text-indigo-600
Success:     text-green-600
Warning:     text-amber-600
Error:       text-red-600
On primary:  text-white
```

---

## 6. Borders, Radius & Shadows

### 6.1 Border Radius

| Element | Classes | Pixels |
|---------|---------|--------|
| Pill/badge | `rounded-full` | Fully rounded |
| Card/dialog | `rounded-xl` | 16px |
| Sidebar item | `rounded-xl` | 16px |
| Stat card | `rounded-2xl` | 24px |
| Standard card | `rounded-lg` | 12px |
| Button | `rounded-md` | 8px |
| Input | `rounded-md` | 8px |
| Small element | `rounded` | 4px |
| Icon container (sm) | `rounded-md` | 8px |
| Icon container (md) | `rounded-lg` | 12px |
| Icon container (lg) | `rounded-xl` | 16px |

### 6.2 Border Patterns

```
Standard:         border border-gray-200
Card:             border border-gray-100
Subtle:           border border-border/50
Section divider:  border-b border-gray-200
Footer border:    border-t border-border
Left accent:      border-l-2 border-l-indigo-500
Status ring:      ring-1 ring-{color}-200/50
Focus ring:       ring-2 ring-indigo-500/10
```

### 6.3 Shadow Usage

| Element | Shadow |
|---------|--------|
| Page cards | `shadow-sm` or none |
| Hover elevation | `hover:shadow-sm` or `hover:shadow-md` |
| Dropdowns/popovers | `shadow-md` or `shadow-lg` |
| Dialogs/modals | `shadow-lg` |
| Toasts | `shadow-[var(--shadow-lg)]` |
| Floating buttons | `shadow-sm` |

**Key rule**: Shadows are very subtle (0.03-0.08 opacity). Never use harsh shadows.

---

## 7. Interactive States

### 7.1 Hover

```
Text:        hover:text-foreground (from muted)
Background:  hover:bg-muted, hover:bg-accent, hover:bg-gray-100
Color:       hover:bg-indigo-50 hover:text-indigo-600
Card:        hover:border-indigo-200 hover:shadow-sm
Opacity:     hover:opacity-80 (on colored elements)
Scale:       hover:scale-[1.04] (special buttons only)
```

### 7.2 Focus

```
Standard:    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
Input:       focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10
Container:   focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10
```

### 7.3 Active/Selected

```
Nav item:     bg-gray-100 text-foreground font-medium
Tab:          border-b-2 border-indigo-500 (or border-indigo-600)
Selected:     bg-indigo-600 text-white font-semibold
Active badge: bg-indigo-100 text-indigo-600
```

### 7.4 Disabled

```
Overall:     disabled:pointer-events-none disabled:opacity-50
Cursor:      disabled:cursor-not-allowed
```

### 7.5 Group Hover (reveal on parent hover)

```
Pattern:     opacity-0 group-hover:opacity-100 transition-opacity
Usage:       Action buttons, edit icons, delete buttons that appear on row/card hover
```

---

## 8. Animation Library

### 8.1 CSS Transitions (Tailwind)

| Class | Duration | Usage |
|-------|----------|-------|
| `transition-colors` | 150ms | All interactive color changes |
| `transition-opacity` | 150ms | Fade in/out |
| `transition-all duration-200` | 200ms | Multi-property changes |
| `transition-all duration-300 ease-in-out` | 300ms | Sidebar collapse, accordion |

### 8.2 Keyframe Animations (Tailwind Config)

```javascript
keyframes: {
  "icon-pop": {
    "0%":   { transform: "scale(0.6) rotate(-8deg)", opacity: "0" },
    "60%":  { transform: "scale(1.08) rotate(2deg)", opacity: "1" },
    "100%": { transform: "scale(1) rotate(0)", opacity: "1" },
  },
  "check-bounce": {
    "0%":   { transform: "scale(0)" },
    "50%":  { transform: "scale(1.2)" },
    "100%": { transform: "scale(1)" },
  },
  "content-in": {
    "0%":   { opacity: "0", transform: "translateY(12px)" },
    "100%": { opacity: "1", transform: "translateY(0)" },
  },
  "dot-active": {
    "0%":   { transform: "scale(0.6)" },
    "60%":  { transform: "scale(1.15)" },
    "100%": { transform: "scale(1)" },
  },
  "float-slow": {
    "0%, 100%": { transform: "translateY(0) scale(1)" },
    "50%":      { transform: "translateY(-8px) scale(1.03)" },
  },
  "shimmer": {
    "0%":   { backgroundPosition: "-200% 0" },
    "100%": { backgroundPosition: "200% 0" },
  },
  "confetti-pop": {
    "0%":   { transform: "scale(0) rotate(0)", opacity: "0" },
    "40%":  { transform: "scale(1.3) rotate(15deg)", opacity: "1" },
    "60%":  { transform: "scale(0.95) rotate(-5deg)" },
    "100%": { transform: "scale(1) rotate(0)", opacity: "1" },
  },
  "badge-pulse": {
    "0%, 100%": { opacity: "1", transform: "scale(1)" },
    "50%":      { opacity: "0.8", transform: "scale(1.1)" },
  },
},
animation: {
  "icon-pop":      "icon-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
  "check-bounce":  "check-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
  "content-in":    "content-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  "dot-active":    "dot-active 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
  "float-slow":    "float-slow 4s ease-in-out infinite",
  "shimmer":       "shimmer 2s linear infinite",
  "confetti-pop":  "confetti-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
  "badge-pulse":   "badge-pulse 2s ease-in-out infinite",
},
```

### 8.3 CSS Keyframe Animations (globals.css)

**Entrance animations:**
```css
/* Tile/card entrance — scale + slide up */
@keyframes tile-enter {
  from { opacity: 0; transform: scale(0.92) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.tile-enter { animation: tile-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }

/* Slide from right */
@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
}
.slide-in-right { animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

/* Subtle fade up */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1); }

/* Icon pop with bounce overshoot */
@keyframes icon-pop {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}
.icon-pop { animation: icon-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
```

**Continuous animations:**
```css
/* Pulsing glow ring (for active/live states) */
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.25); }
  50%      { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
}
.glow-pulse { animation: glow-pulse 1.5s ease infinite; }

/* Dot pulse (notification indicators) */
@keyframes dot-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50%      { opacity: 0.8; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
}
.dot-pulse { animation: dot-pulse 2s ease-in-out infinite; }

/* Shimmer sweep (loading, special buttons) */
@keyframes shimmer-sweep {
  0%, 100% { left: -100%; opacity: 1; }
  50%      { left: 150%; opacity: 1; }
  50.01%, 99.99% { left: -100%; opacity: 0; }
}

/* Background gradient shift */
@keyframes bg-shift {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
```

### 8.4 Easing Functions

| Easing | Value | Usage |
|--------|-------|-------|
| Bouncy (overshoot) | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Icon pops, check bounces, playful micro-interactions |
| Smooth decelerate | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrance animations, slides, content reveal |
| Standard | `ease-in-out` | Continuous loops, subtle transitions |
| Linear | `linear` | Shimmer, progress bars |

---

## 9. Component Anatomy

### 9.1 Button Variants

```
Default:       bg-primary text-primary-foreground hover:bg-primary/90
Destructive:   bg-destructive text-destructive-foreground hover:bg-destructive/90
Outline:       border border-input bg-background hover:bg-accent hover:text-accent-foreground
Secondary:     bg-secondary text-secondary-foreground hover:bg-secondary/80
Ghost:         hover:bg-accent hover:text-accent-foreground
Link:          text-primary underline-offset-4 hover:underline
```

**Button sizes:**
```
Default:  h-10 px-4 py-2
Small:    h-9 rounded-md px-3
Large:    h-11 rounded-md px-8
Icon:     h-10 w-10
Compact:  h-8 px-3 gap-1.5 text-xs    (most common in app)
Tiny:     h-7 px-2.5 text-xs           (inline actions)
Mini:     h-6 w-6                       (icon-only compact)
```

### 9.2 Badge Variants

**Base:** `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium`

```
Default:     border-transparent bg-primary text-primary-foreground
Secondary:   border-transparent bg-gray-100 text-gray-700
Destructive: border-transparent bg-destructive text-destructive-foreground
Outline:     text-foreground border-gray-200
```

**Compact badge:** `px-1.5 py-px rounded-full text-[10px] font-medium`
**Micro badge:** `px-1.5 py-0 rounded text-[9px] font-semibold uppercase tracking-wide`

### 9.3 Input/Form Controls

```
Input:      h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base
            placeholder:text-muted-foreground
            focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            md:text-sm

Textarea:   min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2

Compact:    h-8 text-xs rounded-lg border-border/60
            focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10
            placeholder:text-muted-foreground/50
```

### 9.4 Dialog/Modal Anatomy

```
DialogContent:   flex flex-col p-0 gap-0 max-h-[90vh] overflow-hidden
                 max-w-lg (form) | max-w-[52rem] (view) | max-w-4xl (detail)
                 w-[min(95vw, 1400px)] h-[90vh] (full detail modals)

DialogHeader:    shrink-0 px-6 pt-6 pb-4 pr-10 border-b border-border
DialogBody:      flex-1 overflow-y-auto px-6 py-4
DialogFooter:    shrink-0 px-6 pb-6 pt-4 border-t border-border

Close button:    absolute right-4 top-4 z-10
Overlay:         fixed inset-0 z-50 bg-black/80
```

### 9.5 Card Anatomy

```
Outer:          p-3 rounded-xl border border-gray-100 bg-white
                hover:border-indigo-200 hover:shadow-sm transition-all group

Header:         flex items-start justify-between mb-2
Title:          font-medium text-sm group-hover:text-indigo-600 truncate
Metadata:       text-xs text-muted-foreground space-y-0.5
Progress bar:   h-1 bg-gray-100 rounded-full overflow-hidden
Footer:         flex items-center justify-between pt-2 border-t border-gray-50
```

### 9.6 Stat Card Anatomy

```
Outer:          flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-100
Icon box:       h-9 w-9 rounded-xl flex items-center justify-center bg-indigo-50
Icon:           h-[18px] w-[18px] text-indigo-500 strokeWidth={1.5}
Value:          text-xl font-semibold text-foreground
Label:          text-xs text-muted-foreground
Grid:           grid-cols-2 lg:grid-cols-4 gap-3
```

### 9.7 Empty State Anatomy

```
Container:      flex flex-col items-center justify-center py-12 px-4 text-center
Icon circle:    h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4
Icon:           h-8 w-8 text-indigo-500 strokeWidth={1.5}
Title:          text-lg font-medium text-foreground mb-1
Description:    text-sm text-muted-foreground max-w-sm mb-4
Action button:  Button size="sm" with Plus icon
```

### 9.8 Loading State

```
Container:      flex items-center justify-center py-12  (or py-20 in dialogs)
Spinner:        Loader2 className="h-6 w-6 animate-spin text-muted-foreground"
Alt color:      text-indigo-500 (in primary contexts)
```

### 9.9 Toast Anatomy

```
Container:      flex w-fit max-w-[400px] items-start gap-3
                rounded-[var(--radius-lg)] border px-4 py-3
                shadow-[var(--shadow-lg)]
Position:       top-right
Duration:       3000ms

Success:        bg-[rgb(var(--success-light))] border-[rgb(var(--success)_/_0.3)]
Error:          bg-[rgb(var(--destructive-light))] border-[rgb(var(--destructive)_/_0.3)]
Warning:        bg-[rgb(var(--warning-light))] border-[rgb(var(--warning)_/_0.3)]
Info:           bg-[rgb(var(--info-light))] border-[rgb(var(--info)_/_0.3)]

Icon:           size={18} strokeWidth={1.5}
Close:          size={14} strokeWidth={1.5}, hover transition-colors
```

---

## 10. Layout Patterns

### 10.1 App Shell

```
┌──────────────────────────────────────────────────────┐
│ Sidebar (220px / 64px)  │  TopBar (52px, sticky)     │
│                         ├────────────────────────────│
│ - Logo                  │  Page Content (flex-1, p-5) │
│ - Nav items             │                             │
│ - Project list          │  - Header + actions         │
│ - Quick actions         │  - Filters                  │
│                         │  - Content (table/grid)     │
│                         │  - Dialogs                  │
└──────────────────────────────────────────────────────┘
```

**Sidebar styling:**
```
Container:   w-[220px] (expanded) | w-16 (collapsed) | hidden (mobile)
             bg-white border-r border-gray-200 transition-all duration-300
Nav item:    flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium
             text-muted-foreground hover:bg-accent hover:text-foreground transition-colors
Active:      bg-gray-100 text-foreground font-medium
```

**TopBar styling:**
```
Container:   sticky top-0 z-30 min-h-[52px] flex flex-wrap items-center
             justify-between gap-2 px-4 py-2 border-b border-gray-200 bg-white
```

**Content area:**
```
margin-left: lg:ml-[220px] (expanded) | lg:ml-16 (collapsed)
transition:  transition-all duration-300 ease-in-out
padding:     flex-1 min-h-0 flex flex-col p-5
```

### 10.2 Page Layout

```tsx
<div className="w-full">
  {/* Header: title + count badge + spacer + create button */}
  <div className="flex items-center gap-3 mb-4">
    <h1 className="text-lg font-semibold">Page Title</h1>
    <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
      {count}
    </span>
    <div className="flex-1" />
    <Button size="sm" className="h-8 gap-1.5">
      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
      New Item
    </Button>
  </div>

  {/* Filter bar */}
  <div className="flex items-center gap-3 mb-4">
    <SearchInput className="w-56" inputClassName="h-8 text-xs" />
    <Select><SelectTrigger className="w-32 h-8 text-xs" /></Select>
  </div>

  {/* Content: loading → error → data → empty */}
  {isLoading ? <Loader /> : data.length > 0 ? <Content /> : <EmptyState />}

  {/* Dialogs at bottom */}
  <FormDialog />
</div>
```

### 10.3 Tab Patterns

**Underline tabs (filter/navigation):**
```
Container:  flex items-center border-b border-gray-200 mb-4
Tab:        px-3 py-2 text-xs font-medium transition-colors relative whitespace-nowrap
Active:     text-foreground + absolute bottom-0 h-0.5 bg-indigo-500 rounded-full
Inactive:   text-muted-foreground hover:text-foreground
Count:      ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]
            Active: bg-indigo-100 text-indigo-600
            Inactive: bg-gray-100 text-gray-600
```

**Content tabs (in detail views):**
```
TabsList:       h-auto p-0 bg-transparent border-b border-gray-200 rounded-none gap-0
TabsTrigger:    h-9 px-3 rounded-none border-b-2 border-transparent
                data-[state=active]:border-indigo-600 data-[state=active]:text-foreground
TabsContent:    mt-0 flex-1 min-h-0
```

### 10.4 Grid Layouts

```
Cards (responsive):     grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3
Stats:                  grid-cols-2 lg:grid-cols-4 gap-3
Two-column content:     grid-cols-1 md:grid-cols-2 gap-3
Form fields:            grid grid-cols-2 gap-5
Action items table:     grid-cols-[1fr_180px_120px_32px] gap-2
```

---

## 11. Detail View Architecture

### 11.1 Standard Detail Modal Structure

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER (shrink-0, border-b)                                │
│  Row 1: Breadcrumb (project > module > entity#) + actions   │
│  Row 2: Type selector + Title (inline editable)             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  PROPERTIES BAR (shrink-0, border-b, bg-gray-50/50)         │
│  Horizontal scrolling chips with popover editors            │
│  Status | Priority | Assignee | Due Date | Hours | ...      │
└─────────────────────────────────────────────────────────────┘
┌──────────────────────────────┬──────────────────────────────┐
│  LEFT CONTENT (flex-1)       │  RIGHT PANEL (42%, lg only)  │
│                              │                              │
│  Tabs:                       │  Tabs:                       │
│  - Description (editor)      │  - Comments                  │
│  - Attachments               │  - Activity                  │
│  - Related items             │                              │
│                              │  Composer (sticky bottom)    │
│  (scrollable)                │  (scrollable)                │
└──────────────────────────────┴──────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  BOTTOM BAR (shrink-0, border-t)                            │
│  Left: Quick actions (attach)  Right: Create/Cancel         │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Detail Modal Sizing

```
Full detail:    max-w-[95vw] w-[min(95vw,1400px)] h-[90vh] max-h-[90vh]
View dialog:    sm:max-w-[52rem]
Form dialog:    sm:max-w-lg  (or  sm:max-w-2xl for complex forms)
```

### 11.3 Properties Bar Pattern

```
Container:      border-b border-gray-200 bg-gray-50/50 px-4 py-2
Layout:         flex flex-wrap items-center gap-x-3 gap-y-1.5
Divider:        w-px h-4 bg-gray-200

Property chip:
  Trigger:      flex items-center gap-1.5 text-xs cursor-pointer
  Icon:         h-3.5 w-3.5 text-muted-foreground
  Label:        text-muted-foreground
  Value:        text-foreground font-medium
  Chevron:      h-3 w-3 text-muted-foreground (optional)

Popover content:
  Container:    space-y-1 min-w-[140px]
  Item:         flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded
                hover:bg-gray-100 transition-colors
  Selected:     bg-gray-100
```

### 11.4 Right Panel

```
Container:      shrink-0 hidden lg:flex flex-col h-full
                lg:w-[42%] lg:max-w-[480px]
                bg-gray-50/50 border-l border-gray-200
Tabs:           h-auto p-0 bg-white border-b border-gray-200
Tab trigger:    flex-1 h-10 border-b-2 border-transparent
                data-[state=active]:border-indigo-600
Content:        flex-1 overflow-y-auto
Composer:       sticky bottom, border-t
```

### 11.5 Bottom Bar

```
Container:      border-t border-gray-200 bg-white px-4 py-2
Layout:         flex items-center justify-between
Left:           Quick actions (ghost buttons, h-8 px-2.5 gap-1.5 text-xs)
Right:          flex items-center gap-2
                Cancel (outline, h-8 px-3 text-xs)
                Submit (bg-indigo-600 hover:bg-indigo-700, h-8 px-3 text-xs)
```

---

## 12. Form Patterns

### 12.1 Form Dialog Layout

```
DialogContent    (sm:max-w-lg or sm:max-w-2xl)
├─ DialogHeader  (px-5 py-3.5, border-b, shrink-0)
│  └─ Title + optional subtitle
├─ Form > form   (flex flex-col min-h-0 flex-1)
│  └─ Body       (px-5 py-4, overflow-y-auto, space-y-4)
│     └─ grid grid-cols-2 gap-5  (two-column layout)
│        └─ FormItem (space-y-1.5)
│           ├─ FormLabel
│           ├─ FormControl > Input/Textarea/Select
│           └─ FormMessage (error)
└─ DialogFooter  (px-5 py-3, border-t, gap-2)
   ├─ Cancel button (outline)
   └─ Submit button (primary)
```

### 12.2 Form Label Styles

```
Standard:       text-sm font-semibold
Compact:        text-[11px] font-semibold text-muted-foreground uppercase tracking-wider
Required:       <span className="text-destructive ml-0.5">*</span>
```

### 12.3 Form Input Styles (in dialogs)

```
Standard:       h-10 rounded-md border border-input
Custom compact: h-8 text-xs rounded-lg border-border/60
                focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10
                placeholder:text-muted-foreground/50
```

### 12.4 Dynamic List Fields (topics, action items)

```
Row:            flex items-center gap-2 group
Input:          flex-1
Delete button:  h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity
Add button:     text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50
                h-6 px-2 text-[11px] gap-1
```

---

## 13. Responsive Strategy

### 13.1 Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Base (mobile) | < 768px | Single column, hidden sidebar, stacked layout |
| `md` | 768px | Two-column grids, tablet adjustments |
| `lg` | 1024px | Sidebar visible, detail view two-panel layout |
| `xl` | 1280px | Four-column grids, wider content |
| `2xl` | 1400px | Container max-width cap |

### 13.2 Key Responsive Patterns

```
Sidebar:         hidden lg:flex
Right panel:     hidden lg:flex (in detail views)
Card grid:       grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
Content margin:  lg:ml-[220px] (sidebar expanded) | lg:ml-16 (collapsed)
Dialog width:    sm:max-w-[52rem] (responsive cap)
Form grid:       grid-cols-1 md:grid-cols-2
Flex wrapping:   flex flex-wrap (topbar, badge rows)
Text sizes:      md:text-sm (input base → sm on desktop)
```

---

## 14. Scrollbar & Overflow

### 14.1 Hidden Scrollbar

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

Also hide on `html` element globally.

### 14.2 Scroll Containers

```
Modal body:      flex-1 min-h-0 overflow-y-auto
Content areas:   flex-1 overflow-y-auto
Tables:          overflow-x-auto (horizontal scroll for wide tables)
Lists:           max-h-[360px] overflow-y-auto (constrained height)
```

**Critical flex scroll pattern:**
```
Parent:          flex flex-col h-full
Sticky section:  shrink-0 (header, footer)
Scroll section:  flex-1 min-h-0 overflow-y-auto
```

---

## 15. Rich Text / Editor Styling

### 15.1 Editor Base

```
Container:       min-height: 80px, max-height: 160px (comment mode)
                 No max-height constraint (canvas/full editor mode)
Padding:         0.5rem 0.75rem
Font:            0.875rem (14px), line-height 1.5
Caret:           caret-color: primary indigo
```

### 15.2 Content Typography

```
h1:              1.25rem, font-weight 700
h2:              1.1rem, font-weight 600
h3:              0.95rem, font-weight 600
Paragraph:       0.35rem margin (comment), 0.5rem (full editor)
Lists:           1.25rem left-padding, 0.25rem margin
Blockquote:      3px left border (gray-200), italic, muted text
Code inline:     bg-gray-100, 0.25rem radius, 0.8125rem font-size, monospace
Code block:      bg-gray-100, 0.375rem radius, 0.8125rem, monospace, scrollable
Links:           Primary indigo color, underlined, opacity 0.8 on hover
```

---

## 16. Avatar Patterns

### 16.1 Avatar Sizes

| Size | Classes | Overlap | Font | Usage |
|------|---------|---------|------|-------|
| xs | `h-5 w-5` | `-ml-1` | `text-[8px]` | Minimal |
| sm | `h-6 w-6` | `-ml-1.5` | `text-[10px]` | Inline, compact lists |
| md | `h-7 w-7` | `-ml-2` | `text-[10px]` | People strips |
| default | `h-8 w-8` | `-ml-2` | `text-xs` | Standard avatar groups |
| lg | `h-10 w-10` | `-ml-2.5` | `text-sm` | Profile, detail views |

### 16.2 Avatar Styling

```
Base:            rounded-full overflow-hidden
Border:          border-2 border-white (in groups)
Fallback:        bg-indigo-50 text-indigo-600 (internal)
                 bg-amber-50 text-amber-700 (external)
Initials:        font-semibold, centered
Remaining:       bg-zinc-100 border-white, count text
```

### 16.3 Avatar Group

```
Container:       flex items-center -space-x-{overlap}
Max display:     3-5 avatars, then "+N" indicator
Ring (status):   ring-2 ring-green-400/30 (present)
                 ring-2 ring-amber-400/70 (late)
```

---

## 17. Data Display Patterns

### 17.1 Section with Collapsible List

```
Header:          flex items-center gap-2.5 py-1
Chevron:         p-1 rounded-md hover:bg-gray-100 transition-colors
Status pill:     inline-flex gap-1.5 px-2.5 py-1 rounded-full
                 text-[11px] font-bold uppercase tracking-wider text-white
Count:           text-xs font-medium text-gray-500 tabular-nums
List container:  mt-1.5 rounded-lg border border-gray-200 bg-white overflow-x-auto
```

### 17.2 Progress Bar

```
Track:           h-1 bg-gray-100 rounded-full overflow-hidden
Fill:            h-full rounded-full (color via inline style or status class)
Labels:          text-[10px] font-medium text-muted-foreground + text-foreground
```

### 17.3 Metadata Row

```
Container:       flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs
Item:            inline-flex items-center gap-1.5 text-muted-foreground
Separator:       text-border/60 select-none (· dot)
Value:           font-medium text-foreground
```

### 17.4 Inline Editable Fields

```
Display:         text-sm truncate min-w-0 flex items-center gap-1
Edit indicator:  opacity-0 group-hover:opacity-100 transition-opacity (pencil icon)
Edit mode:       text-sm bg-transparent outline-none border-b-2 border-indigo-400 py-0.5 px-0.5
Keyboard:        Enter → save, Escape → cancel, Blur → save
```

---

## 18. Z-Index Stacking

| Layer | Z-Index | Elements |
|-------|---------|----------|
| Base content | 0 | Page content, cards |
| Sticky elements | 10 | Dialog close buttons |
| TopBar | 30 | `sticky top-0 z-30` |
| Sidebar toggle | 50 | Toggle button |
| Overlays | 50 | Dialog overlay, popovers |
| Dialogs | 50 | `fixed z-50` |
| Tooltips | 50 | `z-50` |

---

## 19. Drag & Drop Styling

```
Grab cursor:     cursor: grab (default) → cursor: grabbing (active)
Settle:          scale(1.02) opacity(0.9) → scale(1) opacity(1) animation
Drop zone:       border-dashed border-2 border-indigo-300 bg-indigo-50/30
```

---

## 20. Quick Reference: Most Common Class Combinations

```
/* Card */
p-3 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm transition-all group

/* Compact button */
h-8 px-3 gap-1.5 text-xs font-medium

/* Badge */
inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium

/* Section header label */
text-[11px] font-bold uppercase tracking-wider text-muted-foreground

/* Filter select */
w-32 h-8 text-xs

/* Search input */
w-56 h-8 text-xs

/* Icon in container */
h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center ring-1 ring-indigo-200/50

/* Separator dot */
text-border/60 select-none

/* Hidden until hover */
opacity-0 group-hover:opacity-100 transition-opacity

/* Scrollable in flex */
flex-1 min-h-0 overflow-y-auto

/* Dialog body scroll */
flex flex-col p-0 gap-0 overflow-hidden max-h-[90vh]
```

---

## Usage

When building UI components, reference this document to ensure every element — from a tiny badge to a full page layout — follows the same visual language for a polished and consistent product.
