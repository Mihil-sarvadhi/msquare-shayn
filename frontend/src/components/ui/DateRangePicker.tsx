import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onApply: (start: string, end: string) => void;
  onClose: () => void;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['M','T','W','T','F','S','S'];

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseISO(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function fmtDisplay(iso: string): string {
  const d = parseISO(iso);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Presets ────────────────────────────────────────────────────────────────

type PresetKey = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'fqtd' | 'fytd' | 'all';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today',      label: 'Today'            },
  { key: 'yesterday',  label: 'Yesterday'         },
  { key: '7d',         label: 'Last 7 days'       },
  { key: '30d',        label: 'Last 30 days'      },
  { key: 'this_month', label: 'This month'        },
  { key: 'last_month', label: 'Last month'        },
  { key: 'fqtd',       label: 'This quarter (FY)' },
  { key: 'fytd',       label: 'This year (FY)'    },
  { key: 'all',        label: 'All time'          },
];

function resolvePreset(key: PresetKey): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const td = toYMD(today);
  const shift = (n: number) => { const x = new Date(today); x.setDate(x.getDate() + n); return toYMD(x); };

  switch (key) {
    case 'today':      return { start: td, end: td };
    case 'yesterday':  return { start: shift(-1), end: shift(-1) };
    case '7d':         return { start: shift(-6), end: td };
    case '30d':        return { start: shift(-29), end: td };
    case 'this_month': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: toYMD(s), end: toYMD(e) };
    }
    case 'last_month': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toYMD(s), end: toYMD(e) };
    }
    case 'fqtd': {
      const m  = today.getMonth();
      const fy = m >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      if (m >= 3 && m <= 5)  return { start: toYMD(new Date(fy,   3, 1)), end: toYMD(new Date(fy,   5, 30)) };
      if (m >= 6 && m <= 8)  return { start: toYMD(new Date(fy,   6, 1)), end: toYMD(new Date(fy,   8, 30)) };
      if (m >= 9 && m <= 11) return { start: toYMD(new Date(fy,   9, 1)), end: toYMD(new Date(fy,  11, 31)) };
      return                          { start: toYMD(new Date(fy+1, 0, 1)), end: toYMD(new Date(fy+1, 2, 31)) };
    }
    case 'fytd': {
      const fy = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      return { start: toYMD(new Date(fy, 3, 1)), end: toYMD(new Date(fy+1, 2, 31)) };
    }
    case 'all': return { start: '2020-01-01', end: td };
  }
}

// ── Calendar month grid ────────────────────────────────────────────────────

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const offset   = (firstDay + 6) % 7;               // Monday first
  const total    = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface MonthGridProps {
  year: number;
  month: number;
  selStart: string;
  selEnd: string;
  hover: string;
  onDayClick: (iso: string) => void;
  onDayHover: (iso: string) => void;
}

