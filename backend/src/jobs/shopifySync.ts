import db from '../config/database';
import { fetchRecentOrders, fetchAbandonedCheckouts, ShopifyOrder } from '../connectors/shopify';

export async function syncShopifyOrders(): Promise<void> {
  try {
    const { rows } = await db.query(
      "SELECT last_sync_at FROM connector_health WHERE connector_name = 'shopify'"
    );
    const lastSync: string | undefined = rows[0]?.last_sync_at?.toISOString().split('T')[0];

    const orders: ShopifyOrder[] = await fetchRecentOrders(lastSync);
    let count = 0;

    for (const order of orders) {
      const isCOD =
        order.paymentGatewayNames?.includes('cash on delivery') ||
        order.paymentGatewayNames?.some((g) => g.toLowerCase().includes('cod'));
      const paymentMode = isCOD ? 'COD' : 'Prepaid';

      await db.query(
        `INSERT INTO shopify_orders
          (order_id, order_name, created_at, revenue, payment_mode,
           financial_status, fulfillment_status, customer_id, customer_email,
           customer_city, customer_state, discount_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (order_id) DO UPDATE SET
           financial_status = EXCLUDED.financial_status,
           fulfillment_status = EXCLUDED.fulfillment_status,
           synced_at = NOW()`,
        [
          order.id,
          order.name,
          order.createdAt,
          parseFloat(order.totalPriceSet?.shopMoney?.amount || '0'),
          paymentMode,
          order.displayFinancialStatus,
          order.displayFulfillmentStatus,
          order.customer?.id || null,
          order.customer?.email || null,
          order.customer?.defaultAddress?.city || null,
          order.customer?.defaultAddress?.province || null,
          order.discountCodes?.[0]?.code || null,
        ]
      );

      for (const { node: item } of order.lineItems?.edges || []) {
        await db.query(
          `INSERT INTO shopify_order_lineitems
            (order_id, sku, title, variant, quantity, unit_price)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT DO NOTHING`,
          [
            order.id,
            item.sku,
            item.title,
            item.variant?.title || null,
            item.quantity,
            parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || '0'),
          ]
        );
      }
      count++;
    }

    await db.query(
      `UPDATE connector_health
       SET last_sync_at = NOW(), status = 'green', records_synced = $1, error_message = NULL
       WHERE connector_name = 'shopify'`,
      [count]
    );

    console.log(`[Shopify] Synced ${count} orders`);
  } catch (err) {
    await db.query(
      `UPDATE connector_health SET status = 'red', error_message = $1
       WHERE connector_name = 'shopify'`,
      [(err as Error).message]
    );
    console.error('[Shopify] Sync error:', (err as Error).message);
  }
}

export async function syncAbandonedCheckouts(): Promise<void> {
  try {
    const checkouts = await fetchAbandonedCheckouts();
    let count = 0;
    for (const checkout of checkouts) {
      await db.query(
        `INSERT INTO shopify_abandoned_checkouts
          (checkout_id, created_at, cart_value, email)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (checkout_id) DO NOTHING`,
        [
          checkout.id,
          checkout.createdAt,
          parseFloat(checkout.totalPriceV2?.amount || '0'),
          checkout.email || null,
        ]
      );
      count++;
    }
    console.log(`[Shopify] Synced ${count} abandoned checkouts`);
  } catch (err) {
    console.error('[Shopify] Abandoned checkout sync error:', (err as Error).message);
  }
}
