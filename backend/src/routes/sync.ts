import { Router, Request, Response } from 'express';
import { syncShopifyOrders } from '../jobs/shopifySync';
import { syncMetaInsights } from '../jobs/metaSync';
import { syncIthinkShipments, syncDailyRemittance } from '../jobs/ithinkSync';

const router = Router();

router.post('/shopify', async (_req: Request, res: Response) => {
  try {
    await syncShopifyOrders();
    res.json({ success: true, message: 'Shopify sync triggered' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/meta', async (_req: Request, res: Response) => {
  try {
    await syncMetaInsights();
    res.json({ success: true, message: 'Meta sync triggered' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/ithink', async (_req: Request, res: Response) => {
  try {
    await syncIthinkShipments();
    await syncDailyRemittance();
    res.json({ success: true, message: 'iThink sync triggered' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
