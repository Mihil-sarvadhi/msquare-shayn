import type { AllReviewsQuery, MarqueeResult } from './dashboard.types';
import { resolveDateRange } from '@utils/resolveDateRange';
import type { DateRange } from '@utils/resolveDateRange';
import * as repo from './dashboard.repository';
import * as analyticsRepo from '@modules/analytics/analytics.repository';

export { resolveDateRange };
export type { DateRange };

export const getKpis = (since: string, until: string) => repo.getKpis(since, until);
export const getRevenueTrend = (since: string, until: string) => repo.getRevenueTrend(since, until);
export const getShipmentsTrend = (since: string, until: string) =>
  repo.getShipmentsTrend(since, until);
export const getMetaFunnel = (since: string, until: string) => repo.getMetaFunnel(since, until);
export const getCampaigns = (since: string, until: string) => repo.getCampaigns(since, until);
export const getTopProducts = (since: string, until: string) => repo.getTopProducts(since, until);
export const getLogistics = (since: string, until: string) => repo.getLogistics(since, until);
export const getAbandonedCarts = (since: string, until: string) =>
  repo.getAbandonedCarts(since, until);
export const getReviewsSummary = (since: string, until: string) =>
  repo.getReviewsSummary(since, until);
export const getReviewsTrend = (since: string, until: string) => repo.getReviewsTrend(since, until);
export const getTopRatedProducts = (since: string, until: string) =>
  repo.getTopRatedProducts(since, until);
export const getRecentReviews = (since: string, until: string) =>
  repo.getRecentReviews(since, until);

export const getRecentOrders = () => repo.getRecentOrders();
export const getRevenueVsSpend = (since: string, until: string) =>
  repo.getRevenueVsSpend(since, until);

export function getAllReviews(query: AllReviewsQuery) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
  const rating = parseInt(query.rating || '0', 10);
  const search = (query.search || '').trim();
  return repo.getAllReviews(page, limit, rating, search);
}

/* ── Marquee aggregator ─────────────────────────────────────────────────
 * Single round-trip that fans out to dashboard + analytics repositories
 * for both the current and previous period, then composes the grouped
 * MarqueeResult the top ticker consumes. */

/** Calendar-equivalent previous window: same length, ending the day before
 *  the current window starts. Mirrors the frontend's
 *  `previousEquivalentRange` so dashboard KPIs and the marquee agree. */
function previousRange(since: string, until: string): DateRange {
  const start = new Date(`${since}T00:00:00.000Z`);
  const end = new Date(`${until}T00:00:00.000Z`);
  const oneDayMs = 86_400_000;
  const lengthDays = Math.round((end.getTime() - start.getTime()) / oneDayMs) + 1;
  const prevEnd = new Date(start.getTime() - oneDayMs);
  const prevStart = new Date(prevEnd.getTime() - (lengthDays - 1) * oneDayMs);
  return {
    since: prevStart.toISOString().slice(0, 10),
    until: prevEnd.toISOString().slice(0, 10),
  };
}

function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

