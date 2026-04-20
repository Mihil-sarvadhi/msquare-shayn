import type { ElementType } from 'react';

interface KPICardProps {
  label: string;
  value: string;
  accent?: string;
  icon?: ElementType;
}

export default function KPICard({ label, value, accent = '#B8860B', icon: Icon }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-parch shadow-card overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          {Icon && (
            <div className="rounded-lg p-1.5" style={{ backgroundColor: `${accent}18` }}>
              <Icon size={14} strokeWidth={1.5} style={{ color: accent }} />
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}
