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
  return (
    <div className={cn('bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 flex flex-col', className)}>
      <div className="flex items-start justify-between mb-3 gap-2 shrink-0">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-[var(--text)] leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--text-subtle)] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {action}
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
