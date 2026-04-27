import { QueryTypes, type CreationAttributes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { OrderReturn } from '@db/models';
import { SOURCE } from '@constant';

export async function upsertReturns(rows: CreationAttributes<OrderReturn>[]): Promise<number> {
  if (rows.length === 0) return 0;
  await OrderReturn.bulkCreate(rows, {
    updateOnDuplicate: [
      'order_id',
      'name',
      'status',
      'total_quantity',
      'total_value',
      'return_shipping_fee_total',
      'return_created_at',
      'request_approved_at',
      'closed_at',
      'return_line_items',
      'source_metadata',
      'synced_at',
      'updated_at',
    ],
    conflictAttributes: ['source', 'source_return_id'],
  });
  return rows.length;
}

/**
 * Daily aggregation of return value bucketed by `return_created_at`. Used by the
 * sales-breakdown service to populate the "Returns" column on the computed view.
 */
export interface ReturnDailyAggregate {
  date: string;
  return_value: string;
  return_shipping_fees: string;
}

export async function returnsDaily(from: Date, to: Date): Promise<ReturnDailyAggregate[]> {
  return sequelize.query<ReturnDailyAggregate>(
    `SELECT date_trunc('day', return_created_at)::date::text AS date,
            COALESCE(SUM(total_value), 0)::text AS return_value,
            COALESCE(SUM(return_shipping_fee_total), 0)::text AS return_shipping_fees
       FROM orders_returns
       WHERE source = :source
         AND return_created_at BETWEEN :from AND :to
         AND status <> 'DECLINED'
         AND status <> 'CANCELED'
       GROUP BY date`,
    { type: QueryTypes.SELECT, replacements: { source: SOURCE.SHOPIFY, from, to } },
  );
}
