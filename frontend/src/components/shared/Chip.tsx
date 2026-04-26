import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ChipVariant = 'pos' | 'neg' | 'warn' | 'neutral' | 'ai';

interface ChipProps {
  variant?: ChipVariant;
  children: ReactNode;
}

const variantClasses: Record<ChipVariant, string> = {
  pos:     'bg-[var(--pos-soft)]   text-[var(--pos)]',
  neg:     'bg-[var(--neg-soft)]   text-[var(--neg)]',
  warn:    'bg-[var(--warn-soft)]  text-[var(--warn)]',
  neutral: 'bg-[var(--surface-2)]  text-[var(--text-muted)]',
  ai:      'bg-[var(--ai-soft)]    text-[var(--ai)]',
};

export function Chip({ variant = 'neutral', children }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
        variantClasses[variant],
      )}
    >
      {children}
    </span>
  );
}
