import { resolveDateRange } from '@utils/resolveDateRange';
import type { DateRange } from '@utils/resolveDateRange';
import * as repo from './analytics.repository';

export { resolveDateRange };
export type { DateRange };

export const getNetRevenue      = (s: string, u: string) => repo.getNetRevenue(s, u);
export const getRtoByState      = (s: string, u: string) => repo.getRtoByState(s, u);
export const getCodVsPrepaidRto = (s: string, u: string) => repo.getCodVsPrepaidRto(s, u);
export const getGeoRevenue      = (s: string, u: string) => repo.getGeoRevenue(s, u);
export const getLogisticsCosts  = (s: string, u: string) => repo.getShipmentStatusBreakdown(s, u);
export const getCodCashFlow     = (s: string, u: string) => repo.getCodCashFlow(s, u);
export const getCustomerOverview  = (s: string, u: string, isAllTime = false) => repo.getCustomerOverview(s, u, isAllTime);
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
