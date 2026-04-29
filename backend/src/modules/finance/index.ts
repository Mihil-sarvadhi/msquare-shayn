import { registerResource } from '@modules/sync-orchestrator/sync-orchestrator.registry';
import {
  locationsHandler,
  refundsHandler,
  returnsHandler,
  transactionsHandler,
} from './finance.handlers';

export function registerFinanceResources(): void {
  registerResource(locationsHandler);
  registerResource(refundsHandler);
  registerResource(returnsHandler);
  registerResource(transactionsHandler);
}

export * from './finance.types';
