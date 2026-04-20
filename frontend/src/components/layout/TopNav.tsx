import { useState, useCallback, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { RefreshCw, CalendarDays } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setPreset, setCustomRange } from '@store/slices/rangeSlice';
import type { RangePreset } from '@store/slices/rangeSlice';
import {
  useSyncAll,
  useSyncShopify,
  useSyncMeta,
  useSyncIthink,
  useSyncJudgeme,
} from '@services/dashboard/dashboard.query';
import { DateRangePicker } from '@components/ui/DateRangePicker';
import { cn } from '@/lib/utils';
import type { ConnectorHealth } from '@app/types/dashboard';

const NAV = [
  { label: 'Dashboard',  to: '/dashboard'  },
  { label: 'Marketing',  to: '/marketing'  },
  { label: 'Customers',  to: '/customers'  },
  { label: 'Operations', to: '/operations' },
  { label: 'Reviews',    to: '/reviews'    },
];

const CONNECTOR_META: Record<string, { label: string }> = {
  shopify:  { label: 'Shopify'   },
  meta_ads: { label: 'Meta Ads'  },
  ithink:   { label: 'iThink'    },
  judgeme:  { label: 'Judge.me'  },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)  return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STATUS_DOT: Record<string, string> = {
  green:   'bg-emerald-500',
  amber:   'bg-amber-400',
  red:     'bg-red-500',
  unknown: 'bg-gray-300',
};

interface ConnectorRowProps {
  h: ConnectorHealth;
}

function ConnectorRow({ h }: ConnectorRowProps) {
  const syncShopify = useSyncShopify();
  const syncMeta    = useSyncMeta();
  const syncIthink  = useSyncIthink();
  const syncJudgeme = useSyncJudgeme();

  const syncMap: Record<string, () => void> = {
    shopify:  () => syncShopify.mutate(),
    meta_ads: () => syncMeta.mutate(),
    ithink:   () => syncIthink.mutate(),
    judgeme:  () => syncJudgeme.mutate(),
  };

  const pendingMap: Record<string, boolean> = {
    shopify:  syncShopify.isPending,
    meta_ads: syncMeta.isPending,
    ithink:   syncIthink.isPending,
    judgeme:  syncJudgeme.isPending,
  };

  const key     = h.connector_name;
  const meta    = CONNECTOR_META[key] ?? { label: key };
  const dotCls  = STATUS_DOT[h.status] ?? STATUS_DOT.unknown;
  const pending = pendingMap[key] ?? false;

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-1 group rounded hover:bg-[#F5F0E8] transition-colors">
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
        <span className="text-[13px] font-medium text-[#1A1208]">{meta.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#8C7B64] tabular-nums">{timeAgo(h.last_sync_at)}</span>
        <button
          onClick={syncMap[key]}
          disabled={pending}
          title={`Retry ${meta.label}`}
          className="text-[#8C7B64] hover:text-[#B8860B] disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={12} strokeWidth={1.5} className={pending ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}

export function TopNav() {
  const dispatch   = useAppDispatch();
  const range      = useAppSelector((s) => s.range);
  const health     = useAppSelector((s) => s.dashboard.health);
  const syncAll    = useSyncAll();

  const [showPicker,  setShowPicker]  = useState(false);
  const [showSources, setShowSources] = useState(false);

  const handlePreset = useCallback((p: Exclude<RangePreset, 'custom'>) => {
    dispatch(setPreset(p));
    setShowPicker(false);
  }, [dispatch]);

  const handleApply = useCallback((start: string, end: string) => {
    dispatch(setCustomRange({ startDate: start, endDate: end }));
    setShowPicker(false);
  }, [dispatch]);

  const pickerRef  = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker && !showSources) return;
    function handleOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
      if (sourcesRef.current && !sourcesRef.current.contains(e.target as Node)) {
        setShowSources(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showPicker, showSources]);

  const customLabel = range.preset === 'custom'
    ? `${range.startDate} → ${range.endDate}`
    : 'Custom';

  return (
    <header className="bg-white border-b border-[#F0EBE0] px-4 sm:px-6 flex items-center gap-4 h-[52px] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <img src="/favicon.svg" alt="SHAYN" className="h-10 w-10 rounded-xl" />
        <div className="flex items-baseline gap-1">
          <span className="text-[#1A1208] font-bold text-[14px] tracking-wider">SHAYN</span>
          <span className="text-[10px] text-[#B8860B] uppercase tracking-widest font-semibold">MIS</span>
        </div>
      </div>

      {/* Nav tabs */}
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

      {/* Right controls */}
      <div className="flex items-center gap-3 ml-auto shrink-0">

        {/* Range selector */}
        <div className="flex gap-1 bg-[#F5F0E8] rounded-lg p-1">
          {([
            { key: '7d',  label: '7 Days'   },
            { key: '30d', label: '30 Days'  },
            { key: 'all', label: 'All Time' },
          ] as { key: Exclude<RangePreset, 'custom'>; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePreset(key)}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                range.preset === key
                  ? 'bg-white text-[#1A1208] shadow-sm font-semibold'
                  : 'text-[#8C7B64] hover:text-[#1A1208]'
              )}
            >
              {label}
            </button>
          ))}

          {/* Custom date */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowPicker((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                range.preset === 'custom'
                  ? 'bg-[#B8860B] text-white font-semibold'
                  : 'text-[#8C7B64] hover:text-[#1A1208]'
              )}
            >
              <CalendarDays size={11} strokeWidth={1.5} />
              {customLabel}
            </button>
            {showPicker && (
              <div className="absolute top-full right-0 mt-2 z-50">
                <DateRangePicker
                  startDate={range.startDate}
                  endDate={range.endDate}
                  onApply={handleApply}
                  onClose={() => setShowPicker(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Data Sources button + dropdown */}
        <div className="relative" ref={sourcesRef}>
          <button
            onClick={() => setShowSources((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              showSources
                ? 'border-[#B8860B] text-[#B8860B] bg-[#FDF8F0]'
                : 'border-[#E8E0D0] text-[#8C7B64] hover:border-[#B8860B] hover:text-[#B8860B]'
            )}
          >
            {/* Status dots summary */}
            <span className="flex gap-0.5">
              {health.slice(0, 4).map((h) => (
                <span
                  key={h.connector_name}
                  className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[h.status] ?? STATUS_DOT.unknown}`}
                />
              ))}
            </span>
            Data Sources
          </button>

          {showSources && (
            <div className="absolute top-full right-0 mt-2 z-50 w-56 bg-white rounded-xl shadow-lg border border-[#F0EBE0] p-3">
              <p className="text-[10px] font-semibold text-[#8C7B64] uppercase tracking-widest mb-2 px-1">
                Data Sources
              </p>
              <div className="flex flex-col">
                {health.length === 0 ? (
                  <p className="text-[12px] text-[#8C7B64] px-1 py-2">No connectors found</p>
                ) : (
                  health.map((h) => <ConnectorRow key={h.connector_name} h={h} />)
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-[#F0EBE0]">
                <button
                  onClick={() => { syncAll.mutate(); setShowSources(false); }}
                  disabled={syncAll.isPending}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B8860B] text-white hover:bg-[#B8860B]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  <RefreshCw size={11} strokeWidth={1.5} className={syncAll.isPending ? 'animate-spin' : ''} />
                  {syncAll.isPending ? 'Syncing…' : 'Sync All'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
