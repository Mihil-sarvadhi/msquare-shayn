/* Mirror of backend `MarqueeResult`. The Ticker pulls one of these per
 * dashboard date-range and renders it as grouped, tinted cards. */

export interface MarqueeFinance {
  revenue: number;
  prevRevenue: number;
  netRevenue: number;
  prevNetRevenue: number;
  aov: number;
  prevAov: number;
  logisticsCost: number;
  prevLogisticsCost: number;
  rtoWaste: number;
  prevRtoWaste: number;
  netMargin: number;
  prevNetMargin: number;
}

export interface MarqueeSales {
  orders: number;
  prevOrders: number;
  cancelledOrders: number;
  prevCancelledOrders: number;
  codOrders: number;
  prevCodOrders: number;
  prepaidOrders: number;
  prevPrepaidOrders: number;
  codShare: number;
  prevCodShare: number;
}

export interface MarqueeMarketing {
  adSpend: number;
  prevAdSpend: number;
  roas: number;
  prevRoas: number;
  impressions: number;
  prevImpressions: number;
  clicks: number;
  prevClicks: number;
  purchases: number;
  prevPurchases: number;
  ctr: number;
  prevCtr: number;
}

export interface MarqueeOperations {
  totalShipments: number;
  prevTotalShipments: number;
  delivered: number;
  prevDelivered: number;
  fulfilledPct: number;
  prevFulfilledPct: number;
  rtoRate: number;
  prevRtoRate: number;
  ndr: number;
  prevNdr: number;
  ofd: number;
}

export interface MarqueeCustomers {
  lifetimeCustomers: number;
  newCustomers: number;
  prevNewCustomers: number;
  returningCustomers: number;
  prevReturningCustomers: number;
  repeatRate: number;
  prevRepeatRate: number;
  abandonedCarts: number;
  prevAbandonedCarts: number;
}

export interface MarqueeReviews {
  storeRating: number;
  totalReviews: number;
  prevTotalReviews: number;
  fiveStarCount: number;
  verifiedCount: number;
}

export interface MarqueePayload {
  range: { since: string; until: string };
  prevRange: { since: string; until: string };
  finance: MarqueeFinance;
  sales: MarqueeSales;
  marketing: MarqueeMarketing;
  operations: MarqueeOperations;
  customers: MarqueeCustomers;
  reviews: MarqueeReviews;
}
