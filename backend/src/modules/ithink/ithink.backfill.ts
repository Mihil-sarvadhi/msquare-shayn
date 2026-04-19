import { IthinkShipment } from '@db/models';
import { getOrderDetails, type IthinkOrder } from './ithink.connector';
import { logger } from '@logger/logger';

export async function ithinkBackfill(): Promise<void> {
  logger.info('[iThink Backfill] Starting 12-month pull...');

  const months: Array<{ start: string; end: string }> = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
    months.push({ start: `${year}-${month}-01`, end: `${year}-${month}-${lastDay}` });
  }

  let totalInserted = 0;
  for (const { start, end } of months) {
    logger.info(`[iThink Backfill] Fetching ${start} → ${end}...`);
    try {
      const res = await getOrderDetails(start, end);
      if (!res || res.status !== 'success' || !res.data) continue;

      for (const [awb, order] of Object.entries(res.data) as [string, IthinkOrder][]) {
        await IthinkShipment.findOrCreate({
          where: { awb },
          defaults: {
            awb,
            order_id: order.order,
            order_date: order.order_date?.split(' ')[0] || undefined,
            courier: order.logistic,
            zone: order.billing_zone,
            payment_mode: order.payment_mode === 'cod' ? 'COD' : 'Prepaid',
            current_status: order.latest_courier_status,
            billed_fwd_charges: parseFloat(order.billing_fwd_charges || '0'),
            billed_rto_charges: parseFloat(order.billing_rto_charges || '0'),
            billed_cod_charges: parseFloat(order.billing_cod_charges || '0'),
            billed_gst_charges: parseFloat(order.billing_gst_charges || '0'),
            billed_total: parseFloat(order.billed_total_charges || '0'),
            remittance_amount: parseFloat(order.remittance_amount || '0'),
            ofd_count: parseInt(order.ofd_count || '0', 10),
            delivered_date: order.expected_delivery_date || undefined,
            customer_state: order.customer_state,
            customer_city: order.customer_city,
            customer_pincode: order.customer_pincode,
          },
        });
        totalInserted++;
      }
    } catch (err) {
      logger.error(`[iThink Backfill] Error for ${start}: ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  logger.info(`[iThink Backfill] Done. Inserted ${totalInserted} shipments.`);
}

if (require.main === module) {
  ithinkBackfill().catch((err) => { logger.error(err); process.exit(1); });
}
