/**
 * Probe Shopify for edit-related fields on window orders to find the residual
 * ₹22K returns gap. Queries `edited`, `originalTotalPriceSet vs currentTotalPriceSet`,
 * `refundDiscrepancySet`, `totalCashRoundingAdjustment` for each order and
 * surfaces aggregate signals.
 *
 * Usage: npx tsx src/scripts/probe-order-edits.ts
 */
import { graphqlRequest } from '@modules/shopify/shopify.connector';
import { logger } from '@logger/logger';
import { sequelize } from '@db/sequelize';

const PROBE_QUERY = `
  query Probe($queryStr: String!, $cursor: String) {
    orders(first: 50, after: $cursor, query: $queryStr) {
      edges {
        cursor
        node {
          id
          name
          edited
          displayFinancialStatus
          totalPriceSet { shopMoney { amount } }
          currentTotalPriceSet { shopMoney { amount } }
          subtotalPriceSet { shopMoney { amount } }
          currentSubtotalPriceSet { shopMoney { amount } }
          totalDiscountsSet { shopMoney { amount } }
          currentTotalDiscountsSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          currentTotalTaxSet { shopMoney { amount } }
          refundDiscrepancySet { shopMoney { amount } }
          totalCashRoundingAdjustment {
            paymentSet { shopMoney { amount } }
            refundSet { shopMoney { amount } }
          }
          totalReceivedSet { shopMoney { amount } }
          totalRefundedSet { shopMoney { amount } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface ProbedOrder {
  id: string;
  name: string;
  edited: boolean;
  displayFinancialStatus: string;
  totalPriceSet: { shopMoney: { amount: string } };
  currentTotalPriceSet: { shopMoney: { amount: string } };
  subtotalPriceSet: { shopMoney: { amount: string } };
  currentSubtotalPriceSet: { shopMoney: { amount: string } };
  totalDiscountsSet: { shopMoney: { amount: string } };
  currentTotalDiscountsSet: { shopMoney: { amount: string } };
  totalTaxSet: { shopMoney: { amount: string } };
  currentTotalTaxSet: { shopMoney: { amount: string } };
  refundDiscrepancySet: { shopMoney: { amount: string } } | null;
  totalCashRoundingAdjustment: {
    paymentSet: { shopMoney: { amount: string } };
    refundSet: { shopMoney: { amount: string } };
  };
  totalReceivedSet: { shopMoney: { amount: string } };
  totalRefundedSet: { shopMoney: { amount: string } };
}

const n = (s: string | undefined): number => (s ? parseFloat(s) : 0);

async function main(): Promise<void> {
  await sequelize.authenticate();
  const queryStr = `created_at:>=2026-04-01 created_at:<=2026-04-25`;
  const all: ProbedOrder[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  type Resp = {
    orders: {
      edges: { node: ProbedOrder }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(PROBE_QUERY, { queryStr, cursor });
    all.push(...data.orders.edges.map((e: { node: ProbedOrder }) => e.node));
    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 200));
  }

  logger.info(`[Probe] Got ${all.length} orders for window`);

  let editedCount = 0;
  let totalDiscrepancy = 0;
  let totalRoundingPayment = 0;
  let totalRoundingRefund = 0;
  let totalOriginalGross = 0;
  let totalCurrentGross = 0;
  let totalOriginalDisc = 0;
  let totalCurrentDisc = 0;
  let totalOriginalTax = 0;
  let totalCurrentTax = 0;
  const editedOrders: { name: string; origPrice: number; currPrice: number; diff: number }[] = [];
  const discrepantOrders: { name: string; discrepancy: number }[] = [];

  for (const o of all) {
    const origPrice = n(o.totalPriceSet?.shopMoney?.amount);
    const currPrice = n(o.currentTotalPriceSet?.shopMoney?.amount);
    const origSub = n(o.subtotalPriceSet?.shopMoney?.amount);
    const currSub = n(o.currentSubtotalPriceSet?.shopMoney?.amount);
    const origDisc = n(o.totalDiscountsSet?.shopMoney?.amount);
    const currDisc = n(o.currentTotalDiscountsSet?.shopMoney?.amount);
    const origTax = n(o.totalTaxSet?.shopMoney?.amount);
    const currTax = n(o.currentTotalTaxSet?.shopMoney?.amount);
    const discrepancy = n(o.refundDiscrepancySet?.shopMoney?.amount);
    const roundingPay = n(o.totalCashRoundingAdjustment?.paymentSet?.shopMoney?.amount);
    const roundingRef = n(o.totalCashRoundingAdjustment?.refundSet?.shopMoney?.amount);

    if (o.edited) {
      editedCount++;
      editedOrders.push({ name: o.name, origPrice, currPrice, diff: origPrice - currPrice });
    }
    if (Math.abs(discrepancy) > 0.01) {
      discrepantOrders.push({ name: o.name, discrepancy });
    }
    totalDiscrepancy += discrepancy;
    totalRoundingPayment += roundingPay;
    totalRoundingRefund += roundingRef;
    totalOriginalGross += origSub + origDisc;
    totalCurrentGross += currSub + currDisc;
    totalOriginalDisc += origDisc;
    totalCurrentDisc += currDisc;
    totalOriginalTax += origTax;
    totalCurrentTax += currTax;
  }

  logger.info(`---- AGGREGATES ----`);
  logger.info(`Edited orders count: ${editedCount} / ${all.length}`);
  logger.info(`refundDiscrepancySet sum: ₹${totalDiscrepancy.toFixed(2)}`);
  logger.info(`totalCashRoundingAdjustment payments sum: ₹${totalRoundingPayment.toFixed(2)}`);
  logger.info(`totalCashRoundingAdjustment refunds sum: ₹${totalRoundingRefund.toFixed(2)}`);
  logger.info(``);
  logger.info(`SUM(originalGross = subtotal+disc) [tax-incl]: ₹${totalOriginalGross.toFixed(2)}`);
  logger.info(`SUM(currentGross = currSub+currDisc): ₹${totalCurrentGross.toFixed(2)}`);
  logger.info(`Diff (original - current): ₹${(totalOriginalGross - totalCurrentGross).toFixed(2)}`);
  logger.info(``);
  logger.info(`SUM(originalDisc): ₹${totalOriginalDisc.toFixed(2)}`);
  logger.info(`SUM(currentDisc): ₹${totalCurrentDisc.toFixed(2)}`);
  logger.info(`Diff (orig - curr): ₹${(totalOriginalDisc - totalCurrentDisc).toFixed(2)}`);
  logger.info(``);
  logger.info(`SUM(originalTax): ₹${totalOriginalTax.toFixed(2)}`);
  logger.info(`SUM(currentTax): ₹${totalCurrentTax.toFixed(2)}`);
  logger.info(`Diff (orig - curr): ₹${(totalOriginalTax - totalCurrentTax).toFixed(2)}`);

  if (editedOrders.length > 0) {
    logger.info(`---- EDITED ORDERS ----`);
    for (const e of editedOrders) {
      logger.info(`  ${e.name}: orig=${e.origPrice} curr=${e.currPrice} diff=${e.diff}`);
    }
  }
  if (discrepantOrders.length > 0) {
    logger.info(`---- DISCREPANT ORDERS ----`);
    for (const d of discrepantOrders) {
      logger.info(`  ${d.name}: discrepancy=${d.discrepancy}`);
    }
  }

  await sequelize.close();
}

main().catch((err) => {
  logger.error(`[Probe] FAILED: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
