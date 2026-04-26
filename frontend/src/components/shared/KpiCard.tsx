import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  labelTooltip?: string;
  value: string | number;
  sub?: string;
  /** % change vs prior equivalent period — badge colour follows sign (non-negative green, negative red). */
  delta?: number;
  loading?: boolean;
}

export function KpiCard({ label, labelTooltip, value, sub, delta, loading }: KpiCardProps) {
  if (loading) {
    return <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] min-h-[96px] animate-pulse" />;
  }

  const hasDelta = delta !== undefined;
  const isNonNegative = hasDelta && delta! >= 0;
  const sign = isNonNegative ? '↑' : '↓';

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] px-5 py-4 flex flex-col gap-1.5 min-h-[96px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide leading-tight line-clamp-2" title={labelTooltip}>{label}</span>
        {hasDelta && (
          <span className={cn(
            'shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5',
            isNonNegative ? 'bg-[var(--pos-soft)] text-[var(--pos)]' : 'bg-[var(--neg-soft)] text-[var(--neg)]',
          )}>
            {sign} {Math.abs(delta!).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-[var(--text)] leading-tight">{value}</p>
      {sub && <p className="text-xs text-[var(--text-subtle)] leading-snug">{sub}</p>}
    </div>
  );
}
