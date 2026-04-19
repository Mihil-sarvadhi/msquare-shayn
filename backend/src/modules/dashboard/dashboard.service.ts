import type { DateRange, AllReviewsQuery } from './dashboard.types';
import * as repo from './dashboard.repository';

export function getDateRange(range?: string): DateRange {
  const end = new Date();
  const start = new Date();
  if (range === '7d') start.setDate(start.getDate() - 7);
  else if (range === '30d') start.setDate(start.getDate() - 30);
  else if (range === 'mtd') start.setDate(1);
  else start.setDate(start.getDate() - 30);
  return {
    since: start.toISOString().split('T')[0],
    until: end.toISOString().split('T')[0],
  };
}

export const getKpis = (since: string, until: string) => repo.getKpis(since, until);
export const getRevenueTrend = (since: string, until: string) => repo.getRevenueTrend(since, until);
export const getMetaFunnel = (since: string, until: string) => repo.getMetaFunnel(since, until);
export const getCampaigns = (since: string, until: string) => repo.getCampaigns(since, until);
export const getTopProducts = (since: string, until: string) => repo.getTopProducts(since, until);
export const getLogistics = (since: string, until: string) => repo.getLogistics(since, until);
export const getAbandonedCarts = (since: string, until: string) => repo.getAbandonedCarts(since, until);
export const getReviewsSummary = () => repo.getReviewsSummary();
export const getReviewsTrend = (since: string, until: string) => repo.getReviewsTrend(since, until);
export const getTopRatedProducts = () => repo.getTopRatedProducts();
export const getRecentReviews = () => repo.getRecentReviews();

export function getAllReviews(query: AllReviewsQuery) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
  const rating = parseInt(query.rating || '0', 10);
  const search = (query.search || '').trim();
  return repo.getAllReviews(page, limit, rating, search);
}
