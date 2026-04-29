import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PanelInfo {
  what: string;
  how?: string;
  source?: string;
  readIt?: string;
}

export interface PanelAI {
  observation: string;
  insight: string;
  metrics?: { label: string; value: string }[];
  actions: string[];
}

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  info?: PanelInfo;
  ai?: PanelAI;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, subtitle, action, className, children }: PanelProps) {
  const hasHeader = Boolean(title.trim() || subtitle || action);

  return (
    <div
      className={cn(
        'bg-[var(--surface)] rounded-[14px] border border-[var(--line)]',
        'px-[22px] py-[20px] flex flex-col gap-[14px]',
        'transition-[border-color,box-shadow] duration-200',
        'hover:border-[var(--line-2)]',
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 flex-wrap shrink-0">
          <div className="min-w-0">
            {title.trim() && (
              <h3
                className={cn(
                  'text-[14.5px] font-semibold leading-[1.25] tracking-tightish',
                  'text-[var(--ink)]',
                )}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-[3px] text-[11.5px] leading-[1.3] text-[var(--muted)]">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">{action}</div>
        </div>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
