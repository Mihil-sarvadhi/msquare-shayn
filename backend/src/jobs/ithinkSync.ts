import db from '../config/database';
import { trackOrders, getRemittance } from '../connectors/ithink';

export async function syncIthinkShipments(): Promise<void> {
  try {
    const { rows } = await db.query<{ awb: string }>(`
      SELECT awb FROM ithink_shipments
      WHERE current_status_code NOT IN ('DL', 'CN')
      AND order_date >= NOW() - INTERVAL '30 days'
    `);

    const awbList = rows.map((r) => r.awb);
    if (awbList.length === 0) {
      console.log('[iThink] No shipments to update');
      return;
    }

    const tracking = await trackOrders(awbList);
    let count = 0;

    for (const [awb, data] of Object.entries(tracking)) {
      if (data.message !== 'success') continue;
      await db.query(
        `UPDATE ithink_shipments SET
           current_status = $1,
           current_status_code = $2,
           ofd_count = $3,
           delivered_date = $4,
           rto_date = $5,
           synced_at = NOW()
         WHERE awb = $6`,
        [
          data.current_status,
          data.current_status_code,
          parseInt(data.ofd_count || '0', 10),
          data.order_date_time?.delivery_date || null,
          data.order_date_time?.rto_delivered_date || null,
          awb,
        ]
      );
      count++;
    }

    await db.query(
      `UPDATE connector_health
       SET last_sync_at = NOW(), status = 'green', records_synced = $1
       WHERE connector_name = 'ithink'`,
      [count]
    );

    console.log(`[iThink] Updated ${count} shipments`);
  } catch (err) {
    await db.query(
      `UPDATE connector_health SET status = 'red', error_message = $1
       WHERE connector_name = 'ithink'`,
      [(err as Error).message]
    );
    console.error('[iThink] Sync error:', (err as Error).message);
  }
}

export async function syncDailyRemittance(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await getRemittance(today);
    if (res.status !== 'success' || !res.data?.length) return;

    const r = res.data[0];
    await db.query(
      `INSERT INTO ithink_remittance
        (remittance_date, cod_generated, bill_adjusted, transaction_fee,
         gst_charges, wallet_amount, advance_hold, cod_remitted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (remittance_date) DO UPDATE SET
         cod_remitted = EXCLUDED.cod_remitted, synced_at = NOW()`,
      [
        today,
        r.cod_generated,
        r.bill_adjusted,
        r.transaction_charges,
        r.transaction_gst_charges,
        r.wallet_amount,
        r.advance_hold,
        r.cod_remitted,
      ]
    );
    console.log(`[iThink] Remittance synced for ${today}`);
  } catch (err) {
    console.error('[iThink] Remittance sync error:', (err as Error).message);
  }
}
