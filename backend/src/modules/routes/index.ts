import { Router } from 'express';
import dashboardRoutes from '@modules/dashboard/dashboard.routes';
import healthRoutes from '@modules/health/health.routes';
import syncRoutes from '@modules/sync/sync.routes';
import webhookRoutes from '@modules/webhook/webhook.routes';

const router = Router();

router.use('/dashboard', dashboardRoutes);
router.use('/health', healthRoutes);
router.use('/sync', syncRoutes);
router.use('/webhooks/shopify', webhookRoutes);

export default router;
