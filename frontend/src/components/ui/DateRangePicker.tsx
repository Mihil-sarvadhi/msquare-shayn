import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onApply: (start: string, end: string) => void;
  onClose: () => void;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

type View = 'calendar' | 'months' | 'years';

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseISO(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getYearRange(centerYear: number): number[] {
  const start = Math.floor(centerYear / 12) * 12 - 4;
  return Array.from({ length: 16 }, (_, i) => start + i);
}

export function DateRangePicker({ startDate, endDate, onApply, onClose }: DateRangePickerProps) {
  const today = new Date();
  const initYear  = today.getFullYear();
  const initMonth = today.getMonth();

  const [year,     setYear]     = useState(initYear);
  const [month,    setMonth]    = useState(initMonth);
  const [view,     setView]     = useState<View>('calendar');
  const [yearPage, setYearPage] = useState(initYear);
  const [selStart, setSelStart] = useState<string>(startDate);
  const [selEnd,   setSelEnd]   = useState<string>(endDate);
  const [hover,    setHover]    = useState<string>('');

  const prevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }, [month]);

  const handleDayClick = useCallback((iso: string) => {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(iso);
      setSelEnd('');
    } else {
      if (iso < selStart) {
        setSelEnd(selStart);
        setSelStart(iso);
      } else {
        setSelEnd(iso);
      }
    }
  }, [selStart, selEnd]);

  const handleApply = useCallback(() => {
    if (selStart && selEnd) onApply(selStart, selEnd);
  }, [selStart, selEnd, onApply]);

  const handleClear = useCallback(() => {
    setSelStart('');
    setSelEnd('');
  }, []);

  const handleMonthSelect = useCallback((m: number) => {
    setMonth(m);
    setView('calendar');
  }, []);

  const handleYearSelect = useCallback((y: number) => {
    setYear(y);
    setView('calendar');
  }, []);

  // Build calendar grid
  const firstDay  = startOfMonth(year, month).getDay();
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const startD     = parseISO(selStart);
  const endD       = parseISO(selEnd);
  const hoverD     = parseISO(hover);
  const todayISO   = toISO(today);
  const effectiveEnd = selStart && !selEnd && hoverD ? hoverD : endD;

  function getDayState(day: number) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const d   = new Date(year, month, day);
    const isStart   = !!startD && sameDay(d, startD);
    const isEnd     = !!endD   && sameDay(d, endD);
    const isToday   = iso === todayISO;
    const isHovered = iso === hover;
    let inRange = false;
    if (startD && effectiveEnd) {
      const lo = startD <= effectiveEnd ? startD : effectiveEnd;
      const hi = startD <= effectiveEnd ? effectiveEnd : startD;
      inRange  = d > lo && d < hi;
    }
    return { iso, isStart, isEnd, inRange, isToday, isHovered };
  }

  const canApply = !!(selStart && selEnd);

  function fmtLabel(iso: string) {
    if (!iso) return '—';
    const d = parseISO(iso);
    if (!d) return iso;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const years = getYearRange(yearPage);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E0D0] shadow-2xl w-[300px] overflow-hidden select-none">

      {/* Header bar */}
      <div className="bg-[#B8860B] px-4 py-3 flex items-center justify-between">
        <button
          onClick={view === 'years' ? () => { setYearPage((y) => y - 16); } : prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-white"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>

        <div className="flex items-center gap-1.5">
          {/* Month button */}
          {view !== 'years' && (
            <button
              onClick={() => setView(view === 'months' ? 'calendar' : 'months')}
              className="text-white text-sm font-bold tracking-wide px-1.5 py-0.5 rounded hover:bg-white/20 transition-colors"
            >
              {MONTHS[month]}
            </button>
          )}
          {/* Year button */}
          <button
            onClick={() => { setYearPage(year); setView(view === 'years' ? 'calendar' : 'years'); }}
            className="text-white text-sm font-bold tracking-wide px-1.5 py-0.5 rounded hover:bg-white/20 transition-colors"
          >
            {view === 'years' ? `${years[0]}–${years[years.length - 1]}` : year}
          </button>
        </div>

        <button
          onClick={view === 'years' ? () => { setYearPage((y) => y + 16); } : nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-white"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* Selected range summary */}
      <div className="grid grid-cols-2 divide-x divide-[#F0EBE0] bg-[#FDFAF4] border-b border-[#F0EBE0]">
        <div className="px-3 py-2 text-center">
          <p className="text-[9px] font-bold text-[#B8860B] uppercase tracking-widest mb-0.5">From</p>
          <p className={cn('text-[11px] font-semibold', selStart ? 'text-[#1A1208]' : 'text-[#C4B49E]')}>
            {selStart ? fmtLabel(selStart) : 'Select date'}
          </p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-[9px] font-bold text-[#B8860B] uppercase tracking-widest mb-0.5">To</p>
          <p className={cn('text-[11px] font-semibold', selEnd ? 'text-[#1A1208]' : 'text-[#C4B49E]')}>
            {selEnd ? fmtLabel(selEnd) : 'Select date'}
          </p>
        </div>
      </div>

      {/* Month picker */}
      {view === 'months' && (
        <div className="grid grid-cols-3 gap-2 px-4 py-4">
          {MONTHS_SHORT.map((m, i) => (
            <button
              key={m}
              onClick={() => handleMonthSelect(i)}
              className={cn(
                'py-2 rounded-lg text-xs font-semibold transition-colors',
                i === month
                  ? 'bg-[#B8860B] text-white'
                  : 'text-[#1A1208] hover:bg-[#F5E9CC]',
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Year picker */}
      {view === 'years' && (
        <div className="grid grid-cols-4 gap-2 px-4 py-4">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => handleYearSelect(y)}
              className={cn(
                'py-2 rounded-lg text-xs font-semibold transition-colors',
                y === year
                  ? 'bg-[#B8860B] text-white'
                  : 'text-[#1A1208] hover:bg-[#F5E9CC]',
              )}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      {view === 'calendar' && (
        <>
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-[#C4B49E] tracking-wide">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 px-3 pb-2 gap-y-0.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const { iso, isStart, isEnd, inRange, isToday } = getDayState(day);
              const isEdge = isStart || isEnd;
              return (
                <button
                  key={iso}
                  onClick={() => handleDayClick(iso)}
                  onMouseEnter={() => setHover(iso)}
                  onMouseLeave={() => setHover('')}
                  className={cn(
                    'relative h-8 w-full flex items-center justify-center text-[12px] font-medium transition-all duration-100 rounded-lg',
                    inRange && 'bg-[#F5E9CC] text-[#7A5C00] rounded-none',
                    isEdge && 'bg-[#B8860B] text-white rounded-lg font-bold z-10',
                    isToday && !isEdge && 'ring-1 ring-[#B8860B] ring-inset',
                    !isEdge && !inRange && 'hover:bg-[#F5E9CC] text-[#1A1208]',
                    inRange && 'hover:bg-[#EDD99E]',
                  )}
                >
                  {day}
                  {isToday && !isEdge && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#B8860B]" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#F0EBE0] bg-[#FDFAF4]">
        <button
          onClick={handleClear}
          className="text-xs font-semibold text-[#8C7B64] hover:text-[#B8860B] transition-colors"
        >
          Clear
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-[#8C7B64] hover:text-[#1A1208] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!canApply}
            className="px-4 py-1.5 text-xs font-bold bg-[#B8860B] text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#9A720A] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
