import { SOURCE } from '@constant';
import type {
  ShopifyBalanceTransaction,
  ShopifyLocation,
  ShopifyOrderWithRefunds,
  ShopifyOrderWithTransactions,
  ShopifyPayout,
} from '@modules/shopify/shopify.connector';
import type {
  BalanceTransactionType,
  PayoutStatus,
  TransactionKind,
  TransactionStatus,
} from '@db/models';

const PAYOUT_STATUS_MAP: Record<string, PayoutStatus> = {
  SCHEDULED: 'scheduled',
  IN_TRANSIT: 'in_transit',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELED: 'cancelled',
  CANCELLED: 'cancelled',
};

const BALANCE_TYPE_MAP: Record<string, BalanceTransactionType> = {
  CHARGE: 'charge',
  REFUND: 'refund',
  ADJUSTMENT: 'adjustment',
  FEE: 'fee',
  DISPUTE: 'dispute',
  RESERVE: 'reserve',
};

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

export function mapPayout(p: ShopifyPayout) {
  const fees =
    num(p.summary.chargesFee.amount) +
    num(p.summary.refundsFee.amount) +
    num(p.summary.adjustmentsFee.amount);
  return {
    source: SOURCE.SHOPIFY,
    source_payout_id: gid(p.id),
    payout_date: p.issuedAt ? new Date(p.issuedAt) : null,
    status: PAYOUT_STATUS_MAP[p.status.toUpperCase()] ?? 'scheduled',
    amount: num(p.net.amount),
    currency: p.net.currencyCode,
    bank_summary: p.bankAccount,
    charges_gross: num(p.summary.chargesGross.amount),
    refunds_gross: num(p.summary.refundsGross.amount),
    adjustments_gross: num(p.summary.adjustmentsGross.amount),
    fees_total: fees,
    source_metadata: null,
    synced_at: new Date(),
    updated_at: new Date(),
  };
}

export function mapBalanceTransaction(t: ShopifyBalanceTransaction) {
  return {
    source: SOURCE.SHOPIFY,
    source_balance_transaction_id: gid(t.id),
    payout_id: null,
    source_payout_id: t.associatedPayout ? gid(t.associatedPayout.id) : null,
    transaction_id: t.sourceOrderTransactionId ?? t.sourceId,
    type: BALANCE_TYPE_MAP[t.type.toUpperCase()] ?? 'adjustment',
    amount: num(t.amount.amount),
    fee: num(t.fee.amount),
    net: num(t.net.amount),
    processed_at: t.transactionDate ? new Date(t.transactionDate) : null,
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
