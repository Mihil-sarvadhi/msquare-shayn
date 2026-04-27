import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import {
  activeDisputesHandler,
  codePerformanceHandler,
  disputesListHandler,
  discountCodesListHandler,
  giftCardsListHandler,
  marketingKpisHandler,
  priceRulesListHandler,
  riskKpisHandler,
} from './marketing.controller';

const router = Router();
router.use(authenticate);

// Marketing
router.get('/kpis', marketingKpisHandler);
router.get('/discount-codes', discountCodesListHandler);
router.get('/discount-codes/:code/performance', codePerformanceHandler);
router.get('/price-rules', priceRulesListHandler);
router.get('/gift-cards', giftCardsListHandler);

export default router;

// Risk routes share the marketing module but are mounted under /risk
const riskRouter = Router();
riskRouter.use(authenticate);
riskRouter.get('/kpis', riskKpisHandler);
riskRouter.get('/disputes/active', activeDisputesHandler);
riskRouter.get('/disputes', disputesListHandler);
export { riskRouter };
