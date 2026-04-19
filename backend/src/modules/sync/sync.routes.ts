import { Router } from 'express';
import { syncShopifyHandler, syncMetaHandler, syncIthinkHandler, syncJudgeMeHandler } from './sync.controller';

const router = Router();

router.post('/shopify', syncShopifyHandler);
router.post('/meta', syncMetaHandler);
router.post('/ithink', syncIthinkHandler);
router.post('/judgeme', syncJudgeMeHandler);

export default router;
