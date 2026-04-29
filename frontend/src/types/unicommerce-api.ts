export interface ChannelSummaryRow {
  channel: string;
  orders: number;
  revenue: number;
  aov: number;
  cod_orders: number;
  prepaid_orders: number;
  cancelled: number;
  returned: number;
}

export interface RevenueTrendRow {
  date: string;
  channel: string;
  orders: number;
  revenue: number;
  cancelled_orders: number;
  returned_orders: number;
  cod_orders: number;
  prepaid_orders: number;
}

export interface TopProductRow {
  sku: string;
  product_name: string | null;
  channel: string | null;
  units_sold: number;
  revenue: number;
  orders: number;
}

export interface OrderStatusRow {
  status: string;
  count: number;
  revenue: number;
}

export interface ChannelComparisonRow {
  channel: string;
  orders: number;
  revenue: number;
  aov: number;
  cod_orders: number;
  cancelled: number;
}

export interface ReturnsRow {
  channel: string | null;
  return_reason: string | null;
  count: number;
}

export interface RecentOrderRow {
  order_code: string;
  display_order_code: string | null;
  channel: string | null;
  status: string | null;
  order_date: string | null;
  total_price: number;
  cod: boolean;
  customer_name: string | null;
  city: string | null;
  state: string | null;
}

export type UnicommerceChannel = 'FLIPKART' | 'AMAZON' | 'MYNTRA' | 'ETERNZ';
