import { resolveDateRange } from '@utils/resolveDateRange';
import type { DateRange } from '@utils/resolveDateRange';
import * as repo from './analytics.repository';
import type { CustomerOverviewWithPrev } from './analytics.types';

export { resolveDateRange };
export type { DateRange };

export const getNetRevenue      = (s: string, u: string) => repo.getNetRevenue(s, u);
export const getRtoByState      = (s: string, u: string) => repo.getRtoByState(s, u);
export const getCodVsPrepaidRto = (s: string, u: string) => repo.getCodVsPrepaidRto(s, u);
export const getGeoRevenue      = (s: string, u: string) => repo.getGeoRevenue(s, u);
export const getLogisticsCosts  = (s: string, u: string) => repo.getShipmentStatusBreakdown(s, u);
export const getCodCashFlow     = (s: string, u: string) => repo.getCodCashFlow(s, u);

/**
 * Returns the same window's customer overview plus the equivalent prior-length
 * window's values as `prev_*` fields, so the UI can render delta % vs prev.
 * For `isAllTime`, prev is undefined (returned as zeros) since "previous to all-time"
 * isn't a meaningful concept.
 */
export async function getCustomerOverview(
  since: string,
  until: string,
  isAllTime = false,
): Promise<CustomerOverviewWithPrev> {
  if (isAllTime) {
    const cur = await repo.getCustomerOverview(since, until, true);
    return {
      ...cur,
      prev_total_customers: 0,
      prev_new_customers: 0,
      prev_returning_customers: 0,
      prev_repeat_rate: 0,
    };
  }
  // Compute equivalent prior period: prevTo = since - 1 day; prevFrom = prevTo - (until - since).
  const sinceDate = new Date(`${since}T00:00:00.000Z`);
  const untilDate = new Date(`${until}T00:00:00.000Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  const prevTo = new Date(sinceDate.getTime() - dayMs);
  const prevFrom = new Date(prevTo.getTime() - (untilDate.getTime() - sinceDate.getTime()));
  const prevSince = prevFrom.toISOString().slice(0, 10);
  const prevUntil = prevTo.toISOString().slice(0, 10);

  const [cur, prev] = await Promise.all([
    repo.getCustomerOverview(since, until, false),
    repo.getCustomerOverview(prevSince, prevUntil, false),
  ]);
  return {
    ...cur,
    prev_total_customers: prev.total_customers,
    prev_new_customers: prev.new_customers,
    prev_returning_customers: prev.returning_customers,
    prev_repeat_rate: prev.repeat_rate,
  };
}
export const getCustomerSegments  = (s: string, u: string) => repo.getCustomerSegments(s, u);
export const getTopCustomers    = (s: string, u: string) => repo.getTopCustomers(s, u);
export const getDiscountAnalysis = (s: string, u: string) => repo.getDiscountAnalysis(s, u);
export const getMarketingTrend  = (s: string, u: string) => repo.getMarketingTrend(s, u);
export const getAttributionGap  = (s: string, u: string) => repo.getAttributionGap(s, u);
export const getTopSkus         = (s: string, u: string) => repo.getTopSkus(s, u);
export const getMoneyStuck      = (s: string, u: string) => repo.getMoneyStuck(s, u);
export const getChannelRevenue    = (s: string, u: string) => repo.getChannelRevenue(s, u);
export const getCourierScorecard  = (s: string, u: string) => repo.getCourierScorecard(s, u);
export const getSlaByZone         = (s: string, u: string) => repo.getSlaByZone(s, u);
export const getCreativeFatigue   = (s: string, u: string) => repo.getCreativeFatigue(s, u);
export const getCohortRetention   = () => repo.getCohortRetention();
export const getReturnReasons   = (s: string, u: string) => repo.getReturnReasons(s, u);
