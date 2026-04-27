/**
 * For each window order, fetch its refunds AND returns directly from Shopify
 * and compare with what we have synced. Surfaces any sync gaps.
 *
 * Usage: npx tsx src/scripts/probe-window-refunds-returns.ts
 */
import { graphqlRequest } from '@modules/shopify/shopify.connector';
import { logger } from '@logger/logger';
import { sequelize } from '@db/sequelize';
import { QueryTypes } from 'sequelize';

const QUERY = `
  query Window($queryStr: String!, $cursor: String) {
    orders(first: 25, after: $cursor, query: $queryStr) {
      edges {
        cursor
        node {
          id
          name
          displayFinancialStatus
          totalPriceSet { shopMoney { amount } }
          totalRefundedSet { shopMoney { amount } }
          refunds {
            id createdAt
            totalRefundedSet { shopMoney { amount } }
          }
          returns(first: 5) {
            edges { node { id status totalQuantity } }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface OrderProbe {
  id: string;
  name: string;
  displayFinancialStatus: string;
  totalPriceSet: { shopMoney: { amount: string } };
  totalRefundedSet: { shopMoney: { amount: string } };
  refunds: { id: string; createdAt: string; totalRefundedSet: { shopMoney: { amount: string } } }[];
  returns: { edges: { node: { id: string; status: string; totalQuantity: number } }[] };
}

const n = (s: string | undefined): number => (s ? parseFloat(s) : 0);

async function main(): Promise<void> {
  await sequelize.authenticate();

  // Fetch all window orders from Shopify
  const queryStr = `created_at:>=2026-04-01 created_at:<=2026-04-25`;
  const all: OrderProbe[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    orders: { edges: { node: OrderProbe }[]; pageInfo: { hasNextPage: boolean; endCursor: string } };
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(QUERY, { queryStr, cursor });
    all.push(...data.orders.edges.map((e: { node: OrderProbe }) => e.node));
    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 200));
  }
  logger.info(`[Probe] Got ${all.length} orders from Shopify`);

  // What we have in DB
  const dbRefunds = await sequelize.query<{ order_id: string; refund_amount: string }>(
    `SELECT order_id, SUM(refund_amount)::text AS refund_amount
       FROM orders_refunds WHERE source='shopify'
       GROUP BY order_id`,
    { type: QueryTypes.SELECT },
  );
  const dbRefundMap = new Map(dbRefunds.map((r) => [r.order_id, parseFloat(r.refund_amount)]));

  const dbReturns = await sequelize.query<{ order_id: string; total: string; n: string }>(
    `SELECT order_id, SUM(total_value)::text AS total, COUNT(*)::text AS n
       FROM orders_returns WHERE source='shopify' AND status NOT IN ('DECLINED','CANCELED')
       GROUP BY order_id`,
    { type: QueryTypes.SELECT },
  );
  const dbReturnMap = new Map(
    dbReturns.map((r) => [r.order_id, { total: parseFloat(r.total), n: parseInt(r.n, 10) }]),
  );

  // Compare
  let totalShopifyRefunded = 0;
  let totalDbRefunded = 0;
  let shopifyRefundsCount = 0;
  let dbRefundsCount = 0;
  let totalShopifyReturnsCount = 0;
  let totalDbReturnsCount = 0;
  const missingRefunds: string[] = [];
  const missingReturns: string[] = [];

  for (const o of all) {
    const shopifyRefunded = n(o.totalRefundedSet?.shopMoney?.amount);
    const dbRefunded = dbRefundMap.get(o.id) ?? 0;
    totalShopifyRefunded += shopifyRefunded;
    totalDbRefunded += dbRefunded;
    shopifyRefundsCount += o.refunds.length;
    if (dbRefundMap.has(o.id)) dbRefundsCount++;
    if (Math.abs(shopifyRefunded - dbRefunded) > 0.01) {
      missingRefunds.push(`${o.name}: shopify=${shopifyRefunded}, db=${dbRefunded}`);
    }

    const shopifyReturnsCount = o.returns.edges.length;
    const dbReturnsInfo = dbReturnMap.get(o.id);
    totalShopifyReturnsCount += shopifyReturnsCount;
    totalDbReturnsCount += dbReturnsInfo?.n ?? 0;
    if (shopifyReturnsCount > 0 && !dbReturnsInfo) {
      missingReturns.push(`${o.name}: shopify_returns=${shopifyReturnsCount}, db_returns=0`);
    } else if (shopifyReturnsCount !== (dbReturnsInfo?.n ?? 0)) {
      missingReturns.push(
        `${o.name}: shopify_returns=${shopifyReturnsCount}, db_returns=${dbReturnsInfo?.n ?? 0}`,
      );
    }
  }

  logger.info(`---- REFUND COMPARISON ----`);
  logger.info(`Shopify total_refunded sum (across 98 orders): ₹${totalShopifyRefunded.toFixed(2)}`);
  logger.info(`Our DB refunds sum: ₹${totalDbRefunded.toFixed(2)}`);
  logger.info(`Diff: ₹${(totalShopifyRefunded - totalDbRefunded).toFixed(2)}`);
  logger.info(`Shopify refund records count: ${shopifyRefundsCount}`);
  logger.info(`Our DB refund records count: ${dbRefundsCount}`);
  if (missingRefunds.length > 0) {
    logger.info(`MISMATCHES (${missingRefunds.length}):`);
    for (const m of missingRefunds.slice(0, 20)) logger.info(`  ${m}`);
  }

  logger.info(``);
  logger.info(`---- RETURNS COMPARISON ----`);
  logger.info(`Shopify return records count: ${totalShopifyReturnsCount}`);
  logger.info(`Our DB return records count: ${totalDbReturnsCount}`);
  if (missingReturns.length > 0) {
    logger.info(`MISMATCHES (${missingReturns.length}):`);
    for (const m of missingReturns.slice(0, 20)) logger.info(`  ${m}`);
  }

  await sequelize.close();
}

main().catch((err) => {
  logger.error(`[Probe] FAILED: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
