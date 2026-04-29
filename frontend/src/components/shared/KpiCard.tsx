import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  labelTooltip?: string;
  value: string | number;
  /** Tagline next to the delta pill. */
  sub?: string;
  /** % change vs prior equivalent period — drives the delta pill + sparkline color. */
  delta?: number;
  /** Optional Lucide icon shown as a soft-gold tile in the top-right corner. */
  icon?: LucideIcon;
  /** Optional list of values for the trailing sparkline. Auto-coloured by delta direction. */
  trend?: number[];
  loading?: boolean;
  /** Set true for "lower is better" metrics (bounce rate, RTO, refund rate) so the
   *  red/green colour flips while the arrow still reflects the real direction. */
  invertDelta?: boolean;
}

/* ── Tiny inline sparkline (no recharts) ────────────────────────────────── */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const safe = values.filter((v) => Number.isFinite(v));
  if (safe.length < 2) return null;

  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const W   = 100;
  const H   = 16;
  const span = max - min || 1;

  const pts = safe.map((v, i) => {
    const x = (i / (safe.length - 1)) * W;
    const y = H - ((v - min) / span) * H;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const gradId = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block w-full h-[16px]"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#${gradId})`}
        points={`0,${H} ${pts.join(' ')} ${W},${H}`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts.join(' ')}
      />
    </svg>
  );
}

export function KpiCard({
  label, labelTooltip, value, sub, delta, icon: Icon, trend, loading, invertDelta,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="bg-[var(--surface)] rounded-[12px] border border-[var(--line)] min-h-[96px] animate-pulse" />
    );
  }

  const hasDelta = delta !== undefined;
  const isPositiveDelta = hasDelta && delta! >= 0;
  const isImprovement = hasDelta && (invertDelta ? delta! < 0 : delta! >= 0);
  const sparkColor = !hasDelta ? 'var(--muted)' : isImprovement ? 'var(--green)' : 'var(--red)';

  return (
    <div
      className={cn(
        'group relative overflow-hidden',
        'bg-[var(--surface)] rounded-[12px] border border-[var(--line)]',
        'px-3.5 pt-2.5 pb-2 flex flex-col gap-1.5 min-h-[96px]',
        'transition-[transform,border-color,box-shadow] duration-200',
        'hover:-translate-y-[2px] hover:border-[var(--line-2)] hover:shadow-[var(--shadow-md)]',
      )}
    >
      {/* hover gradient lift (mockup ::before) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0 bg-[linear-gradient(180deg,transparent,var(--accent-soft))] transition-[height] duration-300 ease-out group-hover:h-[55%]"
      />

      {/* Top row: label + icon */}
      <div className="relative z-[1] flex items-center justify-between gap-2">
        <span
          title={labelTooltip}
          className="text-[10px] font-medium uppercase tracking-widish text-[var(--muted)] line-clamp-1 leading-tight"
        >
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              'shrink-0 inline-flex items-center justify-center',
              'h-[20px] w-[20px] rounded-[6px]',
              'bg-[var(--accent-soft)] text-[var(--accent)]',
              'transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]',
              'group-hover:scale-110 group-hover:-rotate-6',
            )}
          >
            <Icon size={11} strokeWidth={1.7} />
          </span>
        )}
      </div>

      {/* Value + delta on the same row */}
      <div className="relative z-[1] flex items-baseline justify-between gap-2">
        <p className="text-[22px] font-medium leading-none tracking-tightx tabular-nums text-[var(--ink)]">
          {value}
        </p>
        {hasDelta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 shrink-0',
              'rounded-full px-1.5 py-[2px] text-[10px] font-medium tabular-nums leading-none',
              isImprovement
                ? 'bg-[var(--green-soft)] text-[var(--green)]'
                : 'bg-[var(--red-soft)] text-[var(--red)]',
            )}
          >
            {isPositiveDelta ? '↑' : '↓'} {Math.abs(delta!).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Sub text */}
      {sub && (
        <p className="relative z-[1] text-[10.5px] leading-tight text-[var(--muted)] line-clamp-1">
          {sub}
        </p>
      )}

      {/* Sparkline */}
      {trend && trend.length > 1 && (
        <div className="relative z-[1] mt-auto -mx-1 -mb-1">
          <Sparkline values={trend} color={sparkColor} />
        </div>
      )}
    </div>
  );
}
