import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAppSelector } from '@store/hooks';
import { useSyncAll } from '@services/dashboard/dashboard.query';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard',  to: '/dashboard'  },
  { label: 'Marketing',  to: '/marketing'  },
  { label: 'Customers',  to: '/customers'  },
  { label: 'Operations', to: '/operations' },
  { label: 'Reviews',    to: '/reviews'    },
];

const DOT_COLOR: Record<string, string> = {
  green: 'bg-[#2D7D46]',
  amber: 'bg-[#B45309]',
  red:   'bg-[#9B2235]',
};

export function TopNav() {
  const health = useAppSelector((s) => s.dashboard.health);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const syncAll = useSyncAll();

  return (
    <header className="bg-white border-b border-[#F0EBE0] px-4 sm:px-6 flex items-center gap-6 h-[52px] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#B8860B]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[#B8860B] font-bold text-[14px] tracking-wider">SHAYN</span>
          <span className="text-[10px] text-[#8C7B64] uppercase tracking-widest">MIS</span>
        </div>
      </div>

      {/* Nav tabs — scrollable on mobile */}
      <nav className="flex items-stretch gap-1 flex-1 overflow-x-auto h-full">
        {NAV.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors h-full',
                isActive
                  ? 'border-[#B8860B] text-[#1A1208] font-semibold'
                  : 'border-transparent text-[#8C7B64] hover:text-[#1A1208]'
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right — health dots + sync */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        <div className="hidden sm:flex items-center gap-3">
          {health.map((h) => (
            <div
              key={h.connector_name}
              className="relative flex items-center gap-1 cursor-pointer"
              onMouseEnter={() => setTooltip(h.connector_name)}
              onMouseLeave={() => setTooltip(null)}
            >
              <span className={cn('w-2 h-2 rounded-full', DOT_COLOR[h.status] ?? 'bg-gray-400')} />
              <span className="text-xs text-[#8C7B64] capitalize">{h.connector_name.replace(/_/g, ' ')}</span>
              {tooltip === h.connector_name && (
                <div className="absolute top-6 right-0 bg-[#1A1208] text-white text-xs rounded px-2 py-1 w-48 z-10">
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
          onClick={() => syncAll.mutate()}
          disabled={syncAll.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B8860B] text-white hover:bg-[#B8860B]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw size={12} strokeWidth={2} className={syncAll.isPending ? 'animate-spin' : ''} />
          {syncAll.isPending ? 'Syncing…' : 'Sync All'}
        </button>
      </div>
    </header>
  );
}
