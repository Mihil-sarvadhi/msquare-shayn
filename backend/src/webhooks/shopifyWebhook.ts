import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import db from '../config/database';

const router = Router();

function verifyWebhookHmac(body: Buffer, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET as string;
  const digest = crypto.createHmac('sha256', secret).update(body).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

router.post('/orders/create', async (req: Request, res: Response) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
  if (!hmacHeader || !verifyWebhookHmac(req.body as Buffer, hmacHeader)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const order = JSON.parse((req.body as Buffer).toString());
    const paymentGateways: string[] = order.payment_gateway_names || [];
    const isCOD =
      paymentGateways.includes('cash on delivery') ||
      paymentGateways.some((g: string) => g.toLowerCase().includes('cod'));

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
        `gid://shopify/Order/${order.id}`,
        order.name,
        order.created_at,
        parseFloat(order.total_price || '0'),
        isCOD ? 'COD' : 'Prepaid',
        order.financial_status,
        order.fulfillment_status || 'unfulfilled',
        order.customer?.id ? `gid://shopify/Customer/${order.customer.id}` : null,
        order.email || null,
        order.shipping_address?.city || null,
        order.shipping_address?.province || null,
        order.discount_codes?.[0]?.code || null,
      ],
    );

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook] Order create error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/orders/updated', async (req: Request, res: Response) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
  if (!hmacHeader || !verifyWebhookHmac(req.body as Buffer, hmacHeader)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const order = JSON.parse((req.body as Buffer).toString());
    await db.query(
      `UPDATE shopify_orders SET
         financial_status = $1,
         fulfillment_status = $2,
         synced_at = NOW()
       WHERE order_id = $3`,
      [
        order.financial_status,
        order.fulfillment_status || 'unfulfilled',
        `gid://shopify/Order/${order.id}`,
      ],
    );
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook] Order update error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
