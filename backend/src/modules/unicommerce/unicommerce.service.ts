import { resolveDateRange, type DateRangeQuery } from '@utils/resolveDateRange';
import * as repo from './unicommerce.repository';
import type { UnicommerceFilters } from './unicommerce.types';

export interface UnicommerceQuery extends DateRangeQuery {
  channel?: string;
}

// Tabs send short names (FLIPKART, AMAZON, …) but stored channels are
// suffixed (FLIPKART_SHAYN, AMAZON_SHAYN, MYNTRAPPMP). The repository ILIKEs
// '%channel%' so anything alphanumeric is safe; we still restrict here so
// callers can't smuggle SQL wildcards or whitespace into the filter.
const CHANNEL_PATTERN = /^[A-Za-z0-9_]+$/;

function buildFilters(query: UnicommerceQuery): UnicommerceFilters {
  const { since, until } = resolveDateRange(query);
  const channelInput = query.channel?.toUpperCase().trim();
  const channel = channelInput && CHANNEL_PATTERN.test(channelInput) ? channelInput : undefined;
  return { since, until, channel };
}

function parseLimit(query: UnicommerceQuery, fallback: number, max: number): number {
  const raw = (query as { limit?: string | number }).limit;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

export const getSummary = (q: UnicommerceQuery) => repo.getSummary(buildFilters(q));
export const getRevenueTrend = (q: UnicommerceQuery) => repo.getRevenueTrend(buildFilters(q));
export const getTopProducts = (q: UnicommerceQuery) => repo.getTopProducts(buildFilters(q));
export const getOrderStatus = (q: UnicommerceQuery) => repo.getOrderStatus(buildFilters(q));
export const getChannelComparison = (q: UnicommerceQuery) =>
  repo.getChannelComparison(buildFilters(q));
export const getReturns = (q: UnicommerceQuery) => repo.getReturns(buildFilters(q));
export const getRecentOrders = (q: UnicommerceQuery) => repo.getRecentOrders(buildFilters(q));
export const getChannelReturns = (q: UnicommerceQuery) => repo.getChannelReturns(buildFilters(q));
export const getTodaySnapshot = () => repo.getTodaySnapshot();
export const getInventorySummary = () => repo.getInventorySummary();
export const getFastMovingSkus = (q: UnicommerceQuery) =>
  repo.getFastMovingSkus(parseLimit(q, 20, 100));
export const getZeroOrderSkus = (q: UnicommerceQuery) =>
  repo.getZeroOrderSkus(parseLimit(q, 20, 100));
export const getTopCategories = (q: UnicommerceQuery) => repo.getTopCategories(buildFilters(q));
export const getTopProductsByChannel = (q: UnicommerceQuery) =>
  repo.getTopProductsByChannel(buildFilters(q), parseLimit(q, 20, 50));
export const getTopProductsWithPct = (q: UnicommerceQuery) =>
  repo.getTopProductsWithPct(buildFilters(q), parseLimit(q, 20, 50));
