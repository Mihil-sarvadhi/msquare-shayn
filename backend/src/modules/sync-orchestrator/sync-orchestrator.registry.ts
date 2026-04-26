import type { SourceType } from '@constant';
import type { ResourceHandler } from './sync-orchestrator.types';

const handlers = new Map<string, ResourceHandler>();

function key(source: SourceType, resource: string): string {
  return `${source}:${resource}`;
}

export function registerResource(handler: ResourceHandler): void {
  handlers.set(key(handler.source, handler.resource), handler);
}

export function getResource(source: SourceType, resource: string): ResourceHandler | undefined {
  return handlers.get(key(source, resource));
}

export function listResources(source?: SourceType): ResourceHandler[] {
  const all = Array.from(handlers.values());
  return source ? all.filter((h) => h.source === source) : all;
}

export function clearRegistry(): void {
  handlers.clear();
}
