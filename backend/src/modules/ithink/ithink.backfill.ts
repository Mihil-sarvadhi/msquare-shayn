import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { IthinkShipment } from '@db/models';
import { getStoreOrderDetails, trackAWBs, type StoreOrderItem } from './ithink.connector';
import { logger } from '@logger/logger';

const BATCH = 50; // iThink allows up to 50 order IDs per call

export async function ithinkBackfill(): Promise<void> {
  logger.info('[iThink Backfill] Loading Shopify order IDs...');

  const rows = await sequelize.query<{ order_id: string }>(
    `SELECT order_id FROM shopify_orders WHERE order_id LIKE 'gid://shopify/Order/%' ORDER BY created_at ASC`,
    { type: QueryTypes.SELECT },
  );

  const allNumericIds = rows.map((r) => r.order_id.split('/').pop()!);
  logger.info(`[iThink Backfill] ${allNumericIds.length} orders to look up`);

  let totalInserted = 0;

  for (let i = 0; i < allNumericIds.length; i += BATCH) {
    const chunk = allNumericIds.slice(i, i + BATCH);
    const gqlChunk = rows.slice(i, i + BATCH).map((r) => r.order_id);

    try {
      const res = await getStoreOrderDetails(chunk);
      if (!res || res.status !== 'success' || !res.data) {
        logger.info(`[iThink Backfill] Batch ${i}–${i + BATCH}: no data`);
        continue;
      }

      const awbsToTrack: string[] = [];
      const orderMap: Record<string, { numericId: string; gqlId: string; item: StoreOrderItem }> = {};

      for (let j = 0; j < chunk.length; j++) {
        const numericId = chunk[j];
        const item = res.data[numericId];
        if (!item?.awb_no) continue;
        awbsToTrack.push(item.awb_no);
        orderMap[item.awb_no] = { numericId, gqlId: gqlChunk[j], item };
      }

      const trackData = awbsToTrack.length > 0 ? await trackAWBs(awbsToTrack) : {};

      for (const [awb, { gqlId, item }] of Object.entries(orderMap)) {
        const track = trackData[awb];
        await IthinkShipment.findOrCreate({
          where: { awb },
          defaults: {
            awb,
            order_id: item.order_number,
            order_date: item.order_date?.split(' ')[0] || undefined,
            courier: item.logistic,
            weight: item.weight ? parseFloat(item.weight) : undefined,
            payment_mode: item.payment_mode?.toLowerCase() === 'cod' ? 'COD' : 'Prepaid',
            current_status: track?.current_status || undefined,
            current_status_code: track?.current_status_code || undefined,
            ofd_count: track?.ofd_count ? parseInt(String(track.ofd_count), 10) : 0,
            delivered_date: track?.order_date_time?.delivery_date || undefined,
            rto_date: track?.order_date_time?.rto_delivered_date || undefined,
            customer_state: item.customer_state,
            customer_city: item.customer_city,
            customer_pincode: item.customer_pincode,
            billed_fwd_charges: parseFloat(item.billing_fwd_charges || '0'),
            billed_rto_charges: parseFloat(item.billing_rto_charges || '0'),
            billed_cod_charges: parseFloat(item.billing_cod_charges || '0'),
            billed_gst_charges: parseFloat(item.billing_gst_charges || '0'),
            billed_total: parseFloat(item.billed_total_charges || '0'),
            shopify_order_gql_id: gqlId,
          },
        });
        totalInserted++;
      }

      logger.info(`[iThink Backfill] Batch ${i}–${i + BATCH}: ${Object.keys(orderMap).length} shipments`);
    } catch (err) {
      logger.error(`[iThink Backfill] Batch ${i} error: ${(err as Error).message}`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  logger.info(`[iThink Backfill] Done. Inserted ${totalInserted} shipments.`);
}

if (require.main === module) {
  ithinkBackfill().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}
