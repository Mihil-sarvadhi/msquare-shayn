import type { RangeState } from '@/store/slices/rangeSlice';

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getFYBounds(today: Date): { start: Date; end: Date } {
  // Indian FY: April 1 – March 31
  const fyYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return {
    start: new Date(fyYear, 3, 1),       // Apr 1
    end:   new Date(fyYear + 1, 2, 31),  // Mar 31 of next calendar year
  };
}

function getFQBounds(today: Date): { start: Date; end: Date } {
  const m = today.getMonth(); // 0-indexed
  const fyYear = getFYBounds(today).start.getFullYear();
  // Q1: Apr–Jun, Q2: Jul–Sep, Q3: Oct–Dec, Q4: Jan–Mar
  if (m >= 3 && m <= 5)  return { start: new Date(fyYear,     3, 1), end: new Date(fyYear,     5, 30) }; // Apr–Jun
  if (m >= 6 && m <= 8)  return { start: new Date(fyYear,     6, 1), end: new Date(fyYear,     8, 30) }; // Jul–Sep
  if (m >= 9 && m <= 11) return { start: new Date(fyYear,     9, 1), end: new Date(fyYear,    11, 31) }; // Oct–Dec
  return                         { start: new Date(fyYear + 1, 0, 1), end: new Date(fyYear + 1, 2, 31) }; // Jan–Mar (Q4)
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}`;
}

export function rangeLabel(range: RangeState): string {
  if (range.label) return range.label;
  if (range.preset === 'custom' && range.startDate && range.endDate) {
    const sy = range.startDate.slice(0, 4);
    const ey = range.endDate.slice(0, 4);
    if (sy === ey) return `${fmtDate(range.startDate)} – ${fmtDate(range.endDate)}, ${ey}`;
    return `${fmtDate(range.startDate)}, ${sy} – ${fmtDate(range.endDate)}, ${ey}`;
  }
  if (range.preset === 'fytd') {
    const today = new Date();
    const { start, end } = getFYBounds(today);
    return `FY ${start.getFullYear()}–${String(end.getFullYear()).slice(2)}`;
  }
  if (range.preset === 'fqtd') {
    const today = new Date();
    const m = today.getMonth();
    const fyStart = getFYBounds(today).start.getFullYear();
    const fyEnd = fyStart + 1;
    const fyLabel = `${fyStart}–${String(fyEnd).slice(2)}`;
    if (m >= 3 && m <= 5)  return `Q1 (Apr–Jun) FY ${fyLabel}`;
    if (m >= 6 && m <= 8)  return `Q2 (Jul–Sep) FY ${fyLabel}`;
    if (m >= 9 && m <= 11) return `Q3 (Oct–Dec) FY ${fyLabel}`;
    return `Q4 (Jan–Mar) FY ${fyLabel}`;
  }
  if (range.preset === '7d')  return 'Last 7 days';
  if (range.preset === '30d') return 'Last 30 days';
  if (range.preset === 'all') return 'All time';
  return 'Last 30 days';
}

export function buildRangeParams(range: RangeState): Record<string, string> {
  if (range.preset === 'custom') {
    return { startDate: range.startDate, endDate: range.endDate };
  }
  if (range.preset === 'fytd') {
    const { start, end } = getFYBounds(new Date());
    return { startDate: toYMD(start), endDate: toYMD(end) };
  }
  if (range.preset === 'fqtd') {
    const { start, end } = getFQBounds(new Date());
    return { startDate: toYMD(start), endDate: toYMD(end) };
  }
  return { range: range.preset };
}
