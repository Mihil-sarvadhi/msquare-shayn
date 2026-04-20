import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ConnectorHealth } from '@app/types/dashboard';

interface HeaderProps {
  range: string;
  setRange: (range: string) => void;
  health: ConnectorHealth[];
  onSyncAll: () => void;
  isSyncing: boolean;
}

export default function Header({ range, setRange, health, onSyncAll, isSyncing }: HeaderProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  const dotColor = (status: string) => {
    if (status === 'green') return 'bg-emerald';
    if (status === 'amber') return 'bg-amber';
    return 'bg-ruby';
  };

  return (
    <header className="bg-white border-b border-parch px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
      {/* Brand — hidden on mobile since sidebar/mobile-nav shows it */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <span className="text-gold text-xl font-bold tracking-wider">SHAYN</span>
        <span className="text-xs text-muted uppercase tracking-widest mt-0.5">MIS</span>
      </div>

      {/* Range selector */}
      <div className="flex gap-1 bg-[#F5F0E8] rounded-lg p-1 shrink-0">
        {([['7d','7 Days'],['30d','30 Days'],['all','All Time']] as const).map(([r, label]) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              range === r ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Right side — health dots + sync */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        <div className="hidden sm:flex items-center gap-3">
          {health.map((h) => (
            <div
              key={h.connector_name}
              className="relative flex items-center gap-1 cursor-pointer"
              onMouseEnter={() => setTooltip(h.connector_name)}
              onMouseLeave={() => setTooltip(null)}
            >
              <span className={`w-2 h-2 rounded-full ${dotColor(h.status)}`} />
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

        <button
          onClick={onSyncAll}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gold text-white hover:bg-gold/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw size={12} strokeWidth={2} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing…' : 'Sync All'}
        </button>
      </div>
    </header>
  );
}
