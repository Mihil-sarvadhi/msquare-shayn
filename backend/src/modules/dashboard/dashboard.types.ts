export interface DateRange {
  since: string;
  until: string;
}

export interface KpiResult {
  revenue: number; orders: number; aov: number; customers: number;
  codOrders: number; prepaidOrders: number;
  adSpend: number; impressions: number; clicks: number;
  purchases: number; purchaseValue: number; roas: number;
  totalShipments: number; delivered: number; rto: number;
  ofd: number; ndr: number; rtoRate: number;
}

export interface RevenueTrendRow { date: string; revenue: number; orders: number; }
export interface MetaFunnelRow {
  spend: number; impressions: number; clicks: number;
  purchases: number; purchase_value: number; roas: number;
}
export interface CampaignRow {
  campaign_id: string; campaign_name: string; objective: string;
  spend: number; impressions: number; clicks: number;
  purchases: number; purchase_value: number; roas: number;
}
export interface TopProductRow {
  product_id: string; title: string; revenue: number; units_sold: number; orders: number;
}
export interface LogisticsRow { current_status: string; current_status_code: string; count: number; }
export interface AbandonedCartsRow { count: number; total_value: number; avg_value: number; }
export interface ReviewsSummaryRow {
  store_rating: number; total_reviews: number;
  five_star: number; four_star: number; three_star: number; two_star: number; one_star: number;
  with_photos: number; verified_count: number;
}
export interface ReviewsTrendRow { date: string; review_count: number; avg_rating: number; }
export interface TopRatedProductRow {
  product_id: number; handle: string; title: string; average_rating: number; reviews_count: number;
}
export interface RecentReviewRow {
  review_id: number; rating: number; title: string; body: string; reviewer_name: string;
  created_at: string; has_photos: boolean; verified: boolean; picture_urls: string; product_title: string;
}
export interface AllReviewsResult {
  reviews: RecentReviewRow[];
  total: number;
  page: number;
  limit: number;
}
export interface AllReviewsQuery {
  page?: string; limit?: string; rating?: string; search?: string; range?: string;
}
