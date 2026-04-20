import type { RangeState } from '@/store/slices/rangeSlice';

export function buildRangeParams(range: RangeState): Record<string, string> {
  if (range.preset === 'custom') {
    return { startDate: range.startDate, endDate: range.endDate };
  }
  return { range: range.preset };
}