export async function getMarquee(since: string, until: string): Promise<MarqueeResult> {
  const prev = previousRange(since, until);

  const [
    kpis,
    prevKpis,
    netRev,
    prevNetRev,
    customerOverview,
    prevCustomerOverview,
    abandoned,
    prevAbandoned,
    reviewsSummary,
    prevReviewsSummary,
  ] = await Promise.all([
    repo.getKpis(since, until),
    repo.getKpis(prev.since, prev.until),
    analyticsRepo.getNetRevenue(since, until),
    analyticsRepo.getNetRevenue(prev.since, prev.until),
    analyticsRepo.getCustomerOverview(since, until, false),
    analyticsRepo.getCustomerOverview(prev.since, prev.until, false),
    repo.getAbandonedCarts(since, until),
    repo.getAbandonedCarts(prev.since, prev.until),
    repo.getReviewsSummary(since, until),
    repo.getReviewsSummary(prev.since, prev.until),
  ]);

  const fulfilled = pct(kpis.delivered, kpis.totalShipments);
  const prevFulfilled = pct(prevKpis.delivered, prevKpis.totalShipments);

  const codShare = pct(kpis.codOrders, kpis.codOrders + kpis.prepaidOrders);
  const prevCodShare = pct(prevKpis.codOrders, prevKpis.codOrders + prevKpis.prepaidOrders);

  const ctr = pct(kpis.clicks, kpis.impressions);
  const prevCtr = pct(prevKpis.clicks, prevKpis.impressions);

  const netMargin = pct(netRev.net_revenue, netRev.gross_revenue);
  const prevNetMargin = pct(prevNetRev.net_revenue, prevNetRev.gross_revenue);

  return {
    range: { since, until },
    prevRange: prev,
    finance: {
      revenue: Number(kpis.revenue),
      prevRevenue: Number(prevKpis.revenue),
      netRevenue: Number(netRev.net_revenue),
      prevNetRevenue: Number(prevNetRev.net_revenue),
      aov: Number(kpis.aov),
      prevAov: Number(prevKpis.aov),
      logisticsCost: Number(netRev.logistics_cost),
      prevLogisticsCost: Number(prevNetRev.logistics_cost),
      rtoWaste: Number(netRev.rto_waste),
      prevRtoWaste: Number(prevNetRev.rto_waste),
      netMargin,
      prevNetMargin,
    },
    sales: {
      orders: Number(kpis.orders),
      prevOrders: Number(prevKpis.orders),
      cancelledOrders: Number(kpis.cancelledOrders),
      prevCancelledOrders: Number(prevKpis.cancelledOrders),
      codOrders: Number(kpis.codOrders),
      prevCodOrders: Number(prevKpis.codOrders),
      prepaidOrders: Number(kpis.prepaidOrders),
      prevPrepaidOrders: Number(prevKpis.prepaidOrders),
      codShare,
      prevCodShare,
    },
    marketing: {
      adSpend: Number(kpis.adSpend),
      prevAdSpend: Number(prevKpis.adSpend),
      roas: Number(kpis.roas),
      prevRoas: Number(prevKpis.roas),
      impressions: Number(kpis.impressions),
      prevImpressions: Number(prevKpis.impressions),
      clicks: Number(kpis.clicks),
      prevClicks: Number(prevKpis.clicks),
      purchases: Number(kpis.purchases),
      prevPurchases: Number(prevKpis.purchases),
      ctr,
      prevCtr,
    },
    operations: {
      totalShipments: Number(kpis.totalShipments),
      prevTotalShipments: Number(prevKpis.totalShipments),
      delivered: Number(kpis.delivered),
      prevDelivered: Number(prevKpis.delivered),
      fulfilledPct: fulfilled,
      prevFulfilledPct: prevFulfilled,
      rtoRate: Number(kpis.rtoRate),
      prevRtoRate: Number(prevKpis.rtoRate),
      ndr: Number(kpis.ndr),
      prevNdr: Number(prevKpis.ndr),
      ofd: Number(kpis.ofd),
    },
    customers: {
      lifetimeCustomers: Number(kpis.lifetimeCustomers),
      newCustomers: Number(customerOverview?.new_customers ?? 0),
      prevNewCustomers: Number(prevCustomerOverview?.new_customers ?? 0),
      returningCustomers: Number(customerOverview?.returning_customers ?? 0),
      prevReturningCustomers: Number(prevCustomerOverview?.returning_customers ?? 0),
      repeatRate: Number(customerOverview?.repeat_rate ?? 0),
      prevRepeatRate: Number(prevCustomerOverview?.repeat_rate ?? 0),
      abandonedCarts: Number(abandoned?.count ?? 0),
      prevAbandonedCarts: Number(prevAbandoned?.count ?? 0),
    },
    reviews: {
      storeRating: Number(reviewsSummary?.store_rating ?? 0),
      totalReviews: Number(reviewsSummary?.total_reviews ?? 0),
      prevTotalReviews: Number(prevReviewsSummary?.total_reviews ?? 0),
      fiveStarCount: Number(reviewsSummary?.five_star ?? 0),
      verifiedCount: Number(reviewsSummary?.verified_count ?? 0),
    },
  };
}
