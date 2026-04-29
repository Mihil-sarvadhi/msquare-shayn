import { useState, useCallback, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  RefreshCw, CalendarDays, Loader2, AlertCircle, Check, ChevronDown, Moon, Sun, LogOut,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setCustomRange } from '@store/slices/rangeSlice';
import { logout } from '@store/slices/authSlice';
import {
  useSyncAll, useSyncShopify, useSyncMeta, useSyncIthink, useSyncJudgeme, useSyncGA4,
  useSyncUnicommerce,
} from '@services/dashboard/dashboard.query';
import { DateRangePicker } from '@components/ui/DateRangePicker';
import { rangeLabel } from '@utils/common-functions/buildRangeParams';
import { cn } from '@/lib/utils';
import type { ConnectorHealth } from '@app/types/dashboard';
import baseService from '@services/configs/baseService';
import { API_ENDPOINTS } from '@utils/constants/api.constant';
import { BrandIcon } from '@components/shared/BrandIcon';
import { useTheme } from '@/hooks/useTheme';

/* ── Sync state machine ─────────────────────────────────────────────────── */
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
  { label: 'Dashboard',   to: '/dashboard'  },
  { label: 'Finance',     to: '/finance'    },
  { label: 'Catalog',     to: '/catalog'    },
  { label: 'Marketing',   to: '/marketing'  },
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'Customers',   to: '/customers'  },
  { label: 'Operations',  to: '/operations' },
  { label: 'Reviews',     to: '/reviews'    },
];

