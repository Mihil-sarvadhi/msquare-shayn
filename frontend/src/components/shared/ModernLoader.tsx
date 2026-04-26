import { cn } from '@/lib/utils';

interface ModernLoaderProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<NonNullable<ModernLoaderProps['size']>, { box: number; dot: number }> = {
  sm: { box: 18, dot: 6 },
  md: { box: 28, dot: 9 },
  lg: { box: 40, dot: 13 },
};

export function ModernLoader({ label = 'Loading...', className, size = 'md' }: ModernLoaderProps) {
  const { box, dot } = SIZE_MAP[size];
  const positions = [
    { top: 0,     left: 0     },
    { top: 0,     right: 0    },
    { bottom: 0,  right: 0    },
    { bottom: 0,  left: 0     },
  ];

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <span
        className="relative inline-block"
        style={{
          width: box,
          height: box,
          animation: 'antd-spin-rotate 1.2s infinite linear',
          transform: 'rotate(45deg)',
        }}
      >
        {positions.map((pos, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-[var(--accent)]"
            style={{
              width: dot,
              height: dot,
              opacity: 0.3,
              animation: 'antd-spin-fade 1s infinite linear alternate',
              animationDelay: `${i * 0.4}s`,
              ...pos,
            }}
          />
        ))}
      </span>
      <span className="text-xs font-medium tracking-wide text-[var(--text-muted)]">{label}</span>
    </div>
  );
}
