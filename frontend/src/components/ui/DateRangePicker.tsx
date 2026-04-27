import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  presetKey?: string | null;
  onApply: (payload: {
    startDate: string;
    endDate: string;
    label: string;
    presetKey: string | null;
  }) => void;
  onClose: () => void;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseYMD(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); }
function addYears(d: Date, n: number): Date { return new Date(d.getFullYear() + n, d.getMonth(), d.getDate()); }
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function startOfWeek(d: Date): Date { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); return x; }
function currentFQ(d: Date): { fyStart: number; q: number } {
  const m = d.getMonth(); const y = d.getFullYear();
  if (m < 3) return { fyStart: y - 1, q: 4 };
  return { fyStart: y, q: Math.floor((m - 3) / 3) + 1 };
}
function fqRange(fyStart: number, q: number): { start: Date; end: Date } {
  const startMonth = q === 4 ? 0 : 3 + (q - 1) * 3;
  const startYear  = q === 4 ? fyStart + 1 : fyStart;
  return { start: new Date(startYear, startMonth, 1), end: new Date(startYear, startMonth + 3, 0) };
}
function fqLabel(fyStart: number, q: number): string {
  return `Q${q} FY${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
}
function startOfFQ(d: Date): Date { const { fyStart, q } = currentFQ(d); return fqRange(fyStart, q).start; }
function startOfYear(d: Date): Date { return new Date(d.getFullYear(), 0, 1); }
function endOfYear(d: Date): Date { return new Date(d.getFullYear(), 11, 31); }
function fmtDisplay(iso: string): string {
  const d = parseYMD(iso); if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}
function parseDateInput(s: string): Date | null {
  const t = s.trim(); if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  if (dt > todayD) return null;
  return dt;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface PresetRange { start: Date; end: Date; label: string; key: string }

function resolvePreset(key: string): PresetRange | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  switch (key) {
    case 'today':      return { start: today, end: today, label: 'Today', key };
    case 'yesterday': { const y = addDays(today, -1); return { start: y, end: y, label: 'Yesterday', key }; }
    case 'last_7d':    return { start: addDays(today, -6),   end: today, label: 'Last 7 days',   key };
    case 'last_30d':   return { start: addDays(today, -29),  end: today, label: 'Last 30 days',  key };
    case 'last_90d':   return { start: addDays(today, -89),  end: today, label: 'Last 90 days',  key };
    case 'last_365d':  return { start: addDays(today, -364), end: today, label: 'Last 365 days', key };
    case 'last_week': { const end = addDays(startOfWeek(today), -1); const start = addDays(end, -6); return { start, end, label: 'Last week', key }; }
    case 'last_month': { const s = startOfMonth(addMonths(today, -1)); const e = endOfMonth(s); return { start: s, end: e, label: 'Last month', key }; }
    case 'last_quarter': {
      const cur = currentFQ(today);
      let q = cur.q - 1; let fyStart = cur.fyStart;
      if (q === 0) { q = 4; fyStart--; }
      const { start, end } = fqRange(fyStart, q);
      return { start, end, label: 'Last quarter', key };
    }
    case 'last_12m': { const s = addMonths(today, -12); return { start: s, end: today, label: 'Last 12 months', key }; }
    case 'last_year': { const s = startOfYear(addYears(today, -1)); const e = endOfYear(s); return { start: s, end: e, label: 'Last year', key }; }
    case 'wtd':        return { start: startOfWeek(today),    end: today, label: 'Week to date',    key };
    case 'mtd':        return { start: startOfMonth(today),   end: today, label: 'Month to date',   key };
    case 'qtd':        return { start: startOfFQ(today),      end: today, label: 'Quarter to date', key };
    case 'ytd':        return { start: startOfYear(today),    end: today, label: 'Year to date',    key };
    default: {
      const match = key.match(/^fq([1-4])_(\d{4})$/);
      if (match) {
        const q = Number(match[1]); const fyStart = Number(match[2]);
        const { start, end } = fqRange(fyStart, q);
        return { start, end, label: fqLabel(fyStart, q), key };
      }
      return null;
    }
  }
}

function buildQuarterList(): { key: string; label: string }[] {
  const today = new Date();
  const cur = currentFQ(today);
  const out: { key: string; label: string }[] = [];
  for (let q = cur.q; q >= 1; q--) {
    out.push({ key: `fq${q}_${cur.fyStart}`, label: fqLabel(cur.fyStart, q) });
  }
  const prevFY = cur.fyStart - 1;
  for (let q = 4; q >= 1; q--) {
    out.push({ key: `fq${q}_${prevFY}`, label: fqLabel(prevFY, q) });
  }
  return out;
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const total    = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
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
  const cells  = buildGrid(year, month);
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  const todayS = toYMD(todayD);

  const startD = parseYMD(selStart);
  const endD   = parseYMD(selEnd);
  const hoverD = parseYMD(hover);
  const effEnd = startD && !selEnd && hoverD ? hoverD : endD;

  return (
    <div className="w-[182px]">
      <div className="grid grid-cols-7 mb-0.5">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-[#8C7B64] h-5 flex items-center justify-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="h-6" />;
          const iso      = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const d        = new Date(year, month, day);
          const isStart  = iso === selStart;
          const isEnd    = !!selEnd && iso === selEnd;
          const isToday  = iso === todayS;
          const isEdge   = isStart || isEnd;
          const disabled = d > todayD;

          let inRange = false;
          if (startD && effEnd) {
            const lo = startD <= effEnd ? startD : effEnd;
            const hi = startD <= effEnd ? effEnd  : startD;
            inRange  = d > lo && d < hi;
          }

          const hasRange = !!(startD && effEnd && startD.getTime() !== effEnd.getTime());
          const showEdgeConnector = isEdge && hasRange;
          const connectorSide: 'left' | 'right' | null = !showEdgeConnector
            ? null
            : isStart
              ? 'right'
              : 'left';

          return (
            <div
              key={iso}
              className={cn(
                'h-6 relative flex items-center justify-center',
                inRange && !disabled && 'bg-[#FBF0D4]',
              )}
            >
              {connectorSide && !disabled && (
                <div
                  className={cn(
                    'absolute inset-y-0 bg-[#FBF0D4]',
                    connectorSide === 'right' ? 'left-1/2 right-0' : 'left-0 right-1/2',
                  )}
                />
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onDayClick(iso)}
                onMouseEnter={() => !disabled && onDayHover(iso)}
                onMouseLeave={() => onDayHover('')}
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-medium transition-colors relative z-10',
                  disabled && 'text-[#D6CCB8] cursor-not-allowed',
                  !disabled && isEdge && 'bg-[#B8860B] text-white font-semibold',
                  !disabled && isToday && !isEdge && 'font-bold text-[#1A1208]',
                  !disabled && !isEdge && !isToday && inRange && 'text-[#7A5C00]',
                  !disabled && !isEdge && !isToday && !inRange && 'text-[#1A1208] hover:bg-[#F5E9CC]',
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

type MenuView = 'main' | 'last' | 'period' | 'quarters';

const MAIN_ITEMS: { key: string; label: string; view: MenuView | null; sep?: boolean }[] = [
  { key: 'today',     label: 'Today',          view: null },
  { key: 'yesterday', label: 'Yesterday',      view: null,       sep: true },
  { key: 'last',      label: 'Last',           view: 'last' },
  { key: 'period',    label: 'Period to date', view: 'period',   sep: true },
  { key: 'quarters',  label: 'Quarters',       view: 'quarters', sep: true },
  { key: 'custom',    label: 'Custom range',   view: null },
];

const LAST_ITEMS = [
  { key: 'last_7d',      label: 'Last 7 days'    },
  { key: 'last_30d',     label: 'Last 30 days'   },
  { key: 'last_90d',     label: 'Last 90 days'   },
  { key: 'last_365d',    label: 'Last 365 days'  },
  { key: 'last_week',    label: 'Last week'      },
  { key: 'last_month',   label: 'Last month'     },
  { key: 'last_quarter', label: 'Last quarter'   },
  { key: 'last_12m',     label: 'Last 12 months' },
  { key: 'last_year',    label: 'Last year'      },
];

const PERIOD_ITEMS = [
  { key: 'wtd', label: 'Week to date'    },
  { key: 'mtd', label: 'Month to date'   },
  { key: 'qtd', label: 'Quarter to date' },
  { key: 'ytd', label: 'Year to date'    },
];

function parentViewForKey(key: string | null): MenuView | null {
  if (!key) return null;
  if (LAST_ITEMS.some((i) => i.key === key)) return 'last';
  if (PERIOD_ITEMS.some((i) => i.key === key)) return 'period';
  if (/^fq[1-4]_\d{4}$/.test(key)) return 'quarters';
  return null;
}

export function DateRangePicker({ startDate, endDate, presetKey, onApply, onClose }: DateRangePickerProps) {
  const today = new Date();

  const defaultPreset = useMemo(
    () => resolvePreset(presetKey ?? 'last_30d') ?? resolvePreset('last_30d')!,
    [presetKey],
  );
  const initialStart = startDate || toYMD(defaultPreset.start);
  const initialEnd   = endDate   || toYMD(defaultPreset.end);

  const [view, setView]                 = useState<MenuView>('main');
  const [selStart, setSelStart]         = useState(initialStart);
  const [selEnd, setSelEnd]             = useState(initialEnd);
  const [hover, setHover]               = useState('');
  const [activeKey, setActiveKey]       = useState<string | null>(presetKey ?? (startDate ? null : 'last_30d'));
  const [appliedLabel, setAppliedLabel] = useState<string>(defaultPreset.label);

  const [viewYear, setViewYear]   = useState(() => {
    const d = parseYMD(initialEnd) ?? parseYMD(initialStart);
    const m = d ? d.getMonth() : today.getMonth();
    const y = d ? d.getFullYear() : today.getFullYear();
    return m === 0 ? y - 1 : y;
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseYMD(initialEnd) ?? parseYMD(initialStart);
    const m = d ? d.getMonth() : today.getMonth();
    return m === 0 ? 11 : m - 1;
  });

  const leftMonth  = viewMonth;
  const leftYear   = viewYear;
  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;
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
    setActiveKey(null);
    setAppliedLabel('Custom range');
    if (!selStart || (selStart && selEnd)) {
      setSelStart(iso); setSelEnd('');
    } else {
      if (iso < selStart) { setSelEnd(selStart); setSelStart(iso); }
      else setSelEnd(iso);
    }
  }, [selStart, selEnd]);

  const applyPreset = useCallback((key: string) => {
    const p = resolvePreset(key); if (!p) return;
    setSelStart(toYMD(p.start));
    setSelEnd(toYMD(p.end));
    setActiveKey(key);
    setAppliedLabel(p.label);
    const m = p.end.getMonth();
    const y = p.end.getFullYear();
    setViewYear(m === 0 ? y - 1 : y);
    setViewMonth(m === 0 ? 11 : m - 1);
  }, []);

  const handleMainItem = useCallback((item: typeof MAIN_ITEMS[number]) => {
    if (item.view) { setView(item.view); return; }
    if (item.key === 'custom') {
      setActiveKey(null);
      setAppliedLabel('Custom range');
      setSelStart(''); setSelEnd(''); setHover('');
      return;
    }
    applyPreset(item.key);
  }, [applyPreset]);

  const canApply = !!(selStart && selEnd);

  const handleApply = useCallback(() => {
    if (!canApply) return;
    onApply({
      startDate: selStart,
      endDate: selEnd,
      label: appliedLabel,
      presetKey: activeKey,
    });
  }, [canApply, selStart, selEnd, appliedLabel, activeKey, onApply]);

  const [startDraft, setStartDraft] = useState<string | null>(null);
  const [endDraft, setEndDraft]     = useState<string | null>(null);

  const focusView = useCallback((d: Date) => {
    const m = d.getMonth(); const y = d.getFullYear();
    setViewYear(m === 0 ? y - 1 : y);
    setViewMonth(m === 0 ? 11 : m - 1);
  }, []);

  const enterCustom = useCallback(() => {
    setActiveKey(null);
    setAppliedLabel('Custom range');
  }, []);

  const handleStartChange = useCallback((raw: string) => {
    const v = formatDateInput(raw);
    setStartDraft(v);
    const d = parseDateInput(v); if (!d) return;
    enterCustom();
    const iso = toYMD(d);
    const endD = parseYMD(selEnd);
    if (endD && d > endD) { setSelStart(selEnd); setSelEnd(iso); }
    else setSelStart(iso);
    focusView(d);
  }, [selEnd, enterCustom, focusView]);

  const handleEndChange = useCallback((raw: string) => {
    const v = formatDateInput(raw);
    setEndDraft(v);
    const d = parseDateInput(v); if (!d) return;
    enterCustom();
    const iso = toYMD(d);
    const startD2 = parseYMD(selStart);
    if (startD2 && d < startD2) { setSelEnd(selStart); setSelStart(iso); }
    else setSelEnd(iso);
    focusView(d);
  }, [selStart, enterCustom, focusView]);

  const startValue = startDraft !== null ? startDraft : (selStart ? fmtDisplay(selStart) : '');
  const endValue   = endDraft   !== null ? endDraft   : (selEnd   ? fmtDisplay(selEnd)   : '');

  const quarters = useMemo(() => buildQuarterList(), []);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const blockWheel = (e: WheelEvent) => { e.preventDefault(); e.stopPropagation(); };
    el.addEventListener('wheel', blockWheel, { passive: false });
    return () => el.removeEventListener('wheel', blockWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl border border-[#E8E0D0] shadow-2xl flex overflow-hidden select-none"
      style={{ width: 560 }}
    >
      <div className="w-[140px] border-r border-[#F0EBE0] py-1.5 shrink-0 flex flex-col">
        {view === 'main' && MAIN_ITEMS.map((item) => {
          const parentView = parentViewForKey(activeKey);
          const isActive =
            activeKey === item.key ||
            (item.key === 'custom' && !activeKey) ||
            (item.view !== null && item.view === parentView);
          return (
            <div key={item.key}>
              <button
                type="button"
                onClick={() => handleMainItem(item)}
                className={cn(
                  'w-[calc(100%-0.5rem)] text-left px-3 py-1.5 text-[12px] font-medium flex items-center justify-between transition-colors rounded-md mx-1 my-0.5',
                  isActive
                    ? 'bg-[#F5F0E8] text-[#1A1208] font-semibold'
                    : 'text-[#3D2E1A] hover:bg-[#F5F0E8]',
                )}
              >
                {item.label}
                {item.view && <ArrowRight size={12} strokeWidth={2} className="text-[#8C7B64]" />}
              </button>
              {item.sep && <div className="border-b border-[#F0EBE0] mx-3 my-1" />}
            </div>
          );
        })}

        {view === 'last' && (
          <>
            <button type="button" onClick={() => setView('main')} className="mx-2 mt-1 mb-0.5 self-start flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold text-[#1A1208] hover:bg-[#F5F0E8] rounded-md transition-colors">
              <ArrowLeft size={13} strokeWidth={2} /> Last
            </button>
            <div className="border-b border-[#F0EBE0] mx-2 my-1" />
            {LAST_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => applyPreset(item.key)}
                className={cn(
                  'w-[calc(100%-0.5rem)] text-left px-3 py-1.5 text-[12px] font-medium transition-colors rounded-md mx-1 my-0.5',
                  activeKey === item.key
                    ? 'bg-[#F5F0E8] text-[#1A1208] font-semibold'
                    : 'text-[#3D2E1A] hover:bg-[#F5F0E8]',
                )}
              >
                {item.label}
              </button>
            ))}
          </>
        )}

        {view === 'period' && (
          <>
            <button type="button" onClick={() => setView('main')} className="mx-2 mt-1 mb-0.5 self-start flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold text-[#1A1208] hover:bg-[#F5F0E8] rounded-md transition-colors">
              <ArrowLeft size={13} strokeWidth={2} /> Period to date
            </button>
            <div className="border-b border-[#F0EBE0] mx-2 my-1" />
            {PERIOD_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => applyPreset(item.key)}
                className={cn(
                  'w-[calc(100%-0.5rem)] text-left px-3 py-1.5 text-[12px] font-medium transition-colors rounded-md mx-1 my-0.5',
                  activeKey === item.key
                    ? 'bg-[#F5F0E8] text-[#1A1208] font-semibold'
                    : 'text-[#3D2E1A] hover:bg-[#F5F0E8]',
                )}
              >
                {item.label}
              </button>
            ))}
          </>
        )}

        {view === 'quarters' && (
          <>
            <button type="button" onClick={() => setView('main')} className="mx-2 mt-1 mb-0.5 self-start flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold text-[#1A1208] hover:bg-[#F5F0E8] rounded-md transition-colors">
              <ArrowLeft size={13} strokeWidth={2} /> Quarters
            </button>
            <div className="border-b border-[#F0EBE0] mx-2 my-1" />
            {quarters.map((q) => (
              <button
                key={q.key}
                type="button"
                onClick={() => applyPreset(q.key)}
                className={cn(
                  'w-[calc(100%-0.5rem)] text-left px-3 py-1.5 text-[12px] font-medium transition-colors rounded-md mx-1 my-0.5',
                  activeKey === q.key
                    ? 'bg-[#F5F0E8] text-[#1A1208] font-semibold'
                    : 'text-[#3D2E1A] hover:bg-[#F5F0E8]',
                )}
              >
                {q.label}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={startValue}
              placeholder="YYYY-MM-DD"
              maxLength={10}
              inputMode="numeric"
              onFocus={(e) => { enterCustom(); setStartDraft(selStart || ''); e.currentTarget.select(); }}
              onChange={(e) => handleStartChange(e.target.value)}
              onBlur={() => setStartDraft(null)}
              className="w-full rounded-md border border-[#E8E0D0] px-2 py-1.5 text-[12px] font-medium min-h-[30px] text-[#1A1208] placeholder:text-[#C4B49E] focus:outline-none focus:border-[#B8860B] focus:ring-1 focus:ring-[#B8860B] transition-colors"
            />
          </div>
          <ArrowRight size={14} strokeWidth={2} className="text-[#8C7B64] shrink-0" />
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={endValue}
              placeholder="YYYY-MM-DD"
              maxLength={10}
              inputMode="numeric"
              onFocus={(e) => { enterCustom(); setEndDraft(selEnd || ''); e.currentTarget.select(); }}
              onChange={(e) => handleEndChange(e.target.value)}
              onBlur={() => setEndDraft(null)}
              className="w-full rounded-md border border-[#E8E0D0] px-2 py-1.5 text-[12px] font-medium min-h-[30px] text-[#1A1208] placeholder:text-[#C4B49E] focus:outline-none focus:border-[#B8860B] focus:ring-1 focus:ring-[#B8860B] transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-[16px] px-3 pt-1 pb-1">
          <div className="w-[182px] flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#F5E9CC] text-[#8C7B64] transition-colors">
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <span className="text-[12px] font-semibold text-[#1A1208]">{MONTHS[leftMonth]} {leftYear}</span>
            <span className="w-6" />
          </div>
          <div className="w-[182px] flex items-center justify-between">
            <span className="w-6" />
            <span className="text-[12px] font-semibold text-[#1A1208]">{MONTHS[rightMonth]} {rightYear}</span>
            <button type="button" onClick={nextMonth} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#F5E9CC] text-[#8C7B64] transition-colors">
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex gap-[16px] px-3 pb-3 pt-1">
          <MonthGrid year={leftYear}  month={leftMonth}  selStart={selStart} selEnd={selEnd} hover={hover} onDayClick={handleDayClick} onDayHover={setHover} />
          <MonthGrid year={rightYear} month={rightMonth} selStart={selStart} selEnd={selEnd} hover={hover} onDayClick={handleDayClick} onDayHover={setHover} />
        </div>

        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-[#F0EBE0] mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] font-semibold text-[#1A1208] rounded-md border border-[#E8E0D0] hover:bg-[#F5F0E8] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply}
            className="px-4 py-1.5 text-[12px] font-bold bg-[#B8860B] text-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#9A720A] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
