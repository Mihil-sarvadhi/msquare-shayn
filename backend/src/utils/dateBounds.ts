/**
 * Project-wide date-range parsing for Shopify-financial endpoints.
 *
 * - All bounds are interpreted in IST (the shop's timezone). Without this,
 *   midnight UTC truncates 5h30m of orders from the start of each day for an
 *   Indian shop.
 * - `from` is start-of-day (00:00:00.000 IST); `to` is end-of-day
 *   (23:59:59.999 IST), so single-day queries (`from === to`) include every
 *   order placed that day.
 * - All Shopify-derived financial reports — sales breakdown, KPIs, revenue
 *   breakdown, refunds summary, dashboard revenue, analytics — MUST use this
 *   so their date semantics agree with Shopify Analytics' IST bucketing.
 *
 * Apr 1 IST start = 2026-04-01T00:00:00+05:30 = Mar 31 18:30 UTC
 * Apr 1 IST end   = 2026-04-01T23:59:59.999+05:30 = Apr 1 18:29:59.999 UTC
 */
export function parseFromYMD(s: string): Date {
  return new Date(`${s}T00:00:00.000+05:30`);
}

export function parseToYMD(s: string): Date {
  return new Date(`${s}T23:59:59.999+05:30`);
}

/**
 * SQL fragment to cast a TIMESTAMPTZ to a calendar DATE in IST. Use this in
 * `date_trunc` / `::date` expressions whenever you bucket by day so that an
 * order placed at 00:58 IST on April 1 (= Mar 31 19:28 UTC) is bucketed as
 * April 1, matching Shopify's reports.
 *
 * Example: `(o.created_at AT TIME ZONE 'Asia/Kolkata')::date`
 */
export const IST_DATE_CAST = "AT TIME ZONE 'Asia/Kolkata'";
