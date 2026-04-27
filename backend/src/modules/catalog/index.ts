import { registerResource } from '@modules/sync-orchestrator/sync-orchestrator.registry';
import { inventoryLevelsHandler, productsHandler } from './catalog.handlers';

export function registerCatalogResources(): void {
  registerResource(productsHandler);
  registerResource(inventoryLevelsHandler);
}

export * from './catalog.types';
