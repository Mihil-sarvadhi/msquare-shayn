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

  const start = new Date();
  if (query.range === '7d') {
    start.setDate(start.getDate() - 7);
  } else if (query.range === 'all') {
    return { since: '2020-01-01', until: today }; // SHAYN brand launch floor year
  } else {
    start.setDate(start.getDate() - 30);
  }

  return {
    since: start.toISOString().split('T')[0],
    until: today,
  };
}
