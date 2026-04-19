import { getConnectorHealth } from './health.repository';
import type { ConnectorHealthRow } from './health.types';

export async function fetchConnectorHealth(): Promise<ConnectorHealthRow[]> {
  return getConnectorHealth();
}
