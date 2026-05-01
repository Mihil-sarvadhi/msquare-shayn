import type { AllReviewsQuery, ConversionFunnelResult, MarqueeResult } from './dashboard.types';
import { resolveDateRange } from '@utils/resolveDateRange';
import type { DateRange } from '@utils/resolveDateRange';
import * as repo from './dashboard.repository';
import * as analyticsRepo from '@modules/analytics/analytics.repository';
import * as ga4Repo from '@modules/ga4/ga4.repository';
import { buildBreakdown } from '@modules/finance/finance.service';
import { parseFromYMD, parseToYMD } from '@utils/dateBounds';

export { resolveDateRange };
export type { DateRange };

/**
 * Dashboard KPIs with `revenue` (and `aov`) re-sourced through the canonical
 * `buildBreakdown` chain so the headline number on the dashboard matches the
 * Finance Sales Breakdown to the rupee. Fixes the long-standing discrepancy
 * where `dashboard.repository.getKpis` rolled its own gross-sales formula
 * and produced a different total. Other fields (orders, payment-mode split,
 * Meta funnel, iThink shipments, lifetime customers) remain from the
 * existing query — only the Shopify revenue figure is overridden, per the
 * project memory rule that all Shopify-derived sales metrics must factor
 * through `buildBreakdown` / `computeTotals`.
 *
 * IST boundaries via parseFromYMD/parseToYMD — Shopify orders are stored as
 * TIMESTAMPTZ and the rest of the finance reporting bucket by IST day, so
 * using UTC midnight here would chop ~5h30m off each end of the window and
 * miss orders that finance does include.
 */
export const getKpis = async (since: string, until: string) => {
  const [raw, breakdown] = await Promise.all([
    repo.getKpis(since, until),
    buildBreakdown(parseFromYMD(since), parseToYMD(until)),
  ]);
  const revenue = breakdown.totals.gross_sales;
  const aov = raw.orders > 0 ? revenue / raw.orders : 0;
  return { ...raw, revenue, aov };
};
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

/** GA4-driven 4-stage conversion funnel: Sessions → Add to Cart → Checkouts
 *  → Purchases. Sessions come from `ga4_traffic_daily` (sum), add-to-cart
 *  from `ga4_top_products` (sum across ALL products in window — not just the
 *  top 10 the dashboard product table renders), checkouts and purchases from
 *  `ga4_ecommerce_daily`. All four queries run in parallel against tables
 *  already kept fresh by the GA4 sync. */
export async function getConversionFunnel(
  since: string,
  until: string,
): Promise<ConversionFunnelResult> {
  const [summary, addedToCart, ecomTotals] = await Promise.all([
    ga4Repo.getSummary(since, until),
    ga4Repo.getAddToCartsTotal(since, until),
    ga4Repo.getEcommerceTotals(since, until),
  ]);
  return {
    sessions: Number(summary?.total_sessions ?? 0),
    added_to_cart: addedToCart,
    checkouts: ecomTotals.checkouts,
    purchases: ecomTotals.purchases,
  };
}

/**
 * Daily Shopify gross sales overlaid with Meta ad spend. The "revenue" line
 * is the canonical buildBreakdown daily gross_sales (matches Finance Sales
 * Breakdown) instead of a SUM of the raw stored revenue column. Meta spend
 * comes from a gap-filled daily series so days with no spend still appear
 * on the chart.
 */
export async function getRevenueVsSpend(
  since: string,
  until: string,
): Promise<{ date: string; revenue: string; ad_spend: string }[]> {
  const [breakdown, metaDaily] = await Promise.all([
    buildBreakdown(parseFromYMD(since), parseToYMD(until)),
    repo.getMetaSpendDaily(since, until),
  ]);

  const grossByDate = new Map<string, number>();
  for (const point of breakdown.daily) {
    grossByDate.set(point.date, point.gross_sales);
  }

  return metaDaily.map((row) => ({
    date: row.date,
    revenue: String(grossByDate.get(row.date) ?? 0),
    ad_spend: row.ad_spend,
  }));
}

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

  // Use the service-level wrapper so revenue/aov flow through buildBreakdown
  // (matches the Finance Sales Breakdown). Using repo.getKpis directly here
  // would re-introduce the bespoke gross-sales SQL we just routed around.
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
    getKpis(since, until),
    getKpis(prev.since, prev.until),
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
