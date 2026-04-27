import type { ShopifyOrder as ShopifyOrderData } from './shopify.connector';

export type ShopifyOrderRow = {
  order_id: string;
  order_name?: string;
  created_at?: Date;
  updated_at?: Date;
  processed_at?: Date;
  cancelled_at?: Date;
  cancel_reason?: string;
  closed?: boolean;
  closed_at?: Date;
  confirmed?: boolean;
  test?: boolean;
  note?: string;
  tags?: string[];
  channel?: string;
  location_id?: string;
  source_identifier?: string;
  revenue?: number;
  subtotal?: number;
  gross_sales?: number;
  total_discounts?: number;
  total_tax?: number;
  total_shipping?: number;
  total_refunded?: number;
  total_received?: number;
  total_outstanding?: number;
  current_total_price?: number;
  total_tips?: number;
  currency?: string;
  presentment_currency?: string;
  payment_mode?: string;
  financial_status?: string;
  fulfillment_status?: string;
  return_status?: string;
  risk_level?: string;
  shipping_method?: string;
  accepts_marketing?: boolean;
  order_email?: string;
  order_phone?: string;
  customer_id?: string;
  customer_email?: string;
  customer_name?: string;
  customer_city?: string;
  customer_state?: string;
  customer_country?: string;
  customer_pincode?: string;
  customer_address1?: string;
  customer_address2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  billing_zip?: string;
  discount_code?: string;
};

const n = (v: string | undefined): number => parseFloat(v || '0') || 0;
const opt = <T>(v: T | null | undefined): T | undefined =>
  v === null || v === undefined ? undefined : v;

export function mapShopifyOrder(order: ShopifyOrderData): ShopifyOrderRow {
  const gateways = order.paymentGatewayNames || [];
  const isCOD =
    gateways.includes('cash on delivery') || gateways.some((g) => g.toLowerCase().includes('cod'));

  const revenue = n(order.totalPriceSet?.shopMoney?.amount);
  const discounts = n(order.totalDiscountsSet?.shopMoney?.amount);
  const shipping = n(order.totalShippingPriceSet?.shopMoney?.amount);
  const tax = n(order.totalTaxSet?.shopMoney?.amount);
  const refunded = n(order.totalRefundedSet?.shopMoney?.amount);
  const received = n(order.totalReceivedSet?.shopMoney?.amount);
  const outstanding = n(order.totalOutstandingSet?.shopMoney?.amount);
  const currentTotalPrice = n(order.currentTotalPriceSet?.shopMoney?.amount);
  const tips = n(order.totalTipReceivedSet?.shopMoney?.amount);
  const subtotal = n(order.subtotalPriceSet?.shopMoney?.amount);
  // Gross sales = item price × qty before discounts. subtotalPriceSet is items
  // after line-item discounts, so adding total_discounts back yields gross.
  // For Indian (tax-inclusive) stores subtotal already includes GST, which matches
  // how Shopify Analytics reports gross sales.
  const grossSales = subtotal + discounts;

  const ship = order.shippingAddress;
  const bill = order.billingAddress;
  const customerName = order.customer
    ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ') || undefined
    : undefined;

  return {
    order_id: order.id,
    order_name: order.name,
    created_at: order.createdAt ? new Date(order.createdAt) : undefined,
    updated_at: order.updatedAt ? new Date(order.updatedAt) : undefined,
    processed_at: order.processedAt ? new Date(order.processedAt) : undefined,
    cancelled_at: order.cancelledAt ? new Date(order.cancelledAt) : undefined,
    cancel_reason: opt(order.cancelReason) || undefined,
    closed: opt(order.closed) ?? undefined,
    closed_at: order.closedAt ? new Date(order.closedAt) : undefined,
    confirmed: opt(order.confirmed) ?? undefined,
    test: opt(order.test) ?? undefined,
    note: opt(order.note) || undefined,
    tags: order.tags && order.tags.length > 0 ? order.tags : undefined,
    channel: opt(order.sourceName) || undefined,
    location_id: order.physicalLocation?.id || undefined,
    source_identifier: opt(order.sourceIdentifier) || undefined,
    revenue,
    subtotal,
    gross_sales: grossSales,
    total_discounts: discounts,
    total_tax: tax,
    total_shipping: shipping,
    total_refunded: refunded,
    total_received: received,
    total_outstanding: outstanding,
    current_total_price: currentTotalPrice,
    total_tips: tips,
    currency: opt(order.currencyCode) || undefined,
    presentment_currency: opt(order.presentmentCurrencyCode) || undefined,
    payment_mode: isCOD ? 'COD' : 'Prepaid',
    financial_status: order.displayFinancialStatus,
    fulfillment_status: order.displayFulfillmentStatus,
    return_status: opt(order.returnStatus) || undefined,
    risk_level: order.risk?.assessments?.[0]?.riskLevel || undefined,
    shipping_method: order.shippingLine?.title || undefined,
    accepts_marketing: opt(order.customerAcceptsMarketing) ?? undefined,
    order_email: opt(order.email) || undefined,
    order_phone: opt(order.phone) || undefined,
    customer_id: order.customer?.id || undefined,
    customer_email: order.customer?.email || undefined,
    customer_name: customerName,
    customer_city: ship?.city || order.customer?.defaultAddress?.city || undefined,
    customer_state: ship?.province || order.customer?.defaultAddress?.province || undefined,
    customer_country: ship?.country || undefined,
    customer_pincode: ship?.zip || undefined,
    customer_address1: ship?.address1 || undefined,
    customer_address2: ship?.address2 || undefined,
    billing_city: bill?.city || undefined,
    billing_state: bill?.province || undefined,
    billing_country: bill?.country || undefined,
    billing_zip: bill?.zip || undefined,
    discount_code: order.discountCodes?.[0] || undefined,
  };
}

