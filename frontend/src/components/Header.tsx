import { useState } from 'react';
import { ConnectorHealth } from '@app/types/dashboard';

interface HeaderProps {
  range: string;
  setRange: (range: string) => void;
  health: ConnectorHealth[];
}

export default function Header({ range, setRange, health }: HeaderProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  const dotColor = (status: string) => {
    if (status === 'green') return 'bg-emerald';
    if (status === 'amber') return 'bg-amber';
    return 'bg-ruby';
  };

  return (
    <header className="bg-white border-b border-parch px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-gold text-2xl font-bold tracking-wider">SHAYN</span>
        <span className="text-xs text-muted uppercase tracking-widest mt-1">MIS Dashboard</span>
      </div>

      <div className="flex items-center gap-2">
        {(['7d', '30d'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              range === r
                ? 'bg-gold text-white'
                : 'bg-parch text-muted hover:text-ink'
            }`}
          >
            {r === '7d' ? '7D' : '30D'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {health.map((h) => (
          <div
            key={h.connector_name}
            className="relative flex items-center gap-1 cursor-pointer"
            onMouseEnter={() => setTooltip(h.connector_name)}
            onMouseLeave={() => setTooltip(null)}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor(h.status)}`} />
            <span className="text-xs text-muted capitalize">{h.connector_name.replace('_', ' ')}</span>
            {tooltip === h.connector_name && (
              <div className="absolute top-6 right-0 bg-ink text-white text-xs rounded px-2 py-1 w-48 z-10">
                {h.error_message
                  ? h.error_message
                  : h.last_sync_at
                  ? `Last sync: ${new Date(h.last_sync_at).toLocaleTimeString()}`
                  : 'Never synced'}
              </div>
            )}
          </div>
        ))}
      </div>
    </header>
  );
}
