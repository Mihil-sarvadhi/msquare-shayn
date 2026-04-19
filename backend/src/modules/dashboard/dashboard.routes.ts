import { Router } from 'express';
import * as controller from './dashboard.controller';

const router = Router();

router.get('/kpis', controller.kpisHandler);
router.get('/revenue-trend', controller.revenueTrendHandler);
router.get('/meta-funnel', controller.metaFunnelHandler);
router.get('/campaigns', controller.campaignsHandler);
router.get('/top-products', controller.topProductsHandler);
router.get('/logistics', controller.logisticsHandler);
router.get('/abandoned-carts', controller.abandonedCartsHandler);
router.get('/reviews-summary', controller.reviewsSummaryHandler);
router.get('/reviews-trend', controller.reviewsTrendHandler);
router.get('/top-rated-products', controller.topRatedProductsHandler);
router.get('/recent-reviews', controller.recentReviewsHandler);
router.get('/all-reviews', controller.allReviewsHandler);

export default router;
