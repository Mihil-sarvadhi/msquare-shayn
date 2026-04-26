export interface GA4Summary {
  total_sessions:       number;
  total_users:          number;
  total_new_users:      number;
  total_page_views:     number;
  avg_bounce_rate:      number;
  avg_session_duration: number;
}

export interface GA4SummaryInsights {
  sessions_delta_pct: number;
  users_delta_pct: number;
  new_users_delta_pct: number;
  page_views_delta_pct: number;
  bounce_rate_delta_pct: number;
  avg_session_duration_delta_pct: number;
}

export interface GA4TrafficDaily {
  date:                 string;
  sessions:             number;
  active_users:         number;
  new_users:            number;
  page_views:           number;
  bounce_rate:          number;
  avg_session_duration: number;
}

export interface GA4Channel {
  channel:          string;
  sessions:         number;
  active_users:     number;
  purchase_revenue: number;
  conversions:      number;
  conversion_rate:  number;
}

export interface GA4EcommerceDaily {
  date:                 string;
  purchase_revenue:     number;
  transactions:         number;
  avg_purchase_revenue: number;
  ecommerce_purchases:  number;
  checkouts:            number;
  conversion_rate:      number;
}

export interface GA4Product {
  item_name:           string;
  items_viewed:        number;
  items_added_to_cart: number;
  items_purchased:     number;
  purchase_revenue:    number;
}

export interface GA4Realtime {
  country:         string;
  device_category: string;
  active_users:    number;
  updated_at:      string;
}

export interface GA4RealtimeTrendPoint {
  minute: string;
  value: number;
}

export interface GA4RealtimeBreakdownRow {
  location: string;
  value: number;
}

export interface GA4RealtimeWidget {
  metric: 'activeUsers' | 'newUsers';
  location: 'country' | 'city';
  total: number;
  trend: GA4RealtimeTrendPoint[];
  breakdown: GA4RealtimeBreakdownRow[];
  updatedAt: string;
}

export interface GA4PageScreen {
  page_title: string;
  screen_page_views: number;
  active_users: number;
  views_per_active_user: number;
  avg_engagement_time_per_active_user: number;
  event_count: number;
  bounce_rate: number;
}

export interface GA4CountryActiveUsers {
  country: string;
  activeUsers: number;
  updatedAt: string;
  source: 'db' | 'ga4';
}
