export const API_ENDPOINTS = {
  dashboard: {
    kpis: '/dashboard/kpis',
    revenueTrend: '/dashboard/revenue-trend',
    metaFunnel: '/dashboard/meta-funnel',
    campaigns: '/dashboard/campaigns',
    topProducts: '/dashboard/top-products',
    logistics: '/dashboard/logistics',
    abandonedCarts: '/dashboard/abandoned-carts',
    reviewsSummary: '/dashboard/reviews-summary',
    topRatedProducts: '/dashboard/top-rated-products',
    recentReviews: '/dashboard/recent-reviews',
    allReviews: '/dashboard/all-reviews',
  },
  health: '/health',
  sync: {
    shopify: '/sync/shopify',
    meta: '/sync/meta',
    ithink: '/sync/ithink',
  },
} as const;