function MonthGrid({ year, month, selStart, selEnd, hover, onDayClick, onDayHover }: MonthGridProps) {
  const cells   = buildGrid(year, month);
  const todayS  = toYMD(new Date());

  const startD  = parseISO(selStart);
  const endD    = parseISO(selEnd);
  const hoverD  = parseISO(hover);
  const effEnd  = startD && !selEnd && hoverD ? hoverD : endD;

  return (
    <div className="w-[196px]">
      <div className="text-center text-[13px] font-semibold text-[#1A1208] mb-3">
        {MONTHS[month]} {year}
      </div>
      <div className="grid grid-cols-7 mb-1.5">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-[#A89880] h-6 flex items-center justify-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="h-8" />;
          const iso     = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const d       = new Date(year, month, day);
          const isStart = iso === selStart;
          const isEnd   = !!selEnd && iso === selEnd;
          const isToday = iso === todayS;
          const isEdge  = isStart || isEnd;

          let inRange = false;
          if (startD && effEnd) {
            const lo = startD <= effEnd ? startD : effEnd;
            const hi = startD <= effEnd ? effEnd  : startD;
            inRange  = d > lo && d < hi;
          }

          // Rounded edges for range pill
          const isRangeStart = inRange && (
            day === 1 ||
            new Date(year, month, day - 1) < (startD && effEnd ? (startD <= effEnd ? startD : effEnd) : startD!)
          );
          const isRangeEnd = inRange && (
            day === new Date(year, month + 1, 0).getDate() ||
            new Date(year, month, day + 1) > (startD && effEnd ? (startD <= effEnd ? effEnd : startD) : endD!)
          );

          return (
            <div
              key={iso}
              className={cn(
                'h-8 relative flex items-center justify-center',
                inRange && 'bg-[#FBF0D4]',
                inRange && isRangeStart && 'rounded-l-full',
                inRange && isRangeEnd   && 'rounded-r-full',
                isStart && selEnd && 'rounded-l-full bg-[#FBF0D4]',
                isEnd   && selStart && 'rounded-r-full bg-[#FBF0D4]',
              )}
            >
              <button
                onClick={() => onDayClick(iso)}
                onMouseEnter={() => onDayHover(iso)}
                onMouseLeave={() => onDayHover('')}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium transition-all duration-100 z-10 relative',
                  isEdge  && 'bg-[#B8860B] text-white font-bold',
                  isToday && !isEdge && 'ring-1 ring-[#B8860B] text-[#B8860B] font-semibold',
                  !isEdge && inRange && 'text-[#7A5C00]',
                  !isEdge && !inRange && 'text-[#1A1208] hover:bg-[#F5E9CC]',
                )}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function DateRangePicker({ startDate, endDate, onApply, onClose }: DateRangePickerProps) {
  const today     = new Date();
  const defaultDates = startDate && endDate
    ? { start: startDate, end: endDate }
    : resolvePreset('30d');

  const [selStart, setSelStart] = useState(defaultDates.start);
  const [selEnd,   setSelEnd]   = useState(defaultDates.end);
  const [hover,    setHover]    = useState('');
  const [activePreset, setActivePreset] = useState<PresetKey | null>(
    startDate && endDate ? null : '30d'
  );

  // Left calendar month (right = left + 1)
  const [viewYear,  setViewYear]  = useState(() => {
    const d = parseISO(defaultDates.start);
    return d ? d.getFullYear() : today.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseISO(defaultDates.start);
    const m = d ? d.getMonth() : today.getMonth();
    return m === 11 ? 10 : m;
  });

  const rightMonth = viewMonth === 11 ? 0  : viewMonth + 1;
  const rightYear  = viewMonth === 11 ? viewYear + 1 : viewYear;

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }, [viewMonth]);

  const handleDayClick = useCallback((iso: string) => {
    setActivePreset(null);
    if (!selStart || (selStart && selEnd)) {
      setSelStart(iso);
      setSelEnd('');
    } else {
      if (iso < selStart) { setSelEnd(selStart); setSelStart(iso); }
      else setSelEnd(iso);
    }
  }, [selStart, selEnd]);

  const handlePreset = useCallback((key: PresetKey) => {
    const { start, end } = resolvePreset(key);
    setSelStart(start);
    setSelEnd(end);
    setActivePreset(key);
    // Navigate calendar to show the start month
    const d = parseISO(start);
    if (d) {
      const m = d.getMonth();
      setViewYear(d.getFullYear());
      setViewMonth(m === 11 ? 10 : m);
    }
  }, []);

  const handleApply = useCallback(() => {
    if (selStart && selEnd) onApply(selStart, selEnd);
  }, [selStart, selEnd, onApply]);

  const canApply = !!(selStart && selEnd);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-2xl flex overflow-hidden select-none" style={{ width: 580 }}>

      {/* ── Left sidebar: presets ───────────────────────────────── */}
      <div className="w-[160px] border-r border-[#F0EBE0] py-2 shrink-0">
        <p className="text-[9px] font-bold text-[#A89880] uppercase tracking-widest px-4 py-2">Quick select</p>
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className={cn(
              'w-full text-left px-4 py-2 text-[13px] font-medium transition-colors',
              activePreset === key
                ? 'text-[#B8860B] bg-[#FBF0D4] font-semibold'
                : 'text-[#3D2E1A] hover:bg-[#F5F0E8] hover:text-[#B8860B]',
            )}
          >
            {label}
          </button>
        ))}
        <div className="border-t border-[#F0EBE0] mt-2 pt-2">
          <button
            onClick={() => { setActivePreset(null); setSelStart(''); setSelEnd(''); }}
            className="w-full text-left px-4 py-2 text-[13px] font-medium text-[#3D2E1A] hover:bg-[#F5F0E8] hover:text-[#B8860B] transition-colors"
          >
            Custom range
          </button>
        </div>
      </div>

      {/* ── Right panel: inputs + calendar ─────────────────────── */}
      <div className="flex flex-col flex-1">

        {/* Date input row */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-[#F0EBE0]">
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-[#A89880] mb-1">Start date</p>
            <div className={cn(
              'rounded-lg border px-3 py-2 text-[13px] font-medium min-h-[36px]',
              selStart ? 'border-[#B8860B] text-[#1A1208]' : 'border-[#E8E0D0] text-[#C4B49E]',
            )}>
              {selStart ? fmtDisplay(selStart) : 'Select date'}
            </div>
          </div>
          <div className="text-[#C4B49E] text-lg mt-4">–</div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-[#A89880] mb-1">End date</p>
            <div className={cn(
              'rounded-lg border px-3 py-2 text-[13px] font-medium min-h-[36px]',
              selEnd ? 'border-[#B8860B] text-[#1A1208]' : 'border-[#E8E0D0] text-[#C4B49E]',
            )}>
              {selEnd ? fmtDisplay(selEnd) : 'Select date'}
            </div>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <button
            onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5E9CC] text-[#8C7B64] transition-colors"
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <div className="flex gap-[28px]">
            <span className="w-[196px] text-center text-[13px] font-semibold text-[#1A1208]">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <span className="w-[196px] text-center text-[13px] font-semibold text-[#1A1208]">
              {MONTHS[rightMonth]} {rightYear}
            </span>
          </div>
          <button
            onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5E9CC] text-[#8C7B64] transition-colors"
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Dual calendar */}
        <div className="flex gap-7 px-5 pb-2">
          <MonthGrid
            year={viewYear} month={viewMonth}
            selStart={selStart} selEnd={selEnd} hover={hover}
            onDayClick={handleDayClick} onDayHover={setHover}
          />
          <MonthGrid
            year={rightYear} month={rightMonth}
            selStart={selStart} selEnd={selEnd} hover={hover}
            onDayClick={handleDayClick} onDayHover={setHover}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#F0EBE0] mt-auto">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-semibold text-[#8C7B64] hover:text-[#1A1208] transition-colors rounded-lg hover:bg-[#F5F0E8]"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!canApply}
            className="px-5 py-2 text-[13px] font-bold bg-[#B8860B] text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#9A720A] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
