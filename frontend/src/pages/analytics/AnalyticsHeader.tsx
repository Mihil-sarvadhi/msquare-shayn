import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setAnalyticsRange } from '@store/slices/analyticsSlice';
import { cn } from '@/lib/utils';

const RANGES = [
  { label: 'Last 7 Days',   value: '7d'  },
  { label: 'Last 30 Days',  value: '30d' },
  { label: 'All Time',      value: 'all' },
];

interface AnalyticsHeaderProps {
  title: string;
  subtitle: string;
}

export function AnalyticsHeader({ title, subtitle }: AnalyticsHeaderProps) {
  const dispatch = useAppDispatch();
  const range = useAppSelector((s) => s.analytics.range);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b border-parch bg-white sticky top-0 md:top-0 z-10">
      <div>
        <h1 className="text-lg font-bold text-ink">{title}</h1>
        <p className="text-xs text-muted mt-0.5">{subtitle}</p>
      </div>
      <div className="flex gap-1 bg-surface rounded-lg p-1 self-start sm:self-auto">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => dispatch(setAnalyticsRange(r.value))}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              range === r.value
                ? 'bg-white text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
