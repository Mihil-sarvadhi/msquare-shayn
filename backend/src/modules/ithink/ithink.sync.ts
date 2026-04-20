import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import {
  ConnectorHealth,
  IthinkShipment,
  IthinkRemittance,
  IthinkRemittanceDetail,
} from '@db/models';
import {
  getStoreOrderDetails,
  trackAWBs,
  getRemittanceSummary,
  getRemittanceDetails,
} from './ithink.connector';
import { logger } from '@logger/logger';

function extractNumericId(gqlId: string): string {
  return gqlId.includes('/') ? gqlId.split('/').pop()! : gqlId;
}

/** Return undefined for empty, null, or clearly-invalid date strings (e.g. "0000-00-00") */
function safeDate(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return undefined;
  if (trimmed.startsWith('0000')) return undefined;
  return trimmed.split(' ')[0];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── 1. Backfill: drive from Shopify orders → enrich via iThink ────────────

export async function backfillShipments(since: string, until: string): Promise<void> {
  logger.info(`[iThink] Backfill shipments from ${since} to ${until}`);

  const shopifyOrders = await sequelize.query<{ order_id: string }>(
    `SELECT order_id FROM shopify_orders
     WHERE created_at::date BETWEEN :since AND :until
       AND financial_status != 'voided'
     ORDER BY created_at`,
    { type: QueryTypes.SELECT, replacements: { since, until } },
  );

  if (!shopifyOrders.length) {
    logger.info('[iThink] No Shopify orders in date range');
    return;
  }

  logger.info(`[iThink] Backfilling ${shopifyOrders.length} orders`);

  // Batch 50 at a time
  const batches: Array<typeof shopifyOrders> = [];
  for (let i = 0; i < shopifyOrders.length; i += 50) {
    batches.push(shopifyOrders.slice(i, i + 50));
  }

  let enriched = 0;

  for (const batch of batches) {
    const numericIds = batch.map((o) => extractNumericId(o.order_id));
    const gqlById = Object.fromEntries(
      batch.map((o) => [extractNumericId(o.order_id), o.order_id]),
    );

    let res;
    try {
      res = await getStoreOrderDetails(numericIds);
    } catch (err) {
      logger.error(`[iThink] Store order details batch failed: ${(err as Error).message}`);
      await sleep(500);
      continue;
    }

    if (res.status !== 'success' || !res.data) {
      logger.info(`[iThink] Batch returned status=${res.status}, message=${res.message ?? 'none'}`);
      await sleep(500);
      continue;
    }

    for (const [numericId, item] of Object.entries(res.data)) {
      if (!item || !item.awb_no) continue;

      await IthinkShipment.upsert({
        awb: item.awb_no,
        shopify_order_gql_id: gqlById[numericId],
        order_id: numericId,
        order_date: safeDate(item.order_date),
        courier: item.logistic || undefined,
        payment_mode: item.payment_mode || undefined,
        customer_city: item.customer_city || undefined,
        customer_state: item.customer_state || undefined,
        customer_pincode: item.customer_pincode || undefined,
        weight: item.weight ? parseFloat(item.weight) : undefined,
        billed_fwd_charges: item.billing_fwd_charges
          ? parseFloat(item.billing_fwd_charges)
          : undefined,
        billed_rto_charges: item.billing_rto_charges
          ? parseFloat(item.billing_rto_charges)
          : undefined,
        billed_cod_charges: item.billing_cod_charges
          ? parseFloat(item.billing_cod_charges)
          : undefined,
        billed_gst_charges: item.billing_gst_charges
          ? parseFloat(item.billing_gst_charges)
          : undefined,
        billed_total: item.billed_total_charges ? parseFloat(item.billed_total_charges) : undefined,
        raw_response: item as unknown as Record<string, unknown>,
      });
      enriched++;
    }

    await sleep(500);
  }

  logger.info(`[iThink] Backfill complete — ${enriched} shipments upserted`);
}

// ── 2. Status update: track in-flight AWBs ────────────────────────────────

export async function syncShipmentStatus(): Promise<void> {
  const inFlight = await sequelize.query<{ awb: string }>(
    `SELECT awb FROM ithink_shipments
     WHERE (current_status_code IS NULL OR current_status_code NOT IN ('DL', 'CN'))
       AND (order_date >= NOW() - INTERVAL '60 days' OR order_date IS NULL)`,
    { type: QueryTypes.SELECT },
  );

  if (!inFlight.length) {
    logger.info('[iThink] No in-flight shipments to track');
    return;
  }

  const awbList = inFlight.map((r) => r.awb);
  logger.info(`[iThink] Tracking ${awbList.length} in-flight AWBs`);

  let updated = 0;
  const tracking = await trackAWBs(awbList);

  for (const [awb, data] of Object.entries(tracking)) {
    const lastScanRaw = data.last_scan_details;
    const lastScan = lastScanRaw
      ? typeof lastScanRaw === 'string'
        ? lastScanRaw
        : JSON.stringify(lastScanRaw)
      : undefined;

    try {
      await IthinkShipment.update(
        {
          current_status: data.current_status,
          current_status_code: data.current_status_code,
          ofd_count: parseInt(data.ofd_count || '0', 10),
          expected_delivery: safeDate(data.expected_delivery_date),
          last_scan: lastScan,
          delivered_date: safeDate(data.order_date_time?.delivery_date),
          rto_date: safeDate(data.order_date_time?.rto_delivered_date),
        },
        { where: { awb } },
      );
      updated++;
    } catch (updateErr) {
      logger.warn(`[iThink] Failed to update AWB ${awb}: ${(updateErr as Error).message}`);
    }
  }

  logger.info(`[iThink] Tracking updated ${updated} shipments`);
}

// ── 3. Remittance: summary + AWB-level breakdown ──────────────────────────

export async function syncRemittance(date: string): Promise<void> {
  logger.info(`[iThink] Syncing remittance for ${date}`);

  try {
    const [summaryRes, detailRes] = await Promise.all([
      getRemittanceSummary(date),
      getRemittanceDetails(date),
    ]);

    if (summaryRes.status === 'success' && summaryRes.data?.length) {
      const r = summaryRes.data[0];
      await IthinkRemittance.upsert({
        remittance_date: date,
        cod_generated: parseFloat(r.cod_generated || '0'),
        bill_adjusted: parseFloat(r.bill_adjusted || '0'),
        transaction_fee: parseFloat(r.transaction_charges || '0'),
        gst_charges: parseFloat(r.transaction_gst_charges || '0'),
        wallet_amount: parseFloat(r.wallet_amount || '0'),
        advance_hold: parseFloat(r.advance_hold || '0'),
        cod_remitted: parseFloat(r.cod_remitted || '0'),
      });
      logger.info(`[iThink] Remittance summary saved for ${date}`);
    } else {
      logger.info(`[iThink] No remittance summary for ${date}`);
    }

    if (detailRes.status === 'success' && detailRes.data?.length) {
      for (const item of detailRes.data) {
        await IthinkRemittanceDetail.upsert({
          remittance_date: date,
          awb: item.airway_bill_no,
          order_no: item.order_no || undefined,
          price: item.price ? parseFloat(item.price) : undefined,
          delivered_date: safeDate(item.delivered_date),
        });
      }
      logger.info(`[iThink] ${detailRes.data.length} remittance line items saved for ${date}`);
    }
  } catch (err) {
    logger.error(`[iThink] Remittance sync error for ${date}: ${(err as Error).message}`);
    throw err;
  }
}

// ── Orchestrator: called by cron ──────────────────────────────────────────

export async function syncIthinkShipments(): Promise<void> {
  try {
    await syncShipmentStatus();
    await ConnectorHealth.update(
      { last_sync_at: new Date(), status: 'green', error_message: undefined },
      { where: { connector_name: 'ithink' } },
    );
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'ithink' } },
    );
    logger.error(`[iThink] Sync error: ${(err as Error).message}`);
  }
}

export async function syncDailyRemittance(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await syncRemittance(today);
}
