export const END_POINTS = {
  COMMON: '/api',
  // Dashboard endpoints
  DASHBOARD: '/dashboard',
  HEALTH: '/health',
  SYNC: '/sync',
  // Webhook (outside /api prefix)
  WEBHOOKS: '/webhooks',
} as const;

export type EndpointKey = keyof typeof END_POINTS;
