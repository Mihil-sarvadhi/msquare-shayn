import { Router } from 'express';
import { shopifyOrderCreateHandler, shopifyOrderUpdateHandler } from './webhook.controller';

const router = Router();

router.post('/orders/create', shopifyOrderCreateHandler);
router.post('/orders/updated', shopifyOrderUpdateHandler);

export default router;
