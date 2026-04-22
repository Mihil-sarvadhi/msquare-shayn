export interface GA4Summary {
  total_sessions:       number;
  total_users:          number;
  total_new_users:      number;
  total_page_views:     number;
  avg_bounce_rate:      number;
  avg_session_duration: number;
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

export interface GA4Device {
  device_category:  string;
  sessions:         number;
  active_users:     number;
  purchase_revenue: number;
  conversion_rate:  number;
}

export interface GA4Geography {
  region:           string;
  city:             string;
  active_users:     number;
  sessions:         number;
  purchase_revenue: number;
  transactions:     number;
}

export interface GA4Realtime {
  country:         string;
  device_category: string;
  active_users:    number;
  updated_at:      string;
}
