import { QueryTypes, type CreationAttributes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { Payout } from '@db/models';
import { SOURCE } from '@constant';
import type { PayoutSummary } from './finance.types';

export async function upsertPayouts(rows: CreationAttributes<Payout>[]): Promise<number> {
  if (rows.length === 0) return 0;
  await Payout.bulkCreate(rows, {
    updateOnDuplicate: [
      'payout_date',
      'status',
      'amount',
      'currency',
      'bank_summary',
      'charges_gross',
      'refunds_gross',
      'adjustments_gross',
      'fees_total',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
  });
  return rows.length;
}

export async function payoutAggregates(
  from: Date,
  to: Date,
): Promise<{ payouts_received: number; shopify_fees: number }> {
  const result = await sequelize.query<{ payouts_received: string; shopify_fees: string }>(
    `SELECT COALESCE(SUM(amount),0)::text AS payouts_received,
            COALESCE(SUM(fees_total),0)::text AS shopify_fees
       FROM payouts
       WHERE source = :source AND payout_date BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  return {
    payouts_received: parseFloat(result[0]?.payouts_received ?? '0'),
    shopify_fees: parseFloat(result[0]?.shopify_fees ?? '0'),
  };
}

export interface PayoutsListParams {
  from: Date;
  to: Date;
  page: number;
  limit: number;
  status?: string;
}

export async function listPayouts(
  params: PayoutsListParams,
): Promise<{ rows: PayoutSummary[]; total: number }> {
  const offset = (params.page - 1) * params.limit;
  const where: string[] = ['source = :source', 'payout_date BETWEEN :from AND :to'];
  const replacements: Record<string, unknown> = {
    source: SOURCE.SHOPIFY,
    from: params.from,
    to: params.to,
    limit: params.limit,
    offset,
  };
  if (params.status) {
    where.push('status = :status');
    replacements.status = params.status;
  }
  const whereClause = where.join(' AND ');

  const rows = await sequelize.query<PayoutSummary>(
    `SELECT id, source_payout_id, payout_date::text AS payout_date, status, amount, currency,
            bank_summary, charges_gross, refunds_gross, adjustments_gross, fees_total
       FROM payouts
       WHERE ${whereClause}
       ORDER BY payout_date DESC NULLS LAST
       LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements },
  );
  const totalResult = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM payouts WHERE ${whereClause}`,
    { type: QueryTypes.SELECT, replacements },
  );
  return { rows, total: parseInt(totalResult[0]?.count ?? '0', 10) };
}

export async function findPayoutById(id: number): Promise<PayoutSummary | null> {
  const result = await sequelize.query<PayoutSummary>(
    `SELECT id, source_payout_id, payout_date::text AS payout_date, status, amount, currency,
            bank_summary, charges_gross, refunds_gross, adjustments_gross, fees_total
       FROM payouts WHERE id = :id LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { id } },
  );
  return result[0] ?? null;
}
