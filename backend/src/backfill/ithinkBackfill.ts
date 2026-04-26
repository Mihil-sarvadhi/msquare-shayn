import * as dotenv from 'dotenv';
dotenv.config();

import db from '../config/database';
import { getOrderDetails, IthinkOrder } from '../connectors/ithink';

async function backfillIthink(): Promise<void> {
  console.error('[iThink Backfill] Starting 12-month pull...');

  const months: Array<{ start: string; end: string }> = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
    months.push({
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${lastDay}`,
    });
  }

  let totalInserted = 0;
  for (const { start, end } of months) {
    console.error(`[iThink Backfill] Fetching ${start} → ${end}...`);
    try {
      const res = await getOrderDetails(start, end);
      if (!res) {
        console.error(`[iThink Backfill] No data for ${start}`);
        continue;
      }
      if (res.status !== 'success') {
        console.error(
          `[iThink Backfill] API error for ${start}: ${
            (res as unknown as Record<string, string>).html_message || res.status
          }`,
        );
        continue;
      }
      if (!res.data) continue;

      for (const [awb, order] of Object.entries(res.data) as [string, IthinkOrder][]) {
        await db.query(
          `INSERT INTO ithink_shipments
            (awb, order_id, order_date, courier, zone, payment_mode,
             current_status, billed_fwd_charges, billed_rto_charges,
             billed_cod_charges, billed_gst_charges, billed_total,
             remittance_amount, ofd_count, delivered_date, customer_state,
             customer_city, customer_pincode)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           ON CONFLICT (awb) DO NOTHING`,
          [
            awb,
            order.order,
            order.order_date?.split(' ')[0] || null,
            order.logistic,
            order.billing_zone,
            order.payment_mode === 'cod' ? 'COD' : 'Prepaid',
            order.latest_courier_status,
            parseFloat(order.billing_fwd_charges || '0'),
            parseFloat(order.billing_rto_charges || '0'),
            parseFloat(order.billing_cod_charges || '0'),
            parseFloat(order.billing_gst_charges || '0'),
            parseFloat(order.billed_total_charges || '0'),
            parseFloat(order.remittance_amount || '0'),
            parseInt(order.ofd_count || '0', 10),
            order.expected_delivery_date || null,
            order.customer_state,
            order.customer_city,
            order.customer_pincode,
          ],
        );
        totalInserted++;
      }
    } catch (err) {
      console.error(`[iThink Backfill] Error for ${start}:`, (err as Error).message);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.error(`[iThink Backfill] Done. Inserted ${totalInserted} shipments.`);
  await db.end();
}

backfillIthink().catch((err) => {
  console.error(err);
  process.exit(1);
});
