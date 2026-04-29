import { resolveDateRange, type DateRangeQuery } from '@utils/resolveDateRange';
import * as repo from './unicommerce.repository';
import type { UnicommerceFilters } from './unicommerce.types';

export interface UnicommerceQuery extends DateRangeQuery {
  channel?: string;
}

const VALID_CHANNELS = new Set(['FLIPKART', 'AMAZON', 'MYNTRA', 'ETERNZ']);

function buildFilters(query: UnicommerceQuery): UnicommerceFilters {
  const { since, until } = resolveDateRange(query);
  const channelInput = query.channel?.toUpperCase().trim();
  const channel = channelInput && VALID_CHANNELS.has(channelInput) ? channelInput : undefined;
  return { since, until, channel };
}

export const getSummary = (q: UnicommerceQuery) => repo.getSummary(buildFilters(q));
export const getRevenueTrend = (q: UnicommerceQuery) => repo.getRevenueTrend(buildFilters(q));
export const getTopProducts = (q: UnicommerceQuery) => repo.getTopProducts(buildFilters(q));
export const getOrderStatus = (q: UnicommerceQuery) => repo.getOrderStatus(buildFilters(q));
export const getChannelComparison = (q: UnicommerceQuery) =>
  repo.getChannelComparison(buildFilters(q));
export const getReturns = (q: UnicommerceQuery) => repo.getReturns(buildFilters(q));
export const getRecentOrders = (q: UnicommerceQuery) => repo.getRecentOrders(buildFilters(q));
