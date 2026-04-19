import { useState, useEffect } from 'react';
import api from '../utils/api';

export interface KPIs {
  revenue: number;
  orders: number;
  aov: number;
  customers: number;
  codOrders: number;
  prepaidOrders: number;
  adSpend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  totalShipments: number;
  delivered: number;
  rto: number;
  ofd: number;
  ndr: number;
  rtoRate: number;
}

export interface RevenueTrendItem {
  date: string;
  revenue: number;
  orders: number;
}

export interface MetaFunnel {
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchase_value: number;
  roas: number;
}

export interface Campaign {
  campaign_id: string;
  campaign_name: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchase_value: number;
  roas: number;
}

export interface Product {
  product_id: string;
  title: string;
  revenue: number;
  units_sold: number;
  orders: number;
}

export interface LogisticsItem {
  current_status: string;
  current_status_code: string;
  count: number;
}

export interface AbandonedCarts {
  count: number;
  total_value: number;
  avg_value: number;
}

export interface ReviewsSummary {
  store_rating: number;
  total_reviews: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
  with_photos: number;
  verified_count: number;
}

export interface TopRatedProduct {
  product_id: number;
  handle: string;
  title: string;
  average_rating: number;
  reviews_count: number;
}

export interface RecentReview {
  review_id: number;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_name: string | null;
  created_at: string;
  has_photos: boolean;
  verified: boolean;
  picture_urls: string | null;
  product_title: string | null;
}

export interface ConnectorHealth {
  connector_name: string;
  last_sync_at: string | null;
  status: string;
  error_message: string | null;
  records_synced: number;
}

export interface DashboardData {
  kpis: KPIs | null;
  revenueTrend: RevenueTrendItem[];
  metaFunnel: MetaFunnel | null;
  campaigns: Campaign[];
  topProducts: Product[];
  logistics: LogisticsItem[];
  abandonedCarts: AbandonedCarts | null;
  health: ConnectorHealth[];
  reviewsSummary: ReviewsSummary | null;
  topRatedProducts: TopRatedProduct[];
  recentReviews: RecentReview[];
}

export function useDashboard(range = '30d'): {
  data: DashboardData;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<DashboardData>({
    kpis: null,
    revenueTrend: [],
    metaFunnel: null,
    campaigns: [],
    topProducts: [],
    logistics: [],
    abandonedCarts: null,
    health: [],
    reviewsSummary: null,
    topRatedProducts: [],
    recentReviews: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = { range };
    setLoading(true);
    setError(null);

    const safe = (p: Promise<any>, fallback: any) => p.catch(() => ({ data: fallback }));

    Promise.all([
      api.get('/dashboard/kpis', { params }),
      api.get('/dashboard/revenue-trend', { params }),
      api.get('/dashboard/meta-funnel', { params }),
      api.get('/dashboard/campaigns', { params }),
      api.get('/dashboard/top-products', { params }),
      api.get('/dashboard/logistics', { params }),
      api.get('/dashboard/abandoned-carts', { params }),
      api.get('/health'),
      safe(api.get('/dashboard/reviews-summary'), null),
      safe(api.get('/dashboard/top-rated-products'), []),
      safe(api.get('/dashboard/recent-reviews'), []),
    ])
      .then(([kpis, revTrend, funnel, camps, prods, logi, carts, health, revSum, topRated, recent]) => {
        setData({
          kpis: kpis.data as KPIs,
          revenueTrend: revTrend.data as RevenueTrendItem[],
          metaFunnel: funnel.data as MetaFunnel,
          campaigns: camps.data as Campaign[],
          topProducts: prods.data as Product[],
          logistics: logi.data as LogisticsItem[],
          abandonedCarts: carts.data as AbandonedCarts,
          health: health.data as ConnectorHealth[],
          reviewsSummary: revSum.data as ReviewsSummary | null,
          topRatedProducts: (topRated.data as TopRatedProduct[]) || [],
          recentReviews: (recent.data as RecentReview[]) || [],
        });
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [range]);

  return { data, loading, error };
}
