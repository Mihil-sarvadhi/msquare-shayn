import { Router, Request, Response } from 'express';
import db from '../config/database';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const { rows } = await db.query(`
      SELECT
        ch.connector_name,
        ch.status,
        ch.error_message,
        ch.records_synced,
        COALESCE(
          ch.last_sync_at,
          CASE ch.connector_name
            WHEN 'shopify' THEN (SELECT MAX(synced_at) FROM shopify_orders)
            ELSE NULL
          END
        ) AS last_sync_at
      FROM connector_health ch
      ORDER BY connector_name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
