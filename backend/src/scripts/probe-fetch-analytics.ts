/* eslint-disable no-console */
/** Smoke-test for fetchAnalyticsDaily against live Shopify. Throwaway. */
import 'dotenv/config';
import { fetchAnalyticsDaily } from '@modules/shopify/shopify.connector';

async function main() {
  const since = new Date(Date.now() - 7 * 86400000);
  const until = new Date();
  const rows = await fetchAnalyticsDaily(since, until);
  console.log(`rows: ${rows.length}`);
  console.table(rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
