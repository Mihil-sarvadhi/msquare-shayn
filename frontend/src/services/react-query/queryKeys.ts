export const QUERY_KEYS = {
  dashboard: (range: string) => ['dashboard', range] as const,
  health: () => ['health'] as const,
} as const;
