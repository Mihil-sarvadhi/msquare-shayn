import { useState, useCallback, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { RefreshCw, /* CalendarDays, */ Loader2, AlertCircle, Check } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setPreset, /* setCustomRange, */ } from '@store/slices/rangeSlice';
import type { RangePreset } from '@store/slices/rangeSlice';
import {
  useSyncAll, useSyncShopify, useSyncMeta, useSyncIthink, useSyncJudgeme, useSyncGA4,
} from '@services/dashboard/dashboard.query';
// import { DateRangePicker } from '@components/ui/DateRangePicker'; // re-enable with Custom date button
import { cn } from '@/lib/utils';
import type { ConnectorHealth } from '@app/types/dashboard';
import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import { BrandIcon } from '@components/shared/BrandIcon';

/* ── State machine ──────────────────────────────────────────────────────────
 * syncing  → success  → (3 s) → cooldown → (7 s) → null   (can't click during success/cooldown)
 * syncing  → error               → (5 s) → null           (can retry immediately)
 * ────────────────────────────────────────────────────────────────────────── */
type ConnSyncState = 'syncing' | 'success' | 'error' | 'cooldown' | null;

function useConnectorHealth() {
  const [health, setHealth] = useState<ConnectorHealth[]>([]);

  const fetch = useCallback(() => {
    baseService.get<{ data: ConnectorHealth[] }>(API_ENDPOINTS.health)
      .then((r) => setHealth(r.data.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [fetch]);

  return { health, refetch: fetch };
}

const NAV = [
  { label: 'Dashboard',  to: '/dashboard'  },
  { label: 'Marketing',  to: '/marketing'  },
  { label: 'Customers',  to: '/customers'  },
  { label: 'Operations', to: '/operations' },
  { label: 'Reviews',    to: '/reviews'    },
  { label: 'Analytics',  to: '/analytics'  },
];

const CONNECTOR_META: Record<string, { label: string }> = {
  shopify:  { label: 'Shopify'   },
  meta_ads: { label: 'Meta Ads'  },
  ithink:   { label: 'iThink'    },
  judgeme:  { label: 'Judge.me'  },
  ga4:      { label: 'GA4'       },
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface ConnectorRowProps {
  h: ConnectorHealth;
  syncState: ConnSyncState;
  localSyncAt: number | null;
  onSynced: () => void;
  onSyncStart: () => void;
  onSyncSuccess: () => void;
  onSyncError: () => void;
}

function ConnectorRow({
  h, syncState, localSyncAt,
  onSynced, onSyncStart, onSyncSuccess, onSyncError,
}: ConnectorRowProps) {
  const syncShopify = useSyncShopify();
  const syncMeta    = useSyncMeta();
  const syncIthink  = useSyncIthink();
  const syncJudgeme = useSyncJudgeme();
  const syncGA4     = useSyncGA4();

  const key  = h.connector_name;
  const meta = CONNECTOR_META[key] ?? { label: key };

  const triggers: Partial<Record<string, () => void>> = {
    shopify:  () => { onSyncStart(); syncShopify.mutate(undefined, { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
    meta_ads: () => { onSyncStart(); syncMeta.mutate(undefined,    { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
    ithink:   () => { onSyncStart(); syncIthink.mutate(undefined,  { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
    judgeme:  () => { onSyncStart(); syncJudgeme.mutate(undefined, { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
    ga4:      () => { onSyncStart(); syncGA4.mutate(undefined,     { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
  };
  const trigger = triggers[key];

  const isSyncing  = syncState === 'syncing';
  const isDisabled = isSyncing || syncState === 'success' || syncState === 'cooldown';

  /* Prefer local timestamp if more recent than API-reported last_sync_at */
  const effectiveLastSync = (() => {
    if (!localSyncAt) return h.last_sync_at;
    const apiTs = h.last_sync_at ? new Date(h.last_sync_at).getTime() : 0;
    return localSyncAt > apiTs ? new Date(localSyncAt).toISOString() : h.last_sync_at;
  })();

  /* ── Brand icon (syncing overlays a spinner badge) ── */
  const brand = (
    <span className="relative inline-flex shrink-0">
      <BrandIcon connector={key} size={22} className={isSyncing ? 'opacity-60' : ''} />
      {isSyncing && (
        <span className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center bg-white rounded-full w-3 h-3 ring-1 ring-white">
          <Loader2 size={9} strokeWidth={2.5} className="animate-spin text-amber-500" />
        </span>
      )}
    </span>
  );

  /* ── Time label ── */
  const timeLabel = isSyncing
    ? <span className="text-[11px] text-amber-500 animate-pulse">Syncing…</span>
    : syncState === 'success'
      ? <span className="text-[11px] text-emerald-600 flex items-center gap-0.5 font-medium"><Check size={9} strokeWidth={3} />Just now</span>
      : syncState === 'error'
        ? <span className="text-[11px] text-red-500" title="Sync failed — try again">Failed</span>
        : <span className="text-[11px] text-[#8C7B64] tabular-nums">{timeAgo(effectiveLastSync)}</span>;

  /* ── Action button icon ── */
  const actionIcon = isSyncing
    ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
    : syncState === 'success'
      ? <Check size={12} strokeWidth={2.5} />
      : syncState === 'error'
        ? <AlertCircle size={12} strokeWidth={1.5} />
        : <RefreshCw size={12} strokeWidth={1.5} />;

  return (
    <div className={cn(
      'flex items-center justify-between gap-3 py-2 px-1 rounded transition-all duration-500',
      syncState === 'success' ? 'bg-emerald-50' : 'hover:bg-[#F5F0E8]',
    )}>
      <div className="flex items-center gap-2.5">
        {brand}
        <span className="text-[13px] font-medium text-[#1A1208]">{meta.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {timeLabel}
        {trigger && (
          <button
            type="button"
            onClick={trigger}
            disabled={isDisabled}
            title={
              syncState === 'error'    ? 'Sync failed — click to retry'
              : syncState === 'cooldown' ? 'Synced recently'
              : `Sync ${meta.label}`
            }
            className={cn(
              'transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed active:scale-75',
              syncState === 'error'
                ? 'text-red-500 hover:text-red-600'
                : syncState === 'success'
                  ? 'text-emerald-500'
                  : 'text-[#8C7B64] hover:text-[#B8860B]',
            )}
          >
            {actionIcon}
          </button>
        )}
      </div>
    </div>
  );
}

export function TopNav() {
  const dispatch            = useAppDispatch();
  const range               = useAppSelector((s) => s.range);
  const { health, refetch } = useConnectorHealth();
  const syncAll             = useSyncAll();

  const [showPicker,      setShowPicker]      = useState(false);
  const [showSources,     setShowSources]     = useState(false);
  const [syncStates,      setSyncStates]      = useState<Record<string, ConnSyncState>>({});
  const [localSyncAt,     setLocalSyncAt]     = useState<Record<string, number>>({});
  const [syncAllCooldown, setSyncAllCooldown] = useState(false);

  const handlePreset = useCallback((p: Exclude<RangePreset, 'custom'>) => {
    dispatch(setPreset(p));
    setShowPicker(false);
  }, [dispatch]);

  /* const handleApply = useCallback((start: string, end: string) => {
    dispatch(setCustomRange({ startDate: start, endDate: end }));
    setShowPicker(false);
  }, [dispatch]); // re-enable with Custom date button */

  /* Per-connector state machine — guards against stale timeouts overwriting newer states */
  const setConnState = useCallback((key: string, state: ConnSyncState) => {
    setSyncStates((prev) => ({ ...prev, [key]: state }));
    if (state === 'success') {
      setTimeout(() => setSyncStates((prev) => prev[key] === 'success' ? { ...prev, [key]: 'cooldown' } : prev), 3000);
      setTimeout(() => setSyncStates((prev) => prev[key] === 'cooldown' ? { ...prev, [key]: null }     : prev), 10000);
    } else if (state === 'error') {
      setTimeout(() => setSyncStates((prev) => prev[key] === 'error'   ? { ...prev, [key]: null }     : prev), 5000);
    }
  }, []);

  const handleSyncAll = useCallback(() => {
    /* Stagger visual syncing state — only overwrite if not already in a terminal state */
    health.forEach((h, i) => {
      setTimeout(() => {
        setSyncStates((prev) =>
          prev[h.connector_name] == null
            ? { ...prev, [h.connector_name]: 'syncing' }
            : prev,
        );
      }, i * 90);
    });

    syncAll.mutate(undefined, {
      onSuccess: () => {
        const now = Date.now();
        setLocalSyncAt((prev) => {
          const next = { ...prev };
          health.forEach((h) => { next[h.connector_name] = now; });
          return next;
        });
        health.forEach((h) => setConnState(h.connector_name, 'success'));
        setSyncAllCooldown(true);
        setTimeout(() => setSyncAllCooldown(false), 10000);
        refetch();
        setTimeout(() => setShowSources(false), 1500);
      },
      onError: () => {
        health.forEach((h) => setConnState(h.connector_name, 'error'));
      },
    });
  }, [health, syncAll, refetch, setConnState]);

  const pickerRef  = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker && !showSources) return;
    function onOutside(e: MouseEvent) {
      if (pickerRef.current  && !pickerRef.current.contains(e.target  as Node)) setShowPicker(false);
      if (sourcesRef.current && !sourcesRef.current.contains(e.target as Node)) setShowSources(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [showPicker, showSources]);

  // const customLabel = range.preset === 'custom' ? `${range.startDate} → ${range.endDate}` : 'Custom'; // re-enable with Custom date button
  const syncingCount    = health.filter((h) => syncStates[h.connector_name] === 'syncing').length;
  const isSyncingAny    = syncAll.isPending || syncingCount > 0;
  const isSyncAllDisabled = isSyncingAny || syncAllCooldown;

  /* ── Sync All button label ── */
  const syncAllLabel = isSyncingAny
    ? syncingCount > 0
      ? `Syncing ${syncingCount}/${health.length}…`
      : 'Syncing…'
    : syncAllCooldown
      ? 'Synced'
      : 'Sync All';

  const syncAllIcon = isSyncingAny
    ? <Loader2 size={11} strokeWidth={1.5} className="animate-spin shrink-0" />
    : syncAllCooldown
      ? <Check size={11} strokeWidth={2.5} className="shrink-0" />
      : <RefreshCw size={11} strokeWidth={1.5} className="shrink-0" />;

  return (
    <header className="bg-white border-b border-[#F0EBE0] px-4 sm:px-6 flex items-center gap-4 h-[52px] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-1.5 shrink-0">
        <img src="/shayn-logo.jpg" alt="SHAYN" className="h-9 w-9 rounded-xl object-contain bg-white border border-[#D4AF37]/50 shadow-sm" />
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
                  : 'border-transparent text-[#8C7B64] hover:text-[#1A1208]',
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
            { key: '7d',  label: '7D'  },
            { key: '30d', label: '30D' },
            { key: 'all', label: 'All' },
          ] as { key: Exclude<RangePreset, 'custom'>; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePreset(key)}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                range.preset === key
                  ? 'bg-white text-[#1A1208] shadow-sm font-semibold'
                  : 'text-[#8C7B64] hover:text-[#1A1208]',
              )}
            >
              {label}
            </button>
          ))}

          {/* Custom date — temporarily hidden, uncomment to re-enable */}
          {/* <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowPicker((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                range.preset === 'custom'
                  ? 'bg-[#B8860B] text-white font-semibold'
                  : 'text-[#8C7B64] hover:text-[#1A1208]',
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
          </div> */}
        </div>

        {/* Sync Status button + dropdown */}
        <div className="relative" ref={sourcesRef}>
          <button
            onClick={() => setShowSources((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              showSources
                ? 'border-[#B8860B] text-[#B8860B] bg-[#FDF8F0]'
                : 'border-[#E8E0D0] text-[#8C7B64] hover:border-[#B8860B] hover:text-[#B8860B]',
            )}
          >
            <span className="relative inline-flex items-center justify-center w-[10px] h-[10px] shrink-0">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-[beacon-ring_1.8s_ease-out_infinite]" />
              <span className="absolute inline-flex w-[60%] h-[60%] rounded-full bg-emerald-400 opacity-40 animate-[beacon-ring_1.8s_ease-out_0.6s_infinite]" />
              <span className="relative inline-flex w-[8px] h-[8px] rounded-full bg-emerald-500" />
            </span>
            Sync Status
          </button>

          {showSources && (
            <div className="absolute top-full right-0 mt-2 z-50 w-60 bg-white rounded-xl shadow-lg border border-[#F0EBE0] p-3">
              <p className="text-[10px] font-semibold text-[#8C7B64] uppercase tracking-widest mb-1 px-1">
                Sync Status
              </p>
              <div className="flex flex-col">
                {health.length === 0 ? (
                  <p className="text-[12px] text-[#8C7B64] px-1 py-2">No connectors found</p>
                ) : (
                  health.map((h) => (
                    <ConnectorRow
                      key={h.connector_name}
                      h={h}
                      syncState={syncStates[h.connector_name] ?? null}
                      localSyncAt={localSyncAt[h.connector_name] ?? null}
                      onSynced={refetch}
                      onSyncStart={() => setConnState(h.connector_name, 'syncing')}
                      onSyncSuccess={() => {
                        setLocalSyncAt((prev) => ({ ...prev, [h.connector_name]: Date.now() }));
                        setConnState(h.connector_name, 'success');
                      }}
                      onSyncError={() => {
                        setConnState(h.connector_name, 'error');
                      }}
                    />
                  ))
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-[#F0EBE0]">
                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={isSyncAllDisabled}
                  className={cn(
                    'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold',
                    'transition-all duration-200 active:scale-[0.97]',
                    isSyncAllDisabled
                      ? 'bg-[#B8860B]/60 text-white cursor-not-allowed'
                      : syncAllCooldown
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#B8860B] text-white hover:bg-[#a07809]',
                  )}
                >
                  {syncAllIcon}
                  {syncAllLabel}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
