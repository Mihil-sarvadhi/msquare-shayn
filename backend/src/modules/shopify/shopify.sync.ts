import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import {
  ShopifyOrder,
  ShopifyOrderLineitem,
  ShopifyCustomer,
  ShopifyAbandonedCheckout,
  ConnectorHealth,
} from '@db/models';
import {
  fetchRecentOrders,
  fetchAbandonedCheckouts,
  fetchCustomers,
  type ShopifyOrder as ShopifyOrderData,
  type ShopifyCustomer as ShopifyCustomerData,
} from './shopify.connector';
import { logger } from '@logger/logger';

export async function syncShopifyCustomers(): Promise<number> {
  const customers: ShopifyCustomerData[] = await fetchCustomers();
  let count = 0;

  for (const customer of customers) {
    await ShopifyCustomer.upsert({
      customer_id: customer.id,
      email: customer.email ?? undefined,
      first_name: customer.firstName ?? undefined,
      last_name: customer.lastName ?? undefined,
      city: customer.defaultAddress?.city ?? undefined,
      state: customer.defaultAddress?.province ?? undefined,
      created_at: customer.createdAt ? new Date(customer.createdAt) : undefined,
      synced_at: new Date(),
    });
    count++;
  }

  return count;
}

export async function syncShopifyOrders(): Promise<void> {
  try {
    const [healthRow] = await sequelize.query<{ last_sync_at: Date | null }>(
      `SELECT last_sync_at FROM connector_health WHERE connector_name = 'shopify'`,
      { type: QueryTypes.SELECT },
    );
    const lastSync = healthRow?.last_sync_at?.toISOString().split('T')[0];

    const orders: ShopifyOrderData[] = await fetchRecentOrders(lastSync);
    let count = 0;

    for (const order of orders) {
      const isCOD =
        order.paymentGatewayNames?.includes('cash on delivery') ||
        order.paymentGatewayNames?.some((g) => g.toLowerCase().includes('cod'));
      const paymentMode = isCOD ? 'COD' : 'Prepaid';

      const totalRevenue = parseFloat(order.totalPriceSet?.shopMoney?.amount || '0');
      const totalDiscounts = parseFloat(order.totalDiscountsSet?.shopMoney?.amount || '0');
      const totalShipping = parseFloat(order.totalShippingPriceSet?.shopMoney?.amount || '0');
      const totalTax = parseFloat(order.totalTaxSet?.shopMoney?.amount || '0');
      const totalRefunded = parseFloat(order.totalRefundedSet?.shopMoney?.amount || '0');
      const grossSales = totalRevenue + totalDiscounts + totalRefunded - totalTax - totalShipping;

      await ShopifyOrder.upsert({
        order_id: order.id,
        order_name: order.name,
        created_at: new Date(order.createdAt),
        revenue: totalRevenue,
        gross_sales: grossSales,
        total_discounts: totalDiscounts,
        total_tax: totalTax,
        total_shipping: totalShipping,
        total_refunded: totalRefunded,
        payment_mode: paymentMode,
        financial_status: order.displayFinancialStatus,
        fulfillment_status: order.displayFulfillmentStatus,
        customer_id: order.customer?.id || undefined,
        customer_email: order.customer?.email || undefined,
        customer_name: order.customer
          ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ') ||
            undefined
          : undefined,
        customer_city: order.customer?.defaultAddress?.city || undefined,
        customer_state: order.customer?.defaultAddress?.province || undefined,
        discount_code: order.discountCodes?.[0] || undefined,
      });

      for (const { node: item } of order.lineItems?.edges || []) {
        const lineWhere = item.sku
          ? { order_id: order.id, sku: item.sku, title: item.title }
          : { order_id: order.id, title: item.title };
        await ShopifyOrderLineitem.findOrCreate({
          where: lineWhere,
          defaults: {
            order_id: order.id,
            sku: item.sku || undefined,
            title: item.title,
            variant: item.variant?.title || undefined,
            quantity: item.quantity,
            unit_price: parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || '0'),
          },
        });
      }
      count++;
    }

    const customersSynced = await syncShopifyCustomers();

    await ConnectorHealth.update(
      {
        last_sync_at: new Date(),
        status: 'green',
        records_synced: count,
        error_message: undefined,
      },
      { where: { connector_name: 'shopify' } },
    );

    logger.info(`[Shopify] Synced ${count} orders and ${customersSynced} customers`);
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'shopify' } },
    );
    logger.error(`[Shopify] Sync error: ${(err as Error).message}`);
  }
}

export async function syncAbandonedCheckouts(): Promise<void> {
  try {
    const checkouts = await fetchAbandonedCheckouts();
    let count = 0;
    for (const checkout of checkouts) {
      await ShopifyAbandonedCheckout.findOrCreate({
        where: { checkout_id: checkout.id },
        defaults: {
          checkout_id: checkout.id,
          created_at: new Date(checkout.createdAt),
          cart_value: parseFloat(checkout.totalPriceSet?.shopMoney?.amount || '0'),
          email: checkout.customer?.email || undefined,
        },
      });
      count++;
    }
    logger.info(`[Shopify] Synced ${count} abandoned checkouts`);
  } catch (err) {
    logger.error(`[Shopify] Abandoned checkout sync error: ${(err as Error).message}`);
  }
}