export function mapBulkOrder(raw: Record<string, unknown>): ShopifyOrderRow {
  const paymentGateways = (raw.paymentGatewayNames as string[] | undefined) || [];
  const isCOD =
    paymentGateways.includes('cash on delivery') ||
    paymentGateways.some((g) => g.toLowerCase().includes('cod'));

  const money = (key: string): number => {
    const obj = raw[key] as { shopMoney?: { amount?: string } } | undefined;
    return parseFloat(obj?.shopMoney?.amount || '0') || 0;
  };

  const revenue = money('totalPriceSet');
  const discounts = money('totalDiscountsSet');
  const shipping = money('totalShippingPriceSet');
  const tax = money('totalTaxSet');
  const refunded = money('totalRefundedSet');
  const received = money('totalReceivedSet');
  const outstanding = money('totalOutstandingSet');
  const currentTotalPrice = money('currentTotalPriceSet');
  const tips = money('totalTipReceivedSet');
  const subtotal = money('subtotalPriceSet');
  const grossSales = subtotal + discounts;

  const ship = raw.shippingAddress as Record<string, string | undefined> | undefined;
  const bill = raw.billingAddress as Record<string, string | undefined> | undefined;
  const customer = raw.customer as
    | {
        id?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        defaultAddress?: Record<string, string>;
      }
    | undefined;
  const customerName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || undefined
    : undefined;
  const risk = raw.risk as { assessments?: Array<{ riskLevel?: string }> } | undefined;
  const shippingLine = raw.shippingLine as { title?: string } | undefined;
  const physicalLocation = raw.physicalLocation as { id?: string } | undefined;
  const tags = raw.tags as string[] | undefined;
  const discountCodes = raw.discountCodes as Array<{ code: string }> | string[] | undefined;
  const firstDiscount = Array.isArray(discountCodes)
    ? typeof discountCodes[0] === 'string'
      ? (discountCodes[0] as string)
      : (discountCodes[0] as { code: string } | undefined)?.code
    : undefined;

  return {
    order_id: raw.id as string,
    order_name: raw.name as string,
    created_at: raw.createdAt ? new Date(raw.createdAt as string) : undefined,
    updated_at: raw.updatedAt ? new Date(raw.updatedAt as string) : undefined,
    processed_at: raw.processedAt ? new Date(raw.processedAt as string) : undefined,
    cancelled_at: raw.cancelledAt ? new Date(raw.cancelledAt as string) : undefined,
    cancel_reason: (raw.cancelReason as string | undefined) || undefined,
    closed: (raw.closed as boolean | undefined) ?? undefined,
    closed_at: raw.closedAt ? new Date(raw.closedAt as string) : undefined,
    confirmed: (raw.confirmed as boolean | undefined) ?? undefined,
    test: (raw.test as boolean | undefined) ?? undefined,
    note: (raw.note as string | undefined) || undefined,
    tags: tags && tags.length > 0 ? tags : undefined,
    channel: (raw.sourceName as string | undefined) || undefined,
    location_id: physicalLocation?.id || undefined,
    source_identifier: (raw.sourceIdentifier as string | undefined) || undefined,
    revenue,
    subtotal,
    gross_sales: grossSales,
    total_discounts: discounts,
    total_tax: tax,
    total_shipping: shipping,
    total_refunded: refunded,
    total_received: received,
    total_outstanding: outstanding,
    current_total_price: currentTotalPrice,
    total_tips: tips,
    currency: (raw.currencyCode as string | undefined) || undefined,
    presentment_currency: (raw.presentmentCurrencyCode as string | undefined) || undefined,
    payment_mode: isCOD ? 'COD' : 'Prepaid',
    financial_status: raw.displayFinancialStatus as string,
    fulfillment_status: raw.displayFulfillmentStatus as string,
    return_status: (raw.returnStatus as string | undefined) || undefined,
    risk_level: risk?.assessments?.[0]?.riskLevel || undefined,
    shipping_method: shippingLine?.title || undefined,
    accepts_marketing: (raw.customerAcceptsMarketing as boolean | undefined) ?? undefined,
    order_email: (raw.email as string | undefined) || undefined,
    order_phone: (raw.phone as string | undefined) || undefined,
    customer_id: customer?.id || undefined,
    customer_email: customer?.email || undefined,
    customer_name: customerName,
    customer_city: ship?.city || customer?.defaultAddress?.city || undefined,
    customer_state: ship?.province || customer?.defaultAddress?.province || undefined,
    customer_country: ship?.country || undefined,
    customer_pincode: ship?.zip || undefined,
    customer_address1: ship?.address1 || undefined,
    customer_address2: ship?.address2 || undefined,
    billing_city: bill?.city || undefined,
    billing_state: bill?.province || undefined,
    billing_country: bill?.country || undefined,
    billing_zip: bill?.zip || undefined,
    discount_code: firstDiscount || undefined,
  };
}
