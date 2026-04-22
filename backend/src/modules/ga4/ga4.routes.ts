import { Router } from 'express';
import * as controller from './ga4.controller';

const router = Router();

router.get('/overview',  controller.overviewHandler);
router.get('/channels',  controller.channelsHandler);
router.get('/ecommerce', controller.ecommerceHandler);
router.get('/products',  controller.productsHandler);
router.get('/devices',   controller.devicesHandler);
router.get('/geography', controller.geographyHandler);
router.get('/realtime',  controller.realtimeHandler);
router.get('/summary',   controller.summaryHandler);

export default router;
