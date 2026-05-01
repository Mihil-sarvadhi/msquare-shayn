/**
 * Shared chart palette + design tokens.
 *
 * Mirrors the CSS variables in src/styles/globals.css. Use these constants when
 * passing colours to libraries that don't read CSS vars natively (Recharts fill
 * props, inline SVG strokes, etc.). For everything else (className, style backgrounds)
 * prefer `var(--token)` directly.
 */

/* ── Mockup chart palette (c1-c5) ──────────────────────────────────────── */
export const ACCENT = '#B8893E'; /* c1 — gold */
export const TEAL   = '#0F8C82'; /* c2 */
export const INFO   = '#2456C2'; /* c3 — blue */
export const POS    = '#1F8A4C'; /* c4 — green */
export const WARN   = '#C8780B'; /* c5 — amber */
export const NEG    = '#C4361F'; /* red */
export const MUTED  = '#98948A';
export const AI     = '#6E3FD0'; /* purple */

/* Indexed chart palette */
export const CHART_PALETTE = [ACCENT, TEAL, INFO, POS, WARN, AI, NEG, MUTED] as const;

/* Recharts CartesianGrid + axis tick conventions */
export const GRID_STROKE       = 'var(--line)';
export const GRID_DASHARRAY    = '2 3';
export const AXIS_TICK_COLOR   = 'var(--muted-2)';
export const AXIS_TICK_SIZE    = 10;
export const TOOLTIP_CURSOR    = { fill: 'rgba(184,137,62,0.08)' };

/* Recharts tooltip wrapper styling — use as contentStyle.
 * Theme-aware via CSS variables: light theme renders on the light surface,
 * dark theme renders on the dark surface. Pair with TOOLTIP_LABEL_STYLE and
 * TOOLTIP_ITEM_STYLE on the same Tooltip element to keep label/value colors
 * consistent in both themes. */
export const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  fontSize: 12,
  color: 'var(--text)',
  boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
};

export const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontWeight: 500,
  marginBottom: 4,
};

export const TOOLTIP_ITEM_STYLE: React.CSSProperties = {
  color: 'var(--text)',
};
