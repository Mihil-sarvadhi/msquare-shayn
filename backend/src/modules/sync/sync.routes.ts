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
  syncUnicommerceHandler,
  syncUnicommerceBackfillHandler,
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
router.post('/unicommerce', syncUnicommerceHandler);
router.post('/unicommerce/backfill', syncUnicommerceBackfillHandler);

export default router;
