import { SOURCE } from '@constant';
import type {
  ShopifyLocation,
  ShopifyOrderWithRefunds,
  ShopifyOrderWithReturns,
  ShopifyOrderWithTransactions,
} from '@modules/shopify/shopify.connector';
import type {
  TransactionKind,
  TransactionStatus,
} from '@db/models';

const TX_KIND_MAP: Record<string, TransactionKind> = {
  SALE: 'sale',
  AUTHORIZATION: 'authorization',
  CAPTURE: 'capture',
  REFUND: 'refund',
  VOID: 'void',
};

const TX_STATUS_MAP: Record<string, TransactionStatus> = {
  SUCCESS: 'success',
  PENDING: 'pending',
  FAILURE: 'failure',
  ERROR: 'error',
};

function gid(id: string): string {
  return id;
}

function num(s: string | null | undefined): number {
  if (s === null || s === undefined || s === '') return 0;
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

export function mapLocation(loc: ShopifyLocation) {
  return {
    source: SOURCE.SHOPIFY,
    source_location_id: gid(loc.id),
    name: loc.name,
    address: loc.address,
    active: loc.isActive,
    fulfills_online_orders: loc.fulfillsOnlineOrders,
    source_metadata: null,
    synced_at: new Date(),
    updated_at: new Date(),
  };
}

export function mapRefunds(orderWithRefunds: ShopifyOrderWithRefunds) {
  return orderWithRefunds.refunds.map((r) => ({
    source: SOURCE.SHOPIFY,
    source_refund_id: gid(r.id),
    order_id: gid(orderWithRefunds.id),
    refund_amount: num(r.totalRefundedSet.shopMoney.amount),
    refund_currency: r.totalRefundedSet.shopMoney.currencyCode,
    reason: r.note,
    refunded_at: r.createdAt ? new Date(r.createdAt) : null,
    restocked: r.refundLineItems.edges.some(
      (e) => e.node.restockType !== null && e.node.restockType !== 'NO_RESTOCK',
    ),
    refund_line_items: r.refundLineItems.edges.map((e) => ({
      sku: e.node.lineItem?.sku ?? '',
      quantity: e.node.quantity,
      amount: num(e.node.subtotalSet.shopMoney.amount),
      restock_type: e.node.restockType ?? undefined,
    })),
    source_metadata: null,
    synced_at: new Date(),
    updated_at: new Date(),
  }));
}

export function mapReturns(orderWithReturns: ShopifyOrderWithReturns) {
  return orderWithReturns.returns.map((r) => {
    const lineItems = r.returnLineItems.edges.map((e) => {
      const li = e.node.fulfillmentLineItem?.lineItem;
      const unitPrice = num(li?.discountedUnitPriceAfterAllDiscountsSet?.shopMoney?.amount);
      return {
        sku: li?.sku ?? '',
        quantity: e.node.quantity,
        total: unitPrice * e.node.quantity,
        return_reason: e.node.returnReason ?? undefined,
      };
    });
    const totalValue = lineItems.reduce((sum, li) => sum + li.total, 0);
    const shippingFeeTotal = r.returnShippingFees.reduce(
      (sum, f) => sum + num(f.amountSet.shopMoney.amount),
      0,
    );
    return {
      source: SOURCE.SHOPIFY,
      source_return_id: gid(r.id),
      order_id: gid(orderWithReturns.id),
      name: r.name,
      status: r.status,
      total_quantity: r.totalQuantity,
      total_value: totalValue,
      return_shipping_fee_total: shippingFeeTotal,
      return_created_at: r.createdAt ? new Date(r.createdAt) : null,
      request_approved_at: r.requestApprovedAt ? new Date(r.requestApprovedAt) : null,
      closed_at: r.closedAt ? new Date(r.closedAt) : null,
      return_line_items: lineItems,
      source_metadata: null,
      synced_at: new Date(),
      updated_at: new Date(),
    };
  });
}

export function mapTransactions(orderWithTx: ShopifyOrderWithTransactions) {
  return orderWithTx.transactions.map((t) => ({
    source: SOURCE.SHOPIFY,
    source_transaction_id: gid(t.id),
    order_id: gid(orderWithTx.id),
    kind: TX_KIND_MAP[t.kind.toUpperCase()] ?? 'sale',
    status: TX_STATUS_MAP[t.status.toUpperCase()] ?? 'success',
    gateway: t.gateway,
    amount: num(t.amountSet.shopMoney.amount),
    currency: t.amountSet.shopMoney.currencyCode,
    payment_method: t.paymentDetails?.paymentMethodName ?? null,
    processed_at: t.processedAt ? new Date(t.processedAt) : null,
    parent_transaction_id: t.parentTransaction ? gid(t.parentTransaction.id) : null,
    source_metadata: null,
    synced_at: new Date(),
    updated_at: new Date(),
  }));
}
