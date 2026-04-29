/**
 * Diagnostic probe — shows exactly how `returnsDaily` is broken down for a
 * given window so we can pin-point why our Returns total doesn't match
 * Shopify Analytics.
 *
 * Usage: npx tsx src/scripts/probe-returns-split.ts 2026-01-28 2026-04-28
 */
import { sequelize } from '@db/sequelize';
import { QueryTypes } from 'sequelize';
import { SOURCE } from '@constant';
import { logger } from '@logger/logger';
import { parseFromYMD, parseToYMD } from '@utils/dateBounds';

async function main(): Promise<void> {
  const fromArg = process.argv[2];
  const toArg = process.argv[3];
  if (!fromArg || !toArg) {
    logger.error('Usage: probe-returns-split.ts <from-YYYY-MM-DD> <to-YYYY-MM-DD>');
    process.exit(1);
  }
  const from = parseFromYMD(fromArg);
  const to = parseToYMD(toArg);
  await sequelize.authenticate();

  // 1. Status distribution in orders_returns for the window
  const statusRows = await sequelize.query<{ status: string; n: string; total_value: string }>(
    `SELECT status, COUNT(*)::text AS n, SUM(total_value)::text AS total_value
       FROM orders_returns
      WHERE source = :source
        AND return_created_at BETWEEN :from AND :to
      GROUP BY status
      ORDER BY status`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  logger.info(`\n[1] orders_returns by status (raw total_value, tax-incl):`);
  statusRows.forEach((r) => {
    logger.info(`    ${r.status.padEnd(15)}  count=${r.n.padStart(4)}  total=₹${r.total_value}`);
  });

  // 2. Store-wide effective tax_factor (derived from PAID orders in window)
  //    — used as fallback for orders with total_tax = 0 (typical for voided
  //    COD orders where no tax was actually collected).
  const factorRow = await sequelize.query<{ store_factor: string; voids_zero_tax: string; voids_zero_tax_subtotal: string }>(
    `SELECT
       CASE WHEN SUM(CASE WHEN COALESCE(total_tax, 0) > 0
                         THEN COALESCE(subtotal, 0) ELSE 0 END) > 0
            THEN SUM(CASE WHEN COALESCE(total_tax, 0) > 0
                          THEN COALESCE(subtotal, 0) - COALESCE(total_tax, 0)
                          ELSE 0 END)
                 / SUM(CASE WHEN COALESCE(total_tax, 0) > 0
                            THEN COALESCE(subtotal, 0) ELSE 0 END)
            ELSE 1.0 END AS store_factor,
       SUM(CASE WHEN cancelled_at BETWEEN :from AND :to
                  AND COALESCE(financial_status,'') = 'VOIDED'
                  AND COALESCE(total_tax, 0) = 0
                THEN 1 ELSE 0 END)::text AS voids_zero_tax,
       SUM(CASE WHEN cancelled_at BETWEEN :from AND :to
                  AND COALESCE(financial_status,'') = 'VOIDED'
                  AND COALESCE(total_tax, 0) = 0
                THEN COALESCE(subtotal, 0) ELSE 0 END)::text AS voids_zero_tax_subtotal
       FROM shopify_orders
      WHERE created_at BETWEEN :from AND :to
        AND COALESCE(test, FALSE) = FALSE`,
    { type: QueryTypes.SELECT, replacements: { from, to } },
  );
  const storeFactor = parseFloat(factorRow[0]?.store_factor ?? '1');
  const voidsZeroTax = parseInt(factorRow[0]?.voids_zero_tax ?? '0', 10);
  const voidsZeroTaxSubtotal = parseFloat(factorRow[0]?.voids_zero_tax_subtotal ?? '0');
  logger.info(`\n[2a] Store-wide effective tax_factor (from PAID orders): ${storeFactor.toFixed(6)}  (= 1/${(1 / storeFactor).toFixed(4)})`);
  logger.info(`     Voided orders in window with total_tax=0: count=${voidsZeroTax}  subtotal_total=₹${voidsZeroTaxSubtotal.toFixed(2)}`);
  logger.info(`     Over-count from these (under old factor=1.0): ₹${(voidsZeroTaxSubtotal * (1 - storeFactor)).toFixed(2)}`);

  // 2b. Split of "Returns" total by event category — OLD vs NEW (with store_factor fallback).
  const split = await sequelize.query<{
    return_events_old: string;
    return_events_new: string;
    refund_events_old: string;
    refund_events_new: string;
    void_events_old: string;
    void_events_new: string;
  }>(
    `WITH store_factor AS (
       SELECT CASE WHEN SUM(CASE WHEN COALESCE(total_tax, 0) > 0
                                 THEN COALESCE(subtotal, 0) ELSE 0 END) > 0
                   THEN SUM(CASE WHEN COALESCE(total_tax, 0) > 0
                                 THEN COALESCE(subtotal, 0) - COALESCE(total_tax, 0)
                                 ELSE 0 END)
                        / SUM(CASE WHEN COALESCE(total_tax, 0) > 0
                                   THEN COALESCE(subtotal, 0) ELSE 0 END)
                   ELSE 1.0 END AS factor
         FROM shopify_orders
        WHERE created_at BETWEEN :from AND :to
          AND COALESCE(test, FALSE) = FALSE
     ),
     return_orders AS (
       SELECT DISTINCT order_id FROM orders_returns
        WHERE source = :source
          AND return_created_at BETWEEN :from AND :to
          AND status NOT IN ('DECLINED','CANCELED')
     ),
     refund_orders AS (
       SELECT DISTINCT order_id FROM orders_refunds
        WHERE source = :source
          AND refunded_at BETWEEN :from AND :to
          AND order_id NOT IN (SELECT order_id FROM return_orders)
     ),
     return_events AS (
       SELECT
         SUM(COALESCE(r.total_value, 0)
             * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                    THEN (o.subtotal - o.total_tax) / o.subtotal
                    ELSE 1.0 END) AS amount_old,
         SUM(COALESCE(r.total_value, 0)
             * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                    THEN (o.subtotal - o.total_tax) / o.subtotal
                    ELSE (SELECT factor FROM store_factor) END) AS amount_new
         FROM orders_returns r
         JOIN shopify_orders o ON o.order_id = r.order_id
        WHERE r.source = :source
          AND r.return_created_at BETWEEN :from AND :to
          AND r.status NOT IN ('DECLINED','CANCELED')
          AND COALESCE(o.test, FALSE) = FALSE
     ),
     refund_events AS (
       SELECT
         SUM(COALESCE(li.li_subtotal, 0)
             * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                    THEN (o.subtotal - o.total_tax) / o.subtotal
                    ELSE 1.0 END) AS amount_old,
         SUM(COALESCE(li.li_subtotal, 0)
             * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                    THEN (o.subtotal - o.total_tax) / o.subtotal
                    ELSE (SELECT factor FROM store_factor) END) AS amount_new
         FROM orders_refunds r
         JOIN shopify_orders o ON o.order_id = r.order_id
         CROSS JOIN LATERAL (
           SELECT COALESCE(SUM((rli->>'amount')::numeric), 0) AS li_subtotal
             FROM jsonb_array_elements(COALESCE(r.refund_line_items, '[]'::jsonb)) AS rli
         ) li
        WHERE r.source = :source
          AND r.refunded_at BETWEEN :from AND :to
          AND COALESCE(o.test, FALSE) = FALSE
          AND r.order_id NOT IN (SELECT order_id FROM return_orders)
     ),
     void_events AS (
       SELECT
         SUM(COALESCE(subtotal, 0)
             * CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                    THEN (subtotal - total_tax) / subtotal
                    ELSE 1.0 END) AS amount_old,
         SUM(COALESCE(subtotal, 0)
             * CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                    THEN (subtotal - total_tax) / subtotal
                    ELSE (SELECT factor FROM store_factor) END) AS amount_new
         FROM shopify_orders
        WHERE cancelled_at BETWEEN :from AND :to
          AND COALESCE(test, FALSE) = FALSE
          AND COALESCE(financial_status, '') = 'VOIDED'
          AND order_id NOT IN (SELECT order_id FROM return_orders)
          AND order_id NOT IN (SELECT order_id FROM refund_orders)
     )
     SELECT
       COALESCE((SELECT amount_old FROM return_events), 0)::text  AS return_events_old,
       COALESCE((SELECT amount_new FROM return_events), 0)::text  AS return_events_new,
       COALESCE((SELECT amount_old FROM refund_events), 0)::text  AS refund_events_old,
       COALESCE((SELECT amount_new FROM refund_events), 0)::text  AS refund_events_new,
       COALESCE((SELECT amount_old FROM void_events), 0)::text    AS void_events_old,
       COALESCE((SELECT amount_new FROM void_events), 0)::text    AS void_events_new`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  const s = split[0];
  if (s) {
    const reO = parseFloat(s.return_events_old);
    const reN = parseFloat(s.return_events_new);
    const rfO = parseFloat(s.refund_events_old);
    const rfN = parseFloat(s.refund_events_new);
    const vdO = parseFloat(s.void_events_old);
    const vdN = parseFloat(s.void_events_new);
    logger.info(`\n[2b] Returns total split (tax-EXCL): OLD vs NEW (with store_factor fallback)`);
    logger.info(`     Stream            OLD              NEW              Diff`);
    logger.info(`     return_events  ₹${reO.toFixed(2).padStart(12)}  ₹${reN.toFixed(2).padStart(12)}  ₹${(reO - reN).toFixed(2).padStart(10)}`);
    logger.info(`     refund_events  ₹${rfO.toFixed(2).padStart(12)}  ₹${rfN.toFixed(2).padStart(12)}  ₹${(rfO - rfN).toFixed(2).padStart(10)}`);
    logger.info(`     void_events    ₹${vdO.toFixed(2).padStart(12)}  ₹${vdN.toFixed(2).padStart(12)}  ₹${(vdO - vdN).toFixed(2).padStart(10)}  ← key fix`);
    logger.info(`     ────────────`);
    logger.info(`     TOTAL          ₹${(reO + rfO + vdO).toFixed(2).padStart(12)}  ₹${(reN + rfN + vdN).toFixed(2).padStart(12)}  ₹${(reO + rfO + vdO - reN - rfN - vdN).toFixed(2).padStart(10)}`);
  }

  // 3. List refunds-without-returns in window (the candidates for "incorrectly counted")
  const refundsNoReturn = await sequelize.query<{
    order_id: string;
    refunded_at: string;
    refund_amount: string;
    excl_amount: string;
  }>(
    `SELECT r.order_id,
            r.refunded_at::text AS refunded_at,
            r.refund_amount::text AS refund_amount,
            (r.refund_amount * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                                   THEN (o.subtotal - o.total_tax) / o.subtotal
                                   ELSE 1.0 END)::text AS excl_amount
       FROM orders_refunds r
       JOIN shopify_orders o ON o.order_id = r.order_id
      WHERE r.source = :source
        AND r.refunded_at BETWEEN :from AND :to
        AND COALESCE(o.test, FALSE) = FALSE
        AND r.order_id NOT IN (
          SELECT DISTINCT order_id FROM orders_returns
           WHERE source = :source
             AND return_created_at BETWEEN :from AND :to
             AND status NOT IN ('DECLINED','CANCELED')
        )
      ORDER BY r.refunded_at`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  logger.info(`\n[3] Refund-without-return rows in window (count=${refundsNoReturn.length}):`);
  refundsNoReturn.forEach((r) => {
    logger.info(
      `    ${r.refunded_at.slice(0, 10)}  order=${r.order_id.padEnd(45)}  refund=₹${r.refund_amount}  excl=₹${parseFloat(r.excl_amount).toFixed(2)}`,
    );
  });

  // 4. Returns by status with both tax-incl and tax-excl values
  const exclByStatus = await sequelize.query<{
    status: string;
    n: string;
    total_value: string;
    excl_value: string;
  }>(
    `SELECT r.status,
            COUNT(*)::text AS n,
            SUM(r.total_value)::text AS total_value,
            SUM(r.total_value * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                                    THEN (o.subtotal - o.total_tax) / o.subtotal
                                    ELSE 1.0 END)::text AS excl_value
       FROM orders_returns r
       JOIN shopify_orders o ON o.order_id = r.order_id
      WHERE r.source = :source
        AND r.return_created_at BETWEEN :from AND :to
        AND COALESCE(o.test, FALSE) = FALSE
      GROUP BY r.status
      ORDER BY r.status`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  logger.info(`\n[4] orders_returns by status (tax-incl & tax-excl):`);
  exclByStatus.forEach((r) => {
    logger.info(
      `    ${r.status.padEnd(15)}  count=${r.n.padStart(4)}  incl=₹${r.total_value}  excl=₹${parseFloat(r.excl_value).toFixed(2)}`,
    );
  });

  // 5. PER-RECORD DUMP — list every return / refund / void event in window
  //    with both OLD (factor=1.0 fallback) and NEW (store_factor fallback)
  //    so we can spot the exact record(s) causing any residual gap.
  const detail = await sequelize.query<{
    kind: string;
    event_date: string;
    order_id: string;
    status: string | null;
    raw_value: string;
    subtotal: string;
    total_tax: string;
    factor_old: string;
    factor_new: string;
    excl_old: string;
    excl_new: string;
  }>(
    `WITH store_factor AS (
       SELECT CASE WHEN SUM(CASE WHEN COALESCE(total_tax, 0) > 0
                                 THEN COALESCE(subtotal, 0) ELSE 0 END) > 0
                   THEN SUM(CASE WHEN COALESCE(total_tax, 0) > 0
                                 THEN COALESCE(subtotal, 0) - COALESCE(total_tax, 0)
                                 ELSE 0 END)
                        / SUM(CASE WHEN COALESCE(total_tax, 0) > 0
                                   THEN COALESCE(subtotal, 0) ELSE 0 END)
                   ELSE 1.0 END AS factor
         FROM shopify_orders
        WHERE created_at BETWEEN :from AND :to
          AND COALESCE(test, FALSE) = FALSE
     ),
     return_orders AS (
       SELECT DISTINCT order_id FROM orders_returns
        WHERE source = :source
          AND return_created_at BETWEEN :from AND :to
          AND status NOT IN ('DECLINED','CANCELED')
     ),
     refund_orders AS (
       SELECT DISTINCT order_id FROM orders_refunds
        WHERE source = :source
          AND refunded_at BETWEEN :from AND :to
          AND order_id NOT IN (SELECT order_id FROM return_orders)
     )
     SELECT 'RETURN' AS kind,
            r.return_created_at::text AS event_date,
            r.order_id, r.status,
            r.total_value::text AS raw_value,
            o.subtotal::text, COALESCE(o.total_tax, 0)::text AS total_tax,
            (CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                  THEN (o.subtotal - o.total_tax) / o.subtotal
                  ELSE 1.0 END)::text AS factor_old,
            (CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                  THEN (o.subtotal - o.total_tax) / o.subtotal
                  ELSE (SELECT factor FROM store_factor) END)::text AS factor_new,
            (r.total_value * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                                  THEN (o.subtotal - o.total_tax) / o.subtotal
                                  ELSE 1.0 END)::text AS excl_old,
            (r.total_value * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                                  THEN (o.subtotal - o.total_tax) / o.subtotal
                                  ELSE (SELECT factor FROM store_factor) END)::text AS excl_new
       FROM orders_returns r
       JOIN shopify_orders o ON o.order_id = r.order_id
      WHERE r.source = :source
        AND r.return_created_at BETWEEN :from AND :to
        AND r.status NOT IN ('DECLINED','CANCELED')
        AND COALESCE(o.test, FALSE) = FALSE
     UNION ALL
     SELECT 'REFUND' AS kind,
            r.refunded_at::text AS event_date,
            r.order_id, NULL AS status,
            li.li_subtotal::text AS raw_value,
            o.subtotal::text, COALESCE(o.total_tax, 0)::text AS total_tax,
            (CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                  THEN (o.subtotal - o.total_tax) / o.subtotal
                  ELSE 1.0 END)::text AS factor_old,
            (CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                  THEN (o.subtotal - o.total_tax) / o.subtotal
                  ELSE (SELECT factor FROM store_factor) END)::text AS factor_new,
            (li.li_subtotal * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                                   THEN (o.subtotal - o.total_tax) / o.subtotal
                                   ELSE 1.0 END)::text AS excl_old,
            (li.li_subtotal * CASE WHEN COALESCE(o.subtotal, 0) > 0 AND COALESCE(o.total_tax, 0) > 0
                                   THEN (o.subtotal - o.total_tax) / o.subtotal
                                   ELSE (SELECT factor FROM store_factor) END)::text AS excl_new
       FROM orders_refunds r
       JOIN shopify_orders o ON o.order_id = r.order_id
       CROSS JOIN LATERAL (
         SELECT COALESCE(SUM((rli->>'amount')::numeric), 0) AS li_subtotal
           FROM jsonb_array_elements(COALESCE(r.refund_line_items, '[]'::jsonb)) AS rli
       ) li
      WHERE r.source = :source
        AND r.refunded_at BETWEEN :from AND :to
        AND COALESCE(o.test, FALSE) = FALSE
        AND r.order_id NOT IN (SELECT order_id FROM return_orders)
     UNION ALL
     SELECT 'VOID' AS kind,
            cancelled_at::text AS event_date,
            order_id, financial_status AS status,
            subtotal::text AS raw_value,
            subtotal::text, COALESCE(total_tax, 0)::text AS total_tax,
            (CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                  THEN (subtotal - total_tax) / subtotal
                  ELSE 1.0 END)::text AS factor_old,
            (CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                  THEN (subtotal - total_tax) / subtotal
                  ELSE (SELECT factor FROM store_factor) END)::text AS factor_new,
            (subtotal * CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                             THEN (subtotal - total_tax) / subtotal
                             ELSE 1.0 END)::text AS excl_old,
            (subtotal * CASE WHEN COALESCE(subtotal, 0) > 0 AND COALESCE(total_tax, 0) > 0
                             THEN (subtotal - total_tax) / subtotal
                             ELSE (SELECT factor FROM store_factor) END)::text AS excl_new
       FROM shopify_orders
      WHERE cancelled_at BETWEEN :from AND :to
        AND COALESCE(test, FALSE) = FALSE
        AND COALESCE(financial_status, '') = 'VOIDED'
        AND order_id NOT IN (SELECT order_id FROM return_orders)
        AND order_id NOT IN (SELECT order_id FROM refund_orders)
     ORDER BY event_date, kind, order_id`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  logger.info(
    `\n[5] PER-RECORD dump (kind | event_date | order | status | raw → excl_old | excl_new | diff)`,
  );
  let totalOld = 0;
  let totalNew = 0;
  detail.forEach((r) => {
    const eo = parseFloat(r.excl_old);
    const en = parseFloat(r.excl_new);
    totalOld += eo;
    totalNew += en;
    const orderShort = r.order_id.replace('gid://shopify/Order/', '');
    logger.info(
      `    ${r.kind.padEnd(7)} ${r.event_date.slice(0, 10)}  ord=${orderShort.padEnd(15)}  ${(r.status ?? '-').padEnd(8)}  raw=₹${parseFloat(r.raw_value).toFixed(2).padStart(10)}  → old=₹${eo.toFixed(2).padStart(10)}  new=₹${en.toFixed(2).padStart(10)}  Δ=₹${(eo - en).toFixed(2).padStart(8)}`,
    );
  });
  logger.info(`    ────────────────────────────────────────────────`);
  logger.info(`    TOTAL                                                                                  old=₹${totalOld.toFixed(2).padStart(10)}  new=₹${totalNew.toFixed(2).padStart(10)}  Δ=₹${(totalOld - totalNew).toFixed(2).padStart(8)}`);

  await sequelize.close();
}

main().catch((err) => {
  logger.error(`probe-returns-split FAILED: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
