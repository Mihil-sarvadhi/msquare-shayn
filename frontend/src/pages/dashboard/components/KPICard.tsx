import type { ElementType } from 'react';

interface KPICardProps {
  label: string;
  value: string;
  accent?: string;
  icon?: ElementType;
}

export default function KPICard({ label, value, accent = '#B8893E', icon: Icon }: KPICardProps) {
  return (
    <div className="bg-[var(--surface)] rounded-[14px] border border-[var(--line)] overflow-hidden hover:border-[var(--line-2)] transition-colors">
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[11px] font-medium uppercase tracking-widish text-[var(--muted)]">{label}</p>
          {Icon && (
            <div className="rounded-md p-1.5" style={{ backgroundColor: `${accent}1F` }}>
              <Icon size={14} strokeWidth={1.5} style={{ color: accent }} />
            </div>
          )}
        </div>
        <p className="text-[26px] font-medium tracking-tightx text-[var(--ink)] tabular-nums">{value}</p>
      </div>
    </div>
  );
}
