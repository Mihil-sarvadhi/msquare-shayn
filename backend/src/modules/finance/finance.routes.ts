import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import {
  kpisHandler,
  paymentMethodSplitHandler,
  payoutDetailHandler,
  payoutsListHandler,
  refundsListHandler,
  refundsSummaryHandler,
  revenueBreakdownHandler,
  salesBreakdownHandler,
  transactionsListHandler,
} from './finance.controller';

const router = Router();

router.use(authenticate);

router.get('/kpis', kpisHandler);
router.get('/revenue-breakdown', revenueBreakdownHandler);
router.get('/sales-breakdown', salesBreakdownHandler);
router.get('/payment-method-split', paymentMethodSplitHandler);
router.get('/payouts', payoutsListHandler);
router.get('/payouts/:id', payoutDetailHandler);
router.get('/refunds', refundsListHandler);
router.get('/refunds/summary', refundsSummaryHandler);
router.get('/transactions', transactionsListHandler);

export default router;
