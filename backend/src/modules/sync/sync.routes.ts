import { Router } from 'express';
import { syncShopifyHandler, syncMetaHandler, syncIthinkHandler, syncIthinkBackfillHandler, syncJudgeMeHandler, syncAllHandler } from './sync.controller';

const router = Router();

router.post('/all', syncAllHandler);
router.post('/shopify', syncShopifyHandler);
router.post('/meta', syncMetaHandler);
router.post('/ithink', syncIthinkHandler);
router.post('/ithink/backfill', syncIthinkBackfillHandler);
router.post('/judgeme', syncJudgeMeHandler);

export default router;
