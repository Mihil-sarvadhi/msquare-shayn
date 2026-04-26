import type { RangeState } from '@store/slices/rangeSlice';
import { buildRangeParams } from './buildRangeParams';

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Convert a Redux RangeState into absolute `from`/`to` query params expected by
 * the Phase 2 Finance backend. Resolves preset values ('7d', '30d', 'all') to
 * concrete dates because finance endpoints do not implement preset interpretation.
 */
export function buildFinanceRangeParams(range: RangeState): { from: string; to: string } {
  const params = buildRangeParams(range);
  if ('startDate' in params && 'endDate' in params) {
    return { from: params.startDate, to: params.endDate };
  }
  // Preset path: resolve to absolute dates
  const today = new Date();
  const to = toYMD(today);
  let from: string;
  if (range.preset === 'all') {
    from = '2023-01-01';
  } else if (range.preset === '7d') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    from = toYMD(d);
  } else {
    // default 30d
    const d = new Date();
    d.setDate(d.getDate() - 30);
    from = toYMD(d);
  }
  return { from, to };
}
