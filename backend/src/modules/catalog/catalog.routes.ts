import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import {
  bestSellersHandler,
  inventoryHandler,
  kpisHandler,
  locationsHandler,
  marginHandler,
  productDetailHandler,
  productsListHandler,
  slowMoversHandler,
  stockoutsHandler,
} from './catalog.controller';

const router = Router();

router.use(authenticate);

router.get('/kpis', kpisHandler);
router.get('/products', productsListHandler);
router.get('/products/:id', productDetailHandler);
router.get('/best-sellers', bestSellersHandler);
router.get('/slow-movers', slowMoversHandler);
router.get('/inventory', inventoryHandler);
router.get('/stockouts', stockoutsHandler);
router.get('/margin', marginHandler);
router.get('/locations', locationsHandler);

export default router;
