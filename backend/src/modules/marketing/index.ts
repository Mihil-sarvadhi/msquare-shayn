import { registerResource } from '@modules/sync-orchestrator/sync-orchestrator.registry';
import {
  discountsHandler,
  disputesHandler,
  giftCardsHandler,
} from './marketing.handlers';

export function registerMarketingResources(): void {
  registerResource(discountsHandler);
  registerResource(giftCardsHandler);
  registerResource(disputesHandler);
}

export * from './marketing.types';
