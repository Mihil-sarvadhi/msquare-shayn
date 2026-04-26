import { registerResource } from '@modules/sync-orchestrator/sync-orchestrator.registry';
import {
  balanceTransactionsHandler,
  locationsHandler,
  payoutsHandler,
  refundsHandler,
  transactionsHandler,
} from './finance.handlers';

export function registerFinanceResources(): void {
  registerResource(locationsHandler);
  registerResource(payoutsHandler);
  registerResource(balanceTransactionsHandler);
  registerResource(refundsHandler);
  registerResource(transactionsHandler);
}

export * from './finance.types';
