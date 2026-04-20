import { IthinkShipment } from '@db/models';
import { getStoreOrderDetails, type StoreOrderItem } from './ithink.connector';
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
      const months_list: string[] = [];
      const currDate = new Date(`${start}T00:00:00Z`);
      const endDate = new Date(`${end}T23:59:59Z`);
      while (currDate <= endDate) {
        months_list.push(currDate.toISOString().split('T')[0]);
        currDate.setDate(currDate.getDate() + 1);
      }

      const numericOrderIds = months_list.map((d) => d.replace(/-/g, ''));
      const res = await getStoreOrderDetails(numericOrderIds);
      if (!res || res.status !== 'success' || !res.data) continue;

      for (const [, order] of Object.entries(res.data) as [string, StoreOrderItem | null][]) {
        if (!order) continue;
        await IthinkShipment.findOrCreate({
          where: { awb: order.awb_no },
          defaults: {
            awb: order.awb_no,
            order_id: order.order_number,
            order_date: order.order_date?.split(' ')[0] || undefined,
            courier: order.logistic,
            zone: undefined,
            payment_mode: order.payment_mode === 'cod' ? 'COD' : 'Prepaid',
            current_status: undefined,
            billed_fwd_charges: parseFloat(order.billing_fwd_charges || '0'),
            billed_rto_charges: parseFloat(order.billing_rto_charges || '0'),
            billed_cod_charges: parseFloat(order.billing_cod_charges || '0'),
            billed_gst_charges: parseFloat(order.billing_gst_charges || '0'),
            billed_total: parseFloat(order.billed_total_charges || '0'),
            remittance_amount: undefined,
            ofd_count: 0,
            delivered_date: undefined,
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
  ithinkBackfill().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}
