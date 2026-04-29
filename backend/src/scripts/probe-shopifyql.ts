/* eslint-disable no-console */
/**
 * Smoke-test for Shopify's GraphQL `shopifyqlQuery`.
 *
 * Run: `npx tsx src/scripts/probe-shopifyql.ts`
 *
 * Locks the response shape and the working ShopifyQL forms for sessions
 * and added-to-cart against our store's API version.
 */
import 'dotenv/config';
import { graphqlRequest } from '@modules/shopify/shopify.connector';

async function introspect(typeName: string): Promise<void> {
  const QUERY = `
    query Introspect($t: String!) {
      __type(name: $t) {
        name kind
        fields {
          name
          type { kind name ofType { kind name ofType { kind name } } }
        }
      }
    }
  `;
  type F = { name: string; type: { kind: string; name: string | null; ofType: { kind: string; name: string | null; ofType: { kind: string; name: string | null } | null } | null } };
  type Resp = { __type: { name: string; kind: string; fields: F[] | null } | null };
  const data = await graphqlRequest<Resp>(QUERY, { t: typeName });
  console.log(`\n— introspect ${typeName} —`);
  if (!data.__type) { console.log('  (not found)'); return; }
  console.log(`  kind: ${data.__type.kind}`);
  for (const f of data.__type.fields ?? []) {
    const inner = f.type.ofType?.ofType?.name ?? f.type.ofType?.name ?? f.type.name ?? '?';
    const wrap = f.type.kind === 'LIST' || f.type.ofType?.kind === 'LIST' ? '[]' : '';
    console.log(`  - ${f.name}: ${inner}${wrap}`);
  }
}

async function runQuery(label: string, q: string): Promise<void> {
  console.log(`\n— ${label} —`);
  console.log(`query: ${q}`);
  const SEL = `
    query Run($q: String!) {
      shopifyqlQuery(query: $q) {
        parseErrors
        tableData {
          columns { name displayName dataType }
          rows
        }
      }
    }
  `;
  try {
    type Resp = {
      shopifyqlQuery: {
        parseErrors: string[];
        tableData: {
          columns: Array<{ name: string; displayName: string; dataType: string }>;
          rows: unknown;
        } | null;
      };
    };
    const data = await graphqlRequest<Resp>(SEL, { q });
    const r = data.shopifyqlQuery;
    if (r.parseErrors?.length) console.log(`parseErrors: ${JSON.stringify(r.parseErrors)}`);
    if (r.tableData) {
      console.log(`columns: ${JSON.stringify(r.tableData.columns)}`);
      const rows = r.tableData.rows as unknown[][];
      console.log(`row count: ${Array.isArray(rows) ? rows.length : 'not-array'}`);
      console.log(`first 3 rows: ${JSON.stringify(Array.isArray(rows) ? rows.slice(0, 3) : rows)}`);
    } else {
      console.log('tableData: null');
    }
  } catch (e) {
    console.log(`THROWN: ${(e as Error).message.slice(0, 500)}`);
  }
}

async function main() {
  await introspect('ShopifyqlTableData');
  await introspect('ShopifyqlColumn');
  await introspect('ShopifyqlTableColumn');

  await runQuery('sales sanity',
    'FROM sales SHOW total_sales SINCE -7d UNTIL today GROUP BY day');
  await runQuery('sessions A',
    'FROM online_store_session_metrics SHOW total_sessions SINCE -7d UNTIL today GROUP BY day');
  await runQuery('sessions B',
    'FROM online_store_visitor_metrics SHOW total_sessions SINCE -7d UNTIL today GROUP BY day');
  await runQuery('atc A',
    'FROM products SHOW added_to_cart_quantity SINCE -7d UNTIL today GROUP BY day');
  await runQuery('atc B',
    'FROM online_store_session_metrics SHOW cart_completed_sessions SINCE -7d UNTIL today GROUP BY day');
}

main().catch((e) => { console.error(e); process.exit(1); });
