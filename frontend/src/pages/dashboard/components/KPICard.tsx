import type { ElementType } from 'react';

interface KPICardProps {
  label: string;
  value: string;
  subLabel?: string;
  accent?: string;
  icon?: ElementType;
}

export default function KPICard({ label, value, subLabel, accent = '#B8860B', icon: Icon }: KPICardProps) {
  return (
    <div className="bg-white rounded-card border border-parch shadow-card overflow-hidden flex">
      <div className="w-[4px] shrink-0 rounded-l-card" style={{ backgroundColor: accent }} />
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between mb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
          {Icon && (
            <div className="rounded-lg p-1.5" style={{ backgroundColor: `${accent}18` }}>
              <Icon size={14} strokeWidth={1.5} style={{ color: accent }} />
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-ink">{value}</p>
        {subLabel && <p className="text-[11px] text-stone mt-1">{subLabel}</p>}
      </div>
    </div>
  );
}
