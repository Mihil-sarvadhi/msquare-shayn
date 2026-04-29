import axios, { type AxiosError } from 'axios';
import { environment } from '@config/config';
import { getValidToken } from './ga4.token';

const BASE = 'https://analyticsdata.googleapis.com/v1beta';

export interface GA4Row {
  dimensionValues: Array<{ value: string }>;
  metricValues: Array<{ value: string }>;
}
export interface GA4Response {
  rows?: GA4Row[];
}

function propertyPath(): string {
  const id = environment.ga4.propertyId;
  if (!id) throw new Error('GA4_PROPERTY_ID is not configured');
  return `/properties/${id}`;
}

async function runReport(body: Record<string, unknown>, realtime = false): Promise<GA4Response> {
  const token = await getValidToken();
  const endpoint = realtime ? ':runRealtimeReport' : ':runReport';
  const url = `${BASE}${propertyPath()}${endpoint}`;

  try {
    const { data } = await axios.post<GA4Response>(url, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return data;
  } catch (err) {
    const axiosErr = err as AxiosError<{ error?: { message: string } }>;
    const msg = axiosErr.response?.data?.error?.message ?? axiosErr.message;
    throw new Error(`GA4 API error: ${msg}`);
  }
}

export function getTrafficOverview(startDate: string, endDate: string): Promise<GA4Response> {
  return runReport({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
}

export function getTrafficByChannel(startDate: string, endDate: string): Promise<GA4Response> {
  return runReport({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'purchaseRevenue' },
      { name: 'conversions' },
      { name: 'sessionConversionRate' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });
}

export function getEcommercePerformance(startDate: string, endDate: string): Promise<GA4Response> {
  return runReport({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'purchaseRevenue' },
      { name: 'transactions' },
      { name: 'averagePurchaseRevenue' },
      { name: 'ecommercePurchases' },
      { name: 'checkouts' },
      { name: 'sessionConversionRate' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
}

export function getTopProducts(startDate: string, endDate: string): Promise<GA4Response> {
  // GA4 rejects date dimension with item-scoped metrics — aggregate across the period
  return runReport({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'itemName' }],
    metrics: [
      { name: 'itemsViewed' },
      { name: 'itemsAddedToCart' },
      { name: 'itemsPurchased' },
      { name: 'itemRevenue' },
    ],
    orderBys: [{ metric: { metricName: 'itemRevenue' }, desc: true }],
    limit: 500,
  });
}

export function getTopPagesScreens(startDate: string, endDate: string): Promise<GA4Response> {
  return runReport({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }, { name: 'pageTitle' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'activeUsers' },
      { name: 'eventCount' },
      { name: 'bounceRate' },
      { name: 'userEngagementDuration' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 1000,
  });
}

export function getCountryActiveUsers(startDate: string, endDate: string): Promise<GA4Response> {
  return runReport({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'country' }],
    metrics: [{ name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit: 50,
  });
}

/** Period totals with no date dimension — returns deduplicated user/session counts that match GA4's UI exactly */
export function getPeriodTotals(startDate: string, endDate: string): Promise<GA4Response> {
  return runReport({
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
    ],
  });
}

export function getRealtimeUsers(): Promise<GA4Response> {
  return runReport(
    {
      dimensions: [{ name: 'country' }, { name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
    },
    true,
  );
}

export function getRealtimeByDimension(dimension: 'country' | 'city'): Promise<GA4Response> {
  return runReport(
    {
      dimensions: [{ name: dimension }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 50,
    },
    true,
  );
}

export function getRealtimeTrendActiveUsers(): Promise<GA4Response> {
  return runReport(
    {
      dimensions: [{ name: 'minutesAgo' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'minutesAgo' } }],
      limit: 30,
    },
    true,
  );
}

export function getRecentNewUsersByMinuteAndDimension(dimension: 'country' | 'city'): Promise<GA4Response> {
  return runReport({
    dateRanges: [{ startDate: 'today', endDate: 'today' }],
    dimensions: [{ name: 'dateHourMinute' }, { name: dimension }],
    metrics: [{ name: 'newUsers' }],
    orderBys: [{ dimension: { dimensionName: 'dateHourMinute' }, desc: true }],
    limit: 2000,
  });
}

/** Convert GA4 YYYYMMDD to PostgreSQL YYYY-MM-DD */
export function formatGA4Date(raw: string): string {
  return raw.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
}
