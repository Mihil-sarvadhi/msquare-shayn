import * as repo from './analytics.repository';

export function getDateRange(range?: string): { since: string; until: string } {
  const end = new Date();
  const start = new Date();
  if (range === '7d') start.setDate(start.getDate() - 7);
  else if (range === 'all') return { since: '2020-01-01', until: end.toISOString().split('T')[0] };
  else start.setDate(start.getDate() - 30);
  return {
    since: start.toISOString().split('T')[0],
    until: end.toISOString().split('T')[0],
  };
}

export const getNetRevenue = (s: string, u: string) => repo.getNetRevenue(s, u);
export const getRtoByState = (s: string, u: string) => repo.getRtoByState(s, u);
export const getCodVsPrepaidRto = (s: string, u: string) => repo.getCodVsPrepaidRto(s, u);
export const getGeoRevenue = (s: string, u: string) => repo.getGeoRevenue(s, u);
export const getLogisticsCosts = (s: string, u: string) => repo.getLogisticsCosts(s, u);
export const getCodCashFlow = (s: string, u: string) => repo.getCodCashFlow(s, u);
export const getCustomerOverview = (s: string, u: string) => repo.getCustomerOverview(s, u);
export const getCustomerSegments = (s: string, u: string) => repo.getCustomerSegments(s, u);
export const getTopCustomers = (s: string, u: string) => repo.getTopCustomers(s, u);
export const getDiscountAnalysis = (s: string, u: string) => repo.getDiscountAnalysis(s, u);
export const getMarketingTrend = (s: string, u: string) => repo.getMarketingTrend(s, u);
export const getAttributionGap = (s: string, u: string) => repo.getAttributionGap(s, u);
