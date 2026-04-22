import { Router } from 'express';
import {
  syncShopifyHandler,
  syncMetaHandler,
  syncIthinkHandler,
  syncIthinkBackfillHandler,
  syncJudgeMeHandler,
  syncGA4Handler,
  refreshGA4TokenHandler,
  syncAllHandler,
} from './sync.controller';

const router = Router();

router.post('/all', syncAllHandler);
router.post('/shopify', syncShopifyHandler);
router.post('/meta', syncMetaHandler);
router.post('/ithink', syncIthinkHandler);
router.post('/ithink/backfill', syncIthinkBackfillHandler);
router.post('/judgeme', syncJudgeMeHandler);
router.post('/ga4', syncGA4Handler);
router.post('/ga4/token-refresh', refreshGA4TokenHandler);

export default router;
