import React from 'react';

interface KPICardProps {
  label: string;
  value: string;
  accent?: string;
  icon?: React.ElementType;
}

export default function KPICard({ label, value, accent = '#B8860B' }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-parch shadow-card overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">{label}</p>
        <p className="text-2xl font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}
