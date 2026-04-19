import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { ShopifyOrder } from '@db/models';
import { environment } from '@config/config';
import { logger } from '@logger/logger';

const router = Router();

function verifyWebhookHmac(body: Buffer, hmacHeader: string): boolean {
  const digest = crypto
    .createHmac('sha256', environment.shopify.webhookSecret)
    .update(body)
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

router.post('/orders/create', async (req: Request, res: Response) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
  if (!hmacHeader || !verifyWebhookHmac(req.body as Buffer, hmacHeader)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const order = JSON.parse((req.body as Buffer).toString());
    const paymentGateways: string[] = order.payment_gateway_names || [];
    const isCOD =
      paymentGateways.includes('cash on delivery') ||
      paymentGateways.some((g: string) => g.toLowerCase().includes('cod'));

    await ShopifyOrder.upsert({
      order_id: `gid://shopify/Order/${order.id}`,
      order_name: order.name,
      created_at: new Date(order.created_at),
      revenue: parseFloat(order.total_price || '0'),
      payment_mode: isCOD ? 'COD' : 'Prepaid',
      financial_status: order.financial_status,
      fulfillment_status: order.fulfillment_status || 'unfulfilled',
      customer_id: order.customer?.id ? `gid://shopify/Customer/${order.customer.id}` : undefined,
      customer_email: order.email || undefined,
      customer_city: order.shipping_address?.city || undefined,
      customer_state: order.shipping_address?.province || undefined,
      discount_code: order.discount_codes?.[0]?.code || undefined,
    });

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error(`[Webhook] Order create error: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/orders/updated', async (req: Request, res: Response) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
  if (!hmacHeader || !verifyWebhookHmac(req.body as Buffer, hmacHeader)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const order = JSON.parse((req.body as Buffer).toString());
    await ShopifyOrder.update(
      {
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status || 'unfulfilled',
      },
      { where: { order_id: `gid://shopify/Order/${order.id}` } }
    );
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error(`[Webhook] Order update error: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