const CONNECTOR_META: Record<string, { label: string }> = {
  shopify:     { label: 'Shopify'     },
  meta_ads:    { label: 'Meta Ads'    },
  ithink:      { label: 'iThink'      },
  judgeme:     { label: 'Judge.me'    },
  ga4:         { label: 'GA4'         },
  unicommerce: { label: 'Unicommerce' },
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
  const syncShopify     = useSyncShopify();
  const syncMeta        = useSyncMeta();
  const syncIthink      = useSyncIthink();
  const syncJudgeme     = useSyncJudgeme();
  const syncGA4         = useSyncGA4();
  const syncUnicommerce = useSyncUnicommerce();

  const key  = h.connector_name;
  const meta = CONNECTOR_META[key] ?? { label: key };

  const triggers: Partial<Record<string, () => void>> = {
    shopify:     () => { onSyncStart(); syncShopify.mutate(undefined,     { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
    meta_ads:    () => { onSyncStart(); syncMeta.mutate(undefined,        { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
    ithink:      () => { onSyncStart(); syncIthink.mutate(undefined,      { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
    judgeme:     () => { onSyncStart(); syncJudgeme.mutate(undefined,     { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
    ga4:         () => { onSyncStart(); syncGA4.mutate(undefined,         { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
    unicommerce: () => { onSyncStart(); syncUnicommerce.mutate(undefined, { onSuccess: () => { onSyncSuccess(); onSynced(); }, onError: () => onSyncError() }); },
  };
  const trigger = triggers[key];

  const isSyncing  = syncState === 'syncing';
  const isDisabled = isSyncing || syncState === 'success' || syncState === 'cooldown';

  const effectiveLastSync = (() => {
    if (!localSyncAt) return h.last_sync_at;
    const apiTs = h.last_sync_at ? new Date(h.last_sync_at).getTime() : 0;
    return localSyncAt > apiTs ? new Date(localSyncAt).toISOString() : h.last_sync_at;
  })();

  const brand = (
    <span className="relative inline-flex shrink-0">
      <BrandIcon connector={key} size={22} className={isSyncing ? 'opacity-60' : ''} />
      {isSyncing && (
        <span className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center bg-[var(--surface)] rounded-full w-3 h-3 ring-1 ring-[var(--surface)]">
          <Loader2 size={9} strokeWidth={2.5} className="animate-spin text-[var(--amber)]" />
        </span>
      )}
    </span>
  );

  const timeLabel = isSyncing
    ? <span className="text-[11px] text-[var(--amber)] animate-pulse">Syncing…</span>
    : syncState === 'success'
      ? <span className="text-[11px] text-[var(--green)] flex items-center gap-0.5 font-medium"><Check size={9} strokeWidth={3} />Just now</span>
      : syncState === 'error'
        ? <span className="text-[11px] text-[var(--red)]" title="Sync failed — try again">Failed</span>
        : <span className="text-[11px] text-[var(--muted)] font-mono tabular-nums">{timeAgo(effectiveLastSync)}</span>;

  const actionIcon = isSyncing
    ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
    : syncState === 'success'
      ? <Check size={12} strokeWidth={2.5} />
      : syncState === 'error'
        ? <AlertCircle size={12} strokeWidth={1.5} />
        : <RefreshCw size={12} strokeWidth={1.5} />;

  return (
    <div className={cn(
      'flex items-center justify-between gap-3 py-2 px-1 rounded-lg transition-all duration-500',
      syncState === 'success' ? 'bg-[var(--green-soft)]' : 'hover:bg-[var(--surface-2)]',
    )}>
      <div className="flex items-center gap-2.5">
        {brand}
        <span className="text-[13px] font-medium text-[var(--ink)]">{meta.label}</span>
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
                ? 'text-[var(--red)] hover:opacity-80'
                : syncState === 'success'
                  ? 'text-[var(--green)]'
                  : 'text-[var(--muted)] hover:text-[var(--accent)]',
            )}
          >
            {actionIcon}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Theme toggle button ────────────────────────────────────────────────── */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle color theme"
      className={cn(
        'h-9 w-9 inline-flex items-center justify-center rounded-full',
        'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)]',
        'hover:border-[var(--line-2)] hover:text-[var(--ink)]',
        'transition-[transform,colors] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]',
        'hover:rotate-[45deg]',
      )}
    >
      {isDark
        ? <Sun  size={15} strokeWidth={1.6} />
        : <Moon size={15} strokeWidth={1.6} />}
    </button>
  );
}

/* ── Top header ─────────────────────────────────────────────────────────── */
export function TopNav() {
  const dispatch            = useAppDispatch();
  const navigate            = useNavigate();
  const range               = useAppSelector((s) => s.range);
  const user                = useAppSelector((s) => s.auth.user);
  const { health, refetch } = useConnectorHealth();
  const syncAll             = useSyncAll();

  const [showPicker,      setShowPicker]      = useState(false);
  const [showSources,     setShowSources]     = useState(false);
  const [showUserMenu,    setShowUserMenu]    = useState(false);
  const [loggingOut,      setLoggingOut]      = useState(false);
  const [syncStates,      setSyncStates]      = useState<Record<string, ConnSyncState>>({});
  const [localSyncAt,     setLocalSyncAt]     = useState<Record<string, number>>({});
  const [syncAllCooldown, setSyncAllCooldown] = useState(false);

  const handleApply = useCallback(
    (payload: { startDate: string; endDate: string; label: string; presetKey: string | null }) => {
      dispatch(setCustomRange(payload));
      setShowPicker(false);
    },
    [dispatch],
  );

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
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker && !showSources && !showUserMenu) return;
    function onOutside(e: MouseEvent) {
      if (pickerRef.current   && !pickerRef.current.contains(e.target   as Node)) setShowPicker(false);
      if (sourcesRef.current  && !sourcesRef.current.contains(e.target  as Node)) setShowSources(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [showPicker, showSources, showUserMenu]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await dispatch(logout()).unwrap();
    } catch {
      /* silent — local state is cleared in the thunk regardless */
    } finally {
      setShowUserMenu(false);
      setLoggingOut(false);
      navigate('/login', { replace: true });
    }
  }, [dispatch, navigate]);

  const syncingCount      = health.filter((h) => syncStates[h.connector_name] === 'syncing').length;
  const isSyncingAny      = syncAll.isPending || syncingCount > 0;
  const isSyncAllDisabled = isSyncingAny || syncAllCooldown;

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
    <header
      className={cn(
        'app-header-backdrop sticky top-0 z-50',
        'px-5 sm:px-7 h-[60px] flex items-center gap-5 shrink-0',
      )}
    >
      {/* ── Brand ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 shrink-0">
        <img
          src="/shayn-logo.jpg"
          alt="SHAYN"
          className={cn(
            'h-[34px] w-[34px] rounded-[10px] object-contain',
            'bg-[var(--surface)] border border-[var(--line)] shadow-[var(--shadow-sm)]',
          )}
        />
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-[18px] font-semibold tracking-tightish text-[var(--ink)]">SHAYN</span>
          <span className="text-[10px] uppercase tracking-widish font-semibold text-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-[2px] rounded-md">
            MIS
          </span>
        </div>
      </div>

      {/* ── Nav pills ────────────────────────────────────────────────── */}
      <nav
        className={cn(
          'hidden md:flex items-center gap-0.5 p-1 rounded-full',
          'bg-[var(--bg-2)] border border-[var(--line)]',
          'overflow-x-auto',
        )}
      >
        {NAV.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap',
                'transition-all duration-200',
                isActive
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Right controls ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 ml-auto shrink-0">

        {/* Date range */}
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className={cn(
              'h-9 inline-flex items-center gap-2 px-3 rounded-full',
              'text-[12.5px] font-medium border transition-all',
              showPicker
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--line-2)] hover:text-[var(--ink)]',
            )}
          >
            <CalendarDays size={13} strokeWidth={1.6} />
            <span className="whitespace-nowrap">{rangeLabel(range)}</span>
            <ChevronDown size={12} strokeWidth={2} className={cn('transition-transform', showPicker && 'rotate-180')} />
          </button>
          {showPicker && (
            <div className="absolute top-full right-0 mt-2 z-50">
              <DateRangePicker
                startDate={range.startDate}
                endDate={range.endDate}
                presetKey={range.presetKey}
                onApply={handleApply}
                onClose={() => setShowPicker(false)}
              />
            </div>
          )}
        </div>

        {/* Sync status pill (functionality preserved) */}
        <div className="relative" ref={sourcesRef}>
          <button
            type="button"
            onClick={() => setShowSources((v) => !v)}
            className={cn(
              'h-9 inline-flex items-center gap-2 px-3 rounded-full',
              'text-[12.5px] font-medium border transition-all',
              showSources
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--line-2)] hover:text-[var(--ink)]',
            )}
          >
            <span className="relative inline-flex items-center justify-center w-[10px] h-[10px] shrink-0">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[var(--green)] opacity-60 animate-[beacon-ring_1.8s_ease-out_infinite]" />
              <span className="absolute inline-flex w-[60%] h-[60%] rounded-full bg-[var(--green)] opacity-40 animate-[beacon-ring_1.8s_ease-out_0.6s_infinite]" />
              <span className="relative inline-flex w-[8px] h-[8px] rounded-full bg-[var(--green)]" />
            </span>
            Synced
          </button>

          {showSources && (
            <div className="absolute top-full right-0 mt-2 z-50 w-64 bg-[var(--surface)] rounded-[14px] shadow-[var(--shadow-md)] border border-[var(--line)] p-3">
              <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widish mb-1 px-1">
                Sync Status
              </p>
              <div className="flex flex-col">
                {health.length === 0 ? (
                  <p className="text-[12px] text-[var(--muted)] px-1 py-2">No connectors found</p>
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

              <div className="mt-2 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={isSyncAllDisabled}
                  className={cn(
                    'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold',
                    'transition-all duration-200 active:scale-[0.97]',
                    isSyncAllDisabled
                      ? 'bg-[var(--accent)]/60 text-white cursor-not-allowed'
                      : syncAllCooldown
                        ? 'bg-[var(--green)] text-white'
                        : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-2)]',
                  )}
                >
                  {syncAllIcon}
                  {syncAllLabel}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme switcher */}
        <ThemeToggle />

        {/* Avatar + user menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            title={user?.name ?? 'Account'}
            className={cn(
              'h-9 w-9 inline-flex items-center justify-center rounded-full',
              'text-white text-[13px] font-semibold tracking-wide',
              'shadow-[var(--shadow-sm)] ring-1 ring-[var(--line)] select-none',
              'transition-transform duration-200',
              showUserMenu ? 'scale-95' : 'hover:scale-105',
            )}
            style={{ background: 'linear-gradient(135deg, #B8893E 0%, #5A3F12 100%)' }}
          >
            {(user?.name?.[0] ?? 'S').toUpperCase()}
          </button>

          {showUserMenu && (
            <div
              role="menu"
              className={cn(
                'absolute top-full right-0 mt-2 z-50 w-64',
                'bg-[var(--surface)] rounded-[14px] shadow-[var(--shadow-md)] border border-[var(--line)]',
                'overflow-hidden',
              )}
            >
              {/* User header */}
              <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-[var(--line)]">
                <span
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full text-white text-[15px] font-semibold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #B8893E 0%, #5A3F12 100%)' }}
                  aria-hidden
                >
                  {(user?.name?.[0] ?? 'S').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--ink)] truncate" title={user?.name}>
                    {user?.name ?? 'SHAYN'}
                  </p>
                  <p className="text-[11.5px] text-[var(--muted)] truncate" title={user?.email}>
                    {user?.email ?? '—'}
                  </p>
                  {user?.role && (
                    <span className="mt-1 inline-block text-[10px] uppercase tracking-widish font-medium px-1.5 py-[2px] rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
                      {user.role.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Logout */}
              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
                    'text-[13px] font-medium',
                    'text-[var(--red)] hover:bg-[var(--red-soft)]',
                    'transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                >
                  {loggingOut
                    ? <Loader2 size={14} strokeWidth={1.6} className="animate-spin" />
                    : <LogOut size={14} strokeWidth={1.6} />}
                  {loggingOut ? 'Signing out…' : 'Log out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
