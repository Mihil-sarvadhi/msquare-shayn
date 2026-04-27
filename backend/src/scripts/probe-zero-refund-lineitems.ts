/**
 * Fetch Shopify's full refund records (including $0 refunds) with their line
 * items for window orders. Aggregate the line-item value to test the hypothesis
 * that VOIDED orders' "restock-only refunds" carry the missing ₹22K of returns.
 *
 * Usage: npx tsx src/scripts/probe-zero-refund-lineitems.ts
 */
import { graphqlRequest } from '@modules/shopify/shopify.connector';
import { logger } from '@logger/logger';
import { sequelize } from '@db/sequelize';

const QUERY = `
  query Q($queryStr: String!, $cursor: String) {
    orders(first: 25, after: $cursor, query: $queryStr) {
      edges {
        cursor
        node {
          id
          name
          displayFinancialStatus
          totalRefundedSet { shopMoney { amount } }
          refunds {
            id
            createdAt
            totalRefundedSet { shopMoney { amount } }
            refundLineItems(first: 50) {
              edges { node {
                quantity
                restockType
                subtotalSet { shopMoney { amount } }
                priceSet { shopMoney { amount } }
                totalTaxSet { shopMoney { amount } }
                lineItem { sku }
              }}
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface RefundLI {
  quantity: number;
  restockType: string | null;
  subtotalSet: { shopMoney: { amount: string } };
  priceSet: { shopMoney: { amount: string } };
  totalTaxSet: { shopMoney: { amount: string } };
  lineItem: { sku: string | null } | null;
}

interface Refund {
  id: string;
  createdAt: string;
  totalRefundedSet: { shopMoney: { amount: string } };
  refundLineItems: { edges: { node: RefundLI }[] };
}

interface OrderProbe {
  id: string;
  name: string;
  displayFinancialStatus: string;
  totalRefundedSet: { shopMoney: { amount: string } };
  refunds: Refund[];
}

const n = (s: string | undefined): number => (s ? parseFloat(s) : 0);

async function main(): Promise<void> {
  await sequelize.authenticate();
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
  logger.info(`[Probe] Got ${all.length} orders`);

  let zeroDollarRefunds = 0;
  let monetaryRefunds = 0;
  let totalLineItemValue = 0;
  let totalLineItemValueOnZeroDollarRefunds = 0;
  let totalLineItemTax = 0;
  const restockTypeCounts = new Map<string, { count: number; value: number }>();
  const ordersWithZeroRefund: { name: string; status: string; refundCount: number; liValue: number; liTax: number }[] = [];

  for (const o of all) {
    let orderZeroRefundLiValue = 0;
    let orderZeroRefundLiTax = 0;
    let orderZeroRefundCount = 0;
    for (const r of o.refunds) {
      const refundAmount = n(r.totalRefundedSet?.shopMoney?.amount);
      const liValue = r.refundLineItems.edges.reduce(
        (sum, e) => sum + n(e.node.subtotalSet?.shopMoney?.amount),
        0,
      );
      const liTax = r.refundLineItems.edges.reduce(
        (sum, e) => sum + n(e.node.totalTaxSet?.shopMoney?.amount),
        0,
      );
      totalLineItemValue += liValue;
      totalLineItemTax += liTax;

      for (const e of r.refundLineItems.edges) {
        const rt = e.node.restockType ?? 'NULL';
        const v = n(e.node.subtotalSet?.shopMoney?.amount);
        const cur = restockTypeCounts.get(rt) ?? { count: 0, value: 0 };
        cur.count += 1;
        cur.value += v;
        restockTypeCounts.set(rt, cur);
      }

      if (refundAmount > 0.01) {
        monetaryRefunds++;
      } else {
        zeroDollarRefunds++;
        totalLineItemValueOnZeroDollarRefunds += liValue;
        orderZeroRefundLiValue += liValue;
        orderZeroRefundLiTax += liTax;
        orderZeroRefundCount++;
      }
    }

    if (orderZeroRefundCount > 0) {
      ordersWithZeroRefund.push({
        name: o.name,
        status: o.displayFinancialStatus,
        refundCount: orderZeroRefundCount,
        liValue: orderZeroRefundLiValue,
        liTax: orderZeroRefundLiTax,
      });
    }
  }

  logger.info(`---- REFUND RECORD BREAKDOWN ----`);
  logger.info(`Monetary refunds (>0): ${monetaryRefunds}`);
  logger.info(`Zero-dollar refunds (=0, restock only): ${zeroDollarRefunds}`);
  logger.info(``);
  logger.info(`---- LINE ITEM VALUES ----`);
  logger.info(`Total refund line items value (subtotal sum): ₹${totalLineItemValue.toFixed(2)}`);
  logger.info(`  on monetary refunds: ₹${(totalLineItemValue - totalLineItemValueOnZeroDollarRefunds).toFixed(2)}`);
  logger.info(`  on zero-dollar refunds: ₹${totalLineItemValueOnZeroDollarRefunds.toFixed(2)}`);
  logger.info(`Total refund line items tax: ₹${totalLineItemTax.toFixed(2)}`);
  logger.info(``);
  logger.info(`---- RESTOCK TYPE BREAKDOWN ----`);
  for (const [rt, info] of restockTypeCounts.entries()) {
    logger.info(`  ${rt}: ${info.count} items, ₹${info.value.toFixed(2)}`);
  }
  logger.info(``);
  logger.info(`---- ORDERS WITH ZERO-DOLLAR REFUNDS (top 10) ----`);
  ordersWithZeroRefund.sort((a, b) => b.liValue - a.liValue);
  for (const o of ordersWithZeroRefund.slice(0, 10)) {
    logger.info(
      `  ${o.name} [${o.status}]: ${o.refundCount} refund(s), li_value=₹${o.liValue.toFixed(2)}, li_tax=₹${o.liTax.toFixed(2)}`,
    );
  }
  logger.info(`Total orders with zero-dollar refunds: ${ordersWithZeroRefund.length}`);

  await sequelize.close();
}

main().catch((err) => {
  logger.error(`[Probe] FAILED: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
