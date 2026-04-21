import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number;        // % change — positive = up (green), negative = down (red)
  invertDelta?: boolean; // flip colour logic when lower is better (e.g. RTO rate, CAC)
  loading?: boolean;
}

export function KpiCard({ label, value, sub, delta, invertDelta = false, loading }: KpiCardProps) {
  if (loading) {
    return <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] min-h-[96px] animate-pulse" />;
  }

  const hasDelta = delta !== undefined;
  const isGood   = hasDelta ? (invertDelta ? delta! <= 0 : delta! >= 0) : false;
  const sign     = hasDelta && delta! >= 0 ? '↑' : '↓';

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] px-5 py-4 flex flex-col gap-1.5 min-h-[96px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide leading-tight">{label}</span>
        {hasDelta && (
          <span className={cn(
            'shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5',
            isGood ? 'bg-[var(--pos-soft)] text-[var(--pos)]' : 'bg-[var(--neg-soft)] text-[var(--neg)]',
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
