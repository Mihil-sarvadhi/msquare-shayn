export const CONNECTOR_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  DOWN: 'down',
  UNKNOWN: 'unknown',
} as const;

export type ConnectorStatus = (typeof CONNECTOR_STATUS)[keyof typeof CONNECTOR_STATUS];

export const PAYMENT_MODES = ['prepaid', 'cod'] as const;

export const SHIPMENT_STATUSES = [
  'in_transit', 'delivered', 'pending', 'failed', 'returned',
] as const;
