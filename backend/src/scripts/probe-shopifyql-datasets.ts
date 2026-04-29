/* eslint-disable no-console */
/** Probe `sessions` dataset for cart-add column (Sessions confirmed working). */
import 'dotenv/config';
import { graphqlRequest } from '@modules/shopify/shopify.connector';

const SEL = `
  query Run($q: String!) {
    shopifyqlQuery(query: $q) {
      parseErrors
      tableData { columns { name dataType } rows }
    }
  }
`;

async function tryQ(q: string): Promise<void> {
  try {
    type Resp = { shopifyqlQuery: { parseErrors: string[]; tableData: { columns: Array<{name:string;dataType:string}>; rows: unknown } | null } };
    const data = await graphqlRequest<Resp>(SEL, { q });
    const r = data.shopifyqlQuery;
    if (r.parseErrors?.length) {
      console.log(`  [FAIL] ${q.slice(0, 75).padEnd(75)} → ${r.parseErrors[0].slice(0, 90)}`);
    } else {
      const rows = (r.tableData?.rows ?? []) as unknown[];
      const cols = r.tableData?.columns?.map((c) => c.name).join(',') ?? '';
      console.log(`  [OK]   ${q.slice(0, 75).padEnd(75)} cols=[${cols}] rows=${rows.length}`);
      if (rows.length > 0) console.log(`         sample: ${JSON.stringify(rows[0])}`);
    }
  } catch (e) {
    console.log(`  [THROW] ${q.slice(0, 75).padEnd(75)} → ${(e as Error).message.slice(0, 90)}`);
  }
}

async function main() {
  console.log('--- cart columns on `sessions` dataset ---');
  for (const col of [
    'cart_additions',
    'add_to_carts',
    'add_to_cart',
    'added_to_cart',
    'add_to_cart_quantity',
    'add_to_cart_count',
    'cart_completed_sessions',
    'sessions_with_cart_items',
    'reached_checkout',
    'reached_checkout_sessions',
    'cart_count',
    'sessions_added_to_cart',
    'completed_checkouts',
    'product_added_to_cart_count',
  ]) {
    await tryQ(`FROM sessions SHOW ${col} SINCE -2d UNTIL today GROUP BY day`);
  }

  console.log('\n--- sessions multiple-column query (force schema disclosure) ---');
  // Try a SHOW with several columns; the parse error should tell us the first invalid one,
  // but the OK ones may pass.
  await tryQ('FROM sessions SHOW sessions, conversion_rate SINCE -2d UNTIL today GROUP BY day');

  console.log('\n--- other plausibly-existing datasets for cart events ---');
  for (const ds of [
    'storefront',
    'storefront_metrics',
    'analytics',
    'shop',
    'orders',  // sometimes has add_to_cart aggregate
    'fulfilled_sales',
    'gross_sales',
  ]) {
    await tryQ(`FROM ${ds} SHOW count SINCE -2d UNTIL today GROUP BY day`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
