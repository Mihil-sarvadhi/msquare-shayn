export interface DateRange {
  since: string;
  until: string;
}

export interface DateRangeQuery {
  range?: string;
  startDate?: string;
  endDate?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Move a UTC calendar day (YYYY-MM-DD) by `deltaDays` (matches frontend GA4 presets). */
function shiftUtcDays(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function resolveDateRange(query: DateRangeQuery): DateRange {
  const today = new Date().toISOString().split('T')[0];

  if (query.startDate && query.endDate) {
    if (!ISO_DATE.test(query.startDate) || !ISO_DATE.test(query.endDate)) {
      throw new Error('startDate and endDate must be in YYYY-MM-DD format');
    }
    if (query.startDate > query.endDate) {
      throw new Error('startDate must be before or equal to endDate');
    }
    return { since: query.startDate, until: query.endDate };
  }

  if (query.range === '7d') {
    return { since: shiftUtcDays(today, -6), until: today };
  }

  if (query.range === 'all') {
    return { since: '2020-01-01', until: today }; // SHAYN brand launch floor year
  }

  if (query.range === 'mtd') {
    const d = new Date(`${today}T00:00:00.000Z`);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return { since: `${y}-${m}-01`, until: today };
  }

  // 30d and any other preset without explicit dates — exactly 30 inclusive UTC days ending today
  return { since: shiftUtcDays(today, -29), until: today };
}
