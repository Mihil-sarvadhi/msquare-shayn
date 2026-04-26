import { Router } from 'express';
import * as controller from './ga4.controller';

const router = Router();

router.get('/overview',  controller.overviewHandler);
router.get('/channels',  controller.channelsHandler);
router.get('/ecommerce', controller.ecommerceHandler);
router.get('/products',  controller.productsHandler);
router.get('/realtime',  controller.realtimeHandler);
router.get('/realtime-widget', controller.realtimeWidgetHandler);
router.get('/country-active-users', controller.countryActiveUsersHandler);
router.get('/pages-screens', controller.pagesScreensHandler);
router.get('/summary',   controller.summaryHandler);

export default router;
