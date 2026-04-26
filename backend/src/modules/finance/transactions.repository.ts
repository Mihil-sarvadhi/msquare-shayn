import { QueryTypes, type CreationAttributes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { OrderTransaction } from '@db/models';
import { SOURCE } from '@constant';

export async function upsertTransactions(
  rows: CreationAttributes<OrderTransaction>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await OrderTransaction.bulkCreate(rows, {
    updateOnDuplicate: [
      'order_id',
      'kind',
      'status',
      'gateway',
      'amount',
      'currency',
      'payment_method',
      'processed_at',
      'parent_transaction_id',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
  });
  return rows.length;
}

export async function paymentMethodSplit(
  from: Date,
  to: Date,
): Promise<{
  cod: { count: number; amount: number };
  prepaid: { count: number; amount: number };
  by_gateway: { gateway: string; count: number; amount: number }[];
}> {
  const splits = await sequelize.query<{ is_cod: boolean; count: string; amount: string }>(
    `SELECT (LOWER(COALESCE(gateway,'')) IN ('cod','cash_on_delivery')) AS is_cod,
            COUNT(*)::text AS count,
            SUM(amount)::text AS amount
       FROM orders_transactions
       WHERE source = :source
         AND kind IN ('sale','capture')
         AND status = 'success'
         AND processed_at BETWEEN :from AND :to
       GROUP BY (LOWER(COALESCE(gateway,'')) IN ('cod','cash_on_delivery'))`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );

  const byGateway = await sequelize.query<{ gateway: string; count: string; amount: string }>(
    `SELECT COALESCE(gateway, 'unknown') AS gateway, COUNT(*)::text AS count, SUM(amount)::text AS amount
       FROM orders_transactions
       WHERE source = :source
         AND kind IN ('sale','capture')
         AND status = 'success'
         AND processed_at BETWEEN :from AND :to
       GROUP BY COALESCE(gateway, 'unknown')
       ORDER BY SUM(amount) DESC`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );

  const cod = splits.find((s) => s.is_cod) ?? { count: '0', amount: '0' };
  const prepaid = splits.find((s) => !s.is_cod) ?? { count: '0', amount: '0' };

  return {
    cod: { count: parseInt(cod.count, 10), amount: parseFloat(cod.amount) },
    prepaid: { count: parseInt(prepaid.count, 10), amount: parseFloat(prepaid.amount) },
    by_gateway: byGateway.map((r) => ({
      gateway: r.gateway,
      count: parseInt(r.count, 10),
      amount: parseFloat(r.amount),
    })),
  };
}

export interface TxListParams {
  from: Date;
  to: Date;
  page: number;
  limit: number;
  gateway?: string;
  kind?: string;
}

export interface TxRow {
  id: number;
  source_transaction_id: string;
  order_id: string;
  kind: string;
  status: string;
  gateway: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  processed_at: string | null;
}

export async function listTransactions(
  params: TxListParams,
): Promise<{ rows: TxRow[]; total: number }> {
  const offset = (params.page - 1) * params.limit;
  const where: string[] = ['source = :source', 'processed_at BETWEEN :from AND :to'];
  const replacements: Record<string, unknown> = {
    source: SOURCE.SHOPIFY,
    from: params.from,
    to: params.to,
    limit: params.limit,
    offset,
  };
  if (params.gateway) {
    where.push('gateway = :gateway');
    replacements.gateway = params.gateway;
  }
  if (params.kind) {
    where.push('kind = :kind');
    replacements.kind = params.kind;
  }
  const whereClause = where.join(' AND ');

  const rows = await sequelize.query<TxRow>(
    `SELECT id, source_transaction_id, order_id, kind, status, gateway, amount, currency, payment_method, processed_at
       FROM orders_transactions
       WHERE ${whereClause}
       ORDER BY processed_at DESC
       LIMIT :limit OFFSET :offset`,
    { type: QueryTypes.SELECT, replacements },
  );
  const totalResult = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM orders_transactions WHERE ${whereClause}`,
    { type: QueryTypes.SELECT, replacements },
  );
  return { rows, total: parseInt(totalResult[0]?.count ?? '0', 10) };
}
