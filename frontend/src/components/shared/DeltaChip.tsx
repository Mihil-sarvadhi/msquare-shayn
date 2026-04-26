import { cn } from '@/lib/utils';

interface DeltaChipProps {
  value: number;
  suffix?: string;
}

export function DeltaChip({ value, suffix = '%' }: DeltaChipProps) {
  const isPos = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
        isPos ? 'bg-[var(--pos-soft)] text-[var(--pos)]' : 'bg-[var(--neg-soft)] text-[var(--neg)]',
      )}
    >
      {isPos ? '↑' : '↓'} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}
