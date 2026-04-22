import { cn } from '@/lib/utils';

interface ModernLoaderProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<NonNullable<ModernLoaderProps['size']>, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

export function ModernLoader({ label = 'Loading...', className, size = 'md' }: ModernLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1.5 text-[var(--accent)]', className)}>
      <div className="grid grid-cols-2 gap-1">
        {[0, 1, 2, 3].map((idx) => (
          <span
            key={idx}
            className={cn(
              'rounded-full bg-[var(--accent)] animate-[loader-pop_0.95s_ease-in-out_infinite]',
              SIZE_MAP[size],
              idx % 2 === 1 && 'bg-[var(--warn)]',
            )}
            style={{ animationDelay: `${idx * 0.12}s` }}
          />
        ))}
      </div>
      <span className="text-xs font-medium tracking-wide">{label}</span>
    </div>
  );
}
