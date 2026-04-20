import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ConnectorHealth, IthinkShipment, IthinkRemittance } from '@db/models';
import { trackAWBs, getRemittanceSummary } from './ithink.connector';
import { logger } from '@logger/logger';

export async function syncIthinkShipments(): Promise<void> {
  try {
    const rows = await sequelize.query<{ awb: string }>(
      `SELECT awb FROM ithink_shipments
       WHERE current_status_code NOT IN ('DL', 'CN')
       AND order_date >= NOW() - INTERVAL '30 days'`,
      { type: QueryTypes.SELECT }
    );

    const awbList = rows.map((r) => r.awb);
    if (awbList.length === 0) {
      logger.info('[iThink] No shipments to update');
      return;
    }

    const tracking = await trackAWBs(awbList);
    let count = 0;

    for (const [awb, data] of Object.entries(tracking)) {
      await IthinkShipment.update(
        {
          current_status: data.current_status,
          current_status_code: data.current_status_code,
          ofd_count: parseInt(data.ofd_count || '0', 10),
          delivered_date: data.order_date_time?.delivery_date || undefined,
          rto_date: data.order_date_time?.rto_delivered_date || undefined,
        },
        { where: { awb } }
      );
      count++;
    }

    await ConnectorHealth.update(
      { last_sync_at: new Date(), status: 'green', records_synced: count, error_message: undefined },
      { where: { connector_name: 'ithink' } }
    );

    logger.info(`[iThink] Updated ${count} shipments`);
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'ithink' } }
    );
    logger.error(`[iThink] Sync error: ${(err as Error).message}`);
  }
}

export async function syncDailyRemittance(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await getRemittanceSummary(today);
    if (res.status !== 'success' || !res.data?.length) return;

    const r = res.data[0];
    await IthinkRemittance.upsert({
      remittance_date: today,
      cod_generated: parseFloat(r.cod_generated),
      bill_adjusted: parseFloat(r.bill_adjusted),
      transaction_fee: parseFloat(r.transaction_charges),
      gst_charges: parseFloat(r.transaction_gst_charges),
      wallet_amount: parseFloat(r.wallet_amount),
      advance_hold: parseFloat(r.advance_hold),
      cod_remitted: parseFloat(r.cod_remitted),
    });

    logger.info(`[iThink] Remittance synced for ${today}`);
  } catch (err) {
    logger.error(`[iThink] Remittance sync error: ${(err as Error).message}`);
  }
}
