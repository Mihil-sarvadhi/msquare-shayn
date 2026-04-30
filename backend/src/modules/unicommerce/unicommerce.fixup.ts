import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { aggregateChannelDaily } from './unicommerce.sync';
import { logger } from '@logger/logger';

/**
 * One-time backfill of structured columns from raw_response.
 *
 * The first backfill stored the full saleOrderDTO in raw_response but
 * extracted the wrong field paths into the structured columns (Uniware
 * doesn't have order-level totalPrice / orderPrice; addresses live in
 * an array, not shippingAddress). This script re-extracts every column
 * directly from raw_response so we don't have to re-hit the API.
 *
 * Idempotent — safe to run multiple times.
 */

async function fixOrders(): Promise<number> {
  const result = await sequelize.query<{ count: string }>(
    `WITH item_totals AS (
       SELECT
         o.order_code,
         SUM(COALESCE((it->>'totalPrice')::numeric, 0))             AS total_price,
         SUM(COALESCE((it->>'shippingCharges')::numeric, 0))        AS shipping_charges,
         SUM(COALESCE((it->>'discount')::numeric, 0))               AS item_discount,
         SUM(COALESCE((it->>'cashOnDeliveryCharges')::numeric, 0))  AS cod_charges,
         SUM(COALESCE((it->>'prepaidAmount')::numeric, 0))          AS prepaid_amount
       FROM unicommerce_orders o
       CROSS JOIN LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(o.raw_response->'saleOrderItems') = 'array'
              THEN o.raw_response->'saleOrderItems'
              ELSE '[]'::jsonb END
       ) AS it
       WHERE o.raw_response IS NOT NULL
       GROUP BY o.order_code
     ),
     primary_address AS (
       SELECT
         o.order_code,
         COALESCE(
           (SELECT a FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(o.raw_response->'addresses') = 'array'
                   THEN o.raw_response->'addresses'
                   ELSE '[]'::jsonb END
            ) AS a
            WHERE a->>'type' ILIKE '%shipping%' LIMIT 1),
           (SELECT a FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(o.raw_response->'addresses') = 'array'
                   THEN o.raw_response->'addresses'
                   ELSE '[]'::jsonb END
            ) AS a LIMIT 1),
           o.raw_response->'shippingAddress',
           o.raw_response->'billingAddress'
         ) AS addr
       FROM unicommerce_orders o
       WHERE o.raw_response IS NOT NULL
     )
     UPDATE unicommerce_orders o SET
       total_price       = COALESCE((o.raw_response->>'totalPrice')::numeric,         it.total_price,       0),
       shipping_charges  = COALESCE((o.raw_response->>'totalShippingCharges')::numeric, it.shipping_charges, 0),
       discount          = COALESCE((o.raw_response->>'totalDiscount')::numeric,      it.item_discount,     0),
       cod_charges       = COALESCE((o.raw_response->>'totalCashOnDeliveryCharges')::numeric, it.cod_charges, 0),
       prepaid_amount    = COALESCE((o.raw_response->>'totalPrepaidAmount')::numeric, it.prepaid_amount,    0),
       customer_name     = COALESCE(pa.addr->>'name', o.raw_response->>'customerCode'),
       customer_email    = COALESCE(NULLIF(o.raw_response->>'notificationEmail', ''), NULLIF(pa.addr->>'email', '')),
       customer_mobile   = COALESCE(NULLIF(o.raw_response->>'notificationMobile', ''), NULLIF(pa.addr->>'phone', '')),
       city              = NULLIF(pa.addr->>'city', ''),
       state             = COALESCE(NULLIF(pa.addr->>'stateName', ''), NULLIF(pa.addr->>'state', '')),
       pincode           = NULLIF(pa.addr->>'pincode', ''),
       address_line_1    = NULLIF(pa.addr->>'addressLine1', ''),
       address_line_2    = NULLIF(pa.addr->>'addressLine2', ''),
       landmark          = NULLIF(pa.addr->>'landmark', ''),
       country           = NULLIF(pa.addr->>'country', ''),
       billing_address   = o.raw_response->'billingAddress',
       payment_details   = CASE
                              WHEN o.raw_response->'paymentDetail' IS NOT NULL
                                   AND o.raw_response->'paymentDetail' != 'null'::jsonb
                                THEN jsonb_build_object('detail', o.raw_response->'paymentDetail')
                              ELSE NULL
                            END,
       synced_at         = NOW()
     FROM item_totals it, primary_address pa
     WHERE o.order_code = it.order_code
       AND o.order_code = pa.order_code
       AND o.raw_response IS NOT NULL
     RETURNING 1`,
    { type: QueryTypes.SELECT },
  );
  return result.length;
}

async function fixupChannelDailyRange(): Promise<{ since: string; until: string }> {
  const rows = await sequelize.query<{ since: string; until: string }>(
    `SELECT
        to_char(MIN(order_date)::date, 'YYYY-MM-DD') AS since,
        to_char(MAX(order_date)::date, 'YYYY-MM-DD') AS until
     FROM unicommerce_orders
     WHERE order_date IS NOT NULL`,
    { type: QueryTypes.SELECT },
  );
  return rows[0] ?? { since: '2023-01-01', until: new Date().toISOString().slice(0, 10) };
}

export async function unicommerceFixup(): Promise<void> {
  logger.info('[Unicommerce Fixup] Re-extracting structured columns from raw_response...');
  const updated = await fixOrders();
  logger.info(`[Unicommerce Fixup] Updated ${updated} order rows`);

  logger.info('[Unicommerce Fixup] Recomputing unicommerce_channel_daily...');
  await sequelize.query('TRUNCATE unicommerce_channel_daily', { type: QueryTypes.RAW });
  const { since, until } = await fixupChannelDailyRange();
  logger.info(`[Unicommerce Fixup] Aggregating channel daily ${since} → ${until}`);
  await aggregateChannelDaily(since, until);

  logger.info('[Unicommerce Fixup] Done.');
}

if (require.main === module) {
  unicommerceFixup()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`[Unicommerce Fixup] Fatal: ${(err as Error).message}`);
      process.exit(1);
    });
}
