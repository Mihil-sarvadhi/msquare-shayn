import { useState, useCallback, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { RefreshCw, CalendarDays } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setPreset, setCustomRange } from '@store/slices/rangeSlice';
import type { RangePreset } from '@store/slices/rangeSlice';
import { useSyncAll } from '@services/dashboard/dashboard.query';
import { DateRangePicker } from '@components/ui/DateRangePicker';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard',  to: '/dashboard'  },
  { label: 'Marketing',  to: '/marketing'  },
  { label: 'Customers',  to: '/customers'  },
  { label: 'Operations', to: '/operations' },
  { label: 'Reviews',    to: '/reviews'    },
];

export function TopNav() {
  const dispatch   = useAppDispatch();
  const range      = useAppSelector((s) => s.range);
  const syncAll    = useSyncAll();

  const [showPicker, setShowPicker] = useState(false);

  const handlePreset = useCallback((p: Exclude<RangePreset, 'custom'>) => {
    dispatch(setPreset(p));
    setShowPicker(false);
  }, [dispatch]);

  const handleApply = useCallback((start: string, end: string) => {
    dispatch(setCustomRange({ startDate: start, endDate: end }));
    setShowPicker(false);
  }, [dispatch]);

  const handleTogglePicker = useCallback(() => {
    setShowPicker((v) => !v);
  }, []);

  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    function handleOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showPicker]);

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

      {/* Right — range selector + health dots + sync */}
      <div className="flex items-center gap-3 ml-auto shrink-0">

        {/* Range selector */}
        <div className="flex gap-1 bg-[#F5F0E8] rounded-lg p-1">
          {([
            { key: '7d',  label: '7 Days'    },
            { key: '30d', label: '30 Days'   },
            { key: 'all', label: 'All Time'  },
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

          {/* Custom date button + popover */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={handleTogglePicker}
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


        {/* Sync All */}
        <button
          onClick={() => syncAll.mutate()}
          disabled={syncAll.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B8860B] text-white hover:bg-[#B8860B]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw size={12} strokeWidth={1.5} className={syncAll.isPending ? 'animate-spin' : ''} />
          {syncAll.isPending ? 'Syncing…' : 'Sync All'}
        </button>
      </div>
    </header>
  );
}
