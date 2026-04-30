import { Router } from 'express';
import * as controller from './unicommerce.controller';

const router = Router();

router.get('/summary', controller.summaryHandler);
router.get('/revenue-trend', controller.revenueTrendHandler);
router.get('/top-products', controller.topProductsHandler);
router.get('/top-products-pct', controller.topProductsWithPctHandler);
router.get('/top-products-by-channel', controller.topProductsByChannelHandler);
router.get('/top-categories', controller.topCategoriesHandler);
router.get('/channel-returns', controller.channelReturnsHandler);
router.get('/today-snapshot', controller.todaySnapshotHandler);
router.get('/order-status', controller.orderStatusHandler);
router.get('/channel-comparison', controller.channelComparisonHandler);
router.get('/returns', controller.returnsHandler);
router.get('/recent-orders', controller.recentOrdersHandler);

export default router;
