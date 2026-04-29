/* eslint-disable no-console */
/** Smoke-test getKpis with the new storefront fields. Throwaway. */
import 'dotenv/config';
import { getKpis } from '@modules/finance/finance.service';
import { sequelize } from '@db/sequelize';

async function main() {
  await sequelize.authenticate();
  const from = new Date('2026-04-01T00:00:00.000+05:30');
  const to = new Date('2026-04-29T23:59:59.999+05:30');
  const k = await getKpis(from, to);
  console.log('Window:', from.toISOString(), '→', to.toISOString());
  console.log('Storefront tiles:');
  console.log('  sessions:               ', k.sessions);
  console.log('  returning_customer_rate:', k.returning_customer_rate);
  console.log('  orders_fulfilled:       ', k.orders_fulfilled);
  console.log('  orders:                 ', k.orders);
  console.log('Existing financials:');
  console.log('  gross_revenue:          ', k.gross_revenue.toFixed(2));
  console.log('  total_refunds:          ', k.total_refunds.toFixed(2));
  console.log('  order_count:            ', k.order_count);
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
