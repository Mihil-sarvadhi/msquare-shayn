import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ConnectorHealth, UnicommerceOrder, UnicommerceOrderItem } from '@db/models';
import * as connector from './unicommerce.connector';
import type { UCOrderDTO, UCOrderItem, UCOrderSummary } from './unicommerce.connector';
import { logger } from '@logger/logger';

export const UNICOMMERCE_CHANNELS = ['FLIPKART', 'AMAZON', 'MYNTRA', 'ETERNZ'] as const;
export type UnicommerceChannel = (typeof UNICOMMERCE_CHANNELS)[number];

const PAGE_SIZE = 50;
const ORDER_DETAIL_DELAY_MS = 100;

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toNumber(value: number | string | undefined, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value: number | string | undefined, fallback = 1): number {
  if (value === undefined || value === null) return fallback;
  const n = typeof value === 'number' ? Math.floor(value) : parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function upsertOrder(order: UCOrderDTO): Promise<void> {
  await UnicommerceOrder.upsert({
    order_code: order.code,
    display_order_code: order.displayOrderCode,
    channel: order.channel,
    status: order.status,
    order_date: toDate(order.displayOrderDateTime),
    updated_date: toDate(order.updated),
    fulfillment_tat: toDate(order.fulfillmentTat),
    cod: order.cod ?? false,
    currency: order.currencyCode ?? 'INR',
    total_price: toNumber(order.orderPrice?.totalPrice),
    shipping_charges: toNumber(order.orderPrice?.totalShippingCharges),
    discount: toNumber(order.orderPrice?.totalDiscount),
    cod_charges: toNumber(order.orderPrice?.totalCashOnDeliveryCharges),
    prepaid_amount: toNumber(order.orderPrice?.totalPrepaidAmount),
    customer_name: order.customerCode,
    customer_email: order.notificationEmail,
    customer_mobile: order.notificationMobile,
    city: order.shippingAddress?.city,
    state: order.shippingAddress?.state,
    pincode: order.shippingAddress?.pincode,
    facility_code: order.facilityCode,
    third_party_shipping: order.thirdPartyShipping ?? false,
    on_hold: order.onHold ?? false,
    synced_at: new Date(),
  });
}

async function upsertItem(orderCode: string, channel: string, item: UCOrderItem): Promise<void> {
  if (!item.code) return;
  await UnicommerceOrderItem.upsert({
    order_code: orderCode,
    item_code: item.code,
    sku: item.itemSku,
    product_name: item.itemName,
    quantity: toInt(item.quantity, 1),
    selling_price: toNumber(item.sellingPrice),
    discount: toNumber(item.discount),
    shipping_charges: toNumber(item.shippingCharges),
    cod_charges: toNumber(item.cashOnDeliveryCharges),
    total_price: toNumber(item.totalPrice),
    transfer_price: toNumber(item.transferPrice),
    status: item.statusCode,
    channel: item.channel ?? channel,
    return_reason: item.returnReason ?? undefined,
    return_awb: item.returnAWBNumber ?? undefined,
    facility_code: item.facilityCode,
    synced_at: new Date(),
  });
}

interface ProgressContext {
  channelLabel: string;
  position: number;
  expected: number | null;
}

function progressPrefix(ctx: ProgressContext): string {
  const total = ctx.expected ? String(ctx.expected) : '?';
  const width = total.length;
  const pos = String(ctx.position).padStart(width, ' ');
  return `[${ctx.channelLabel} ${pos}/${total}]`;
}

async function syncOrderDetail(
  summary: UCOrderSummary,
  channel: string,
  ctx: ProgressContext,
): Promise<boolean> {
  const startedAt = Date.now();
  const prefix = progressPrefix(ctx);
  try {
    const detail = await connector.getOrderDetails(summary.code);
    if (!detail.successful || !detail.saleOrderDTO) {
      logger.warn(
        `[Unicommerce] ${prefix} ${summary.code} → skipped (successful=false: ${detail.message ?? 'no message'})`,
      );
      return false;
    }
    const dto = detail.saleOrderDTO;
    await upsertOrder(dto);
    const items = dto.saleOrderItems ?? [];
    for (const item of items) {
      await upsertItem(dto.code, dto.channel ?? channel, item);
    }
    const ms = Date.now() - startedAt;
    const orderDate = dto.displayOrderDateTime ?? summary.displayOrderDateTime ?? '—';
    logger.info(
      `[Unicommerce] ${prefix} ${summary.code} (${dto.channel ?? channel}) ` +
        `${items.length} items, ${dto.status ?? '?'}, ordered ${orderDate}, ${ms}ms → ok`,
    );
    return true;
  } catch (err) {
    logger.error(`[Unicommerce] ${prefix} ${summary.code} → error: ${(err as Error).message}`);
    return false;
  }
}

/**
 * Pull all orders for a date range across all channels (and a channel-less
 * sweep so any uncategorised orders are still captured). For each order, fetch
 * full detail to resolve line items and pricing.
 */
export async function syncOrders(fromDate: string, toDate: string): Promise<number> {
  let total = 0;
  // include null channel to capture orders without channel-specific tagging
  const channelsToSweep: Array<UnicommerceChannel | null> = [...UNICOMMERCE_CHANNELS, null];

  for (const channel of channelsToSweep) {
    const channelLabel = channel ?? 'NO_CHANNEL';
    let start = 0;
    let synced = 0;
    let failed = 0;
    let position = 0;
    let expected: number | null = null;
    const channelStartedAt = Date.now();

    logger.info(
      `[Unicommerce] ── Channel ${channelLabel} | ${fromDate.slice(0, 10)} → ${toDate.slice(0, 10)} ──`,
    );

    while (true) {
      let response;
      try {
        response = await connector.searchOrders(fromDate, toDate, channel, start, PAGE_SIZE);
      } catch (err) {
        logger.error(
          `[Unicommerce] searchOrders failed (${channelLabel}, start=${start}): ${(err as Error).message}`,
        );
        break;
      }
      const orders = response.saleOrderSummaries ?? response.elements ?? [];
      if (expected === null && typeof response.totalRecords === 'number') {
        expected = response.totalRecords;
        logger.info(`[Unicommerce] ${channelLabel}: ${expected} order(s) expected`);
      }
      if (!orders.length) break;

      for (const summary of orders) {
        position++;
        const ok = await syncOrderDetail(summary, channel ?? summary.channel ?? channelLabel, {
          channelLabel,
          position,
          expected,
        });
        if (ok) {
          synced++;
          total++;
        } else {
          failed++;
        }
        await sleep(ORDER_DETAIL_DELAY_MS);
      }

      if (orders.length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }

    const durationS = Math.round((Date.now() - channelStartedAt) / 1000);
    logger.info(
      `[Unicommerce] ── Channel ${channelLabel} done — ${synced} ok, ${failed} failed, ${durationS}s ──`,
    );
  }

  return total;
}

/**
 * Recompute the daily channel summary table for a date range. Driven by the
 * order rows that the sync just upserted, so it stays consistent without an
 * extra round-trip to Uniware.
 */
export async function aggregateChannelDaily(since: string, until: string): Promise<void> {
  await sequelize.query(
    `INSERT INTO unicommerce_channel_daily (
       date, channel, orders, revenue, units_sold,
       cancelled_orders, returned_orders, cod_orders, prepaid_orders, synced_at
     )
     SELECT
       o.order_date::date AS date,
       COALESCE(o.channel, 'UNKNOWN') AS channel,
       COUNT(*)::int AS orders,
       COALESCE(SUM(o.total_price), 0) AS revenue,
       COALESCE(SUM(items.qty), 0)::int AS units_sold,
       SUM(CASE WHEN o.status = 'CANCELLED' THEN 1 ELSE 0 END)::int AS cancelled_orders,
       SUM(CASE WHEN o.status IN ('RETURN_REQUESTED','RETURNED','RETURN_EXPECTED') THEN 1 ELSE 0 END)::int AS returned_orders,
       SUM(CASE WHEN o.cod = TRUE THEN 1 ELSE 0 END)::int AS cod_orders,
       SUM(CASE WHEN o.cod = FALSE THEN 1 ELSE 0 END)::int AS prepaid_orders,
       NOW()
     FROM unicommerce_orders o
     LEFT JOIN (
       SELECT order_code, SUM(quantity) AS qty
       FROM unicommerce_order_items
       GROUP BY order_code
     ) items ON items.order_code = o.order_code
     WHERE o.order_date::date BETWEEN :since AND :until
       AND o.order_date IS NOT NULL
     GROUP BY o.order_date::date, COALESCE(o.channel, 'UNKNOWN')
     ON CONFLICT (date, channel) DO UPDATE SET
       orders           = EXCLUDED.orders,
       revenue          = EXCLUDED.revenue,
       units_sold       = EXCLUDED.units_sold,
       cancelled_orders = EXCLUDED.cancelled_orders,
       returned_orders  = EXCLUDED.returned_orders,
       cod_orders       = EXCLUDED.cod_orders,
       prepaid_orders   = EXCLUDED.prepaid_orders,
       synced_at        = NOW()`,
    { type: QueryTypes.INSERT, replacements: { since, until } },
  );
}

/**
 * Cron entry — sync the trailing 2 days for all marketplace channels and
 * recompute the channel-daily aggregates so the dashboard stays current.
 */
export async function syncUnicommerce(): Promise<void> {
  try {
    const now = new Date();
    const fromIso = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const toIso = now.toISOString();
    const since = fromIso.slice(0, 10);
    const until = toIso.slice(0, 10);

    const count = await syncOrders(fromIso, toIso);
    await aggregateChannelDaily(since, until);

    await ConnectorHealth.update(
      {
        last_sync_at: new Date(),
        status: 'green',
        records_synced: count,
        error_message: undefined,
      },
      { where: { connector_name: 'unicommerce' } },
    );

    logger.info(`[Unicommerce] Sync complete — ${count} orders processed`);
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'unicommerce' } },
    );
    logger.error(`[Unicommerce] Sync failed: ${(err as Error).message}`);
  }
}
