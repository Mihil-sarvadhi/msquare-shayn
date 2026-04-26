import { Router } from 'express';
import { authenticate, authorizeByRole } from '@middleware/auth';
import {
  backfillHandler,
  incrementalHandler,
  listCursorsHandler,
} from './sync-orchestrator.controller';

const router = Router();

// GET /api/sync/cursors[?source=<name>] — view sync state per resource (any authenticated user)
router.get('/cursors', authenticate, listCursorsHandler);

// POST /api/sync/:source/backfill[?resource=<name>] — admin-only
router.post('/:source/backfill', authenticate, authorizeByRole('ADMIN'), backfillHandler);

// POST /api/sync/:source/incremental — admin-only
router.post('/:source/incremental', authenticate, authorizeByRole('ADMIN'), incrementalHandler);

export default router;
