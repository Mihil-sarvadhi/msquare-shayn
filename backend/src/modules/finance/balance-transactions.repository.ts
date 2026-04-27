import { QueryTypes, type CreationAttributes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { BalanceTransaction } from '@db/models';
import type { BalanceTransactionSummary } from './finance.types';

export async function upsertBalanceTransactions(
  rows: CreationAttributes<BalanceTransaction>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await BalanceTransaction.bulkCreate(rows, {
    updateOnDuplicate: [
      'payout_id',
      'source_payout_id',
      'transaction_id',
      'type',
      'amount',
      'fee',
      'net',
      'processed_at',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
    conflictAttributes: ['source', 'source_balance_transaction_id'],
  });
  return rows.length;
}

/**
 * After payouts are upserted, link previously-orphan balance_transactions to their parent
 * payout by joining on (source, source_payout_id). Returns rows affected.
 */
export async function linkBalanceTransactionsToPayouts(): Promise<number> {
  const [, meta] = (await sequelize.query(
    `UPDATE balance_transactions bt
        SET payout_id = p.id, updated_at = NOW()
       FROM payouts p
       WHERE bt.source_payout_id IS NOT NULL
         AND bt.payout_id IS NULL
         AND bt.source = p.source
         AND bt.source_payout_id = p.source_payout_id`,
  )) as [unknown, unknown];
  // pg driver returns rowCount on the second tuple element as { rowCount }
  const rowCount =
    typeof meta === 'object' && meta !== null && 'rowCount' in meta
      ? Number((meta as { rowCount: number }).rowCount)
      : 0;
  return rowCount;
}

export async function listBalanceTransactionsForPayout(
  payoutId: number,
): Promise<BalanceTransactionSummary[]> {
  return sequelize.query<BalanceTransactionSummary>(
    `SELECT id, type, amount, fee, net, processed_at, transaction_id
       FROM balance_transactions
       WHERE payout_id = :payoutId
       ORDER BY processed_at ASC NULLS LAST`,
    { type: QueryTypes.SELECT, replacements: { payoutId } },
  );
}
