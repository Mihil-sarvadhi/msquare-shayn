import { QueryTypes, type CreationAttributes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { OrderRefund } from '@db/models';
import { SOURCE } from '@constant';

export async function upsertRefunds(rows: CreationAttributes<OrderRefund>[]): Promise<number> {
  if (rows.length === 0) return 0;
  await OrderRefund.bulkCreate(rows, {
    updateOnDuplicate: [
      'order_id',
      'refund_amount',
      'refund_currency',
      'reason',
      'refunded_at',
      'restocked',
      'refund_line_items',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
  });
  return rows.length;
}

export interface RefundsListParams {
  from: Date;
  to: Date;
  page: number;
  limit: number;
  reason?: string;
}

export interface RefundRow {
  id: number;
  source_refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_currency: string;
  reason: string | null;
  refunded_at: string;
  restocked: boolean;
}

export async function listRefunds(
  params: RefundsListParams,
): Promise<{ rows: RefundRow[]; total: number }> {
  const offset = (params.page - 1) * params.limit;
  const where: string[] = ['source = :source', 'refunded_at >= :from', 'refunded_at <= :to'];
  const replacements: Record<string, unknown> = {
    source: SOURCE.SHOPIFY,
    from: params.from,
    to: params.to,
    limit: params.limit,
    offset,
  };
  if (params.reason) {
    where.push('reason = :reason');
    replacements.reason = params.reason;
  }
  const whereClause = where.join(' AND ');

  const rows = await sequelize.query<RefundRow>(
    `SELECT id, source_refund_id, order_id, refund_amount, refund_currency, reason, refunded_at, restocked
       FROM orders_refunds
       WHERE ${whereClause}
       ORDER BY refunded_at DESC
       LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements },
  );

  const totalResult = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM orders_refunds WHERE ${whereClause}`,
    { type: QueryTypes.SELECT, replacements },
  );
  return { rows, total: parseInt(totalResult[0]?.count ?? '0', 10) };
}

export async function refundSummaryAggregates(
  from: Date,
  to: Date,
): Promise<{
  total_refunds: number;
  refund_count: number;
  by_reason: { reason: string; count: number; amount: number }[];
}> {
  const totals = await sequelize.query<{ total_refunds: string; refund_count: string }>(
    `SELECT COALESCE(SUM(refund_amount),0)::text AS total_refunds, COUNT(*)::text AS refund_count
       FROM orders_refunds
       WHERE source = :source AND refunded_at BETWEEN :from AND :to`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  const byReason = await sequelize.query<{ reason: string; count: string; amount: string }>(
    `SELECT COALESCE(reason, 'Unspecified') AS reason, COUNT(*)::text AS count, SUM(refund_amount)::text AS amount
       FROM orders_refunds
       WHERE source = :source AND refunded_at BETWEEN :from AND :to
       GROUP BY COALESCE(reason, 'Unspecified')
       ORDER BY SUM(refund_amount) DESC
       LIMIT 10`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
  return {
    total_refunds: parseFloat(totals[0]?.total_refunds ?? '0'),
    refund_count: parseInt(totals[0]?.refund_count ?? '0', 10),
    by_reason: byReason.map((r) => ({
      reason: r.reason,
      count: parseInt(r.count, 10),
      amount: parseFloat(r.amount),
    })),
  };
}
