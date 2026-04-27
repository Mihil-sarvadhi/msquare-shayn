import { Router } from 'express';
import express from 'express';
import authRoutes from '@modules/auth/auth.routes';
import dashboardRoutes from '@modules/dashboard/dashboard.routes';
import healthRoutes from '@modules/health/health.routes';
import syncRoutes from '@modules/sync/sync.routes';
import syncOrchestratorRoutes from '@modules/sync-orchestrator/sync-orchestrator.routes';
import webhookRoutes from '@modules/webhook/webhook.routes';
import analyticsRoutes from '@modules/analytics/analytics.routes';
import ga4Routes from '@modules/ga4/ga4.routes';
import financeRoutes from '@modules/finance/finance.routes';
import catalogRoutes from '@modules/catalog/catalog.routes';
import marketingRoutes, { riskRouter } from '@modules/marketing/marketing.routes';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/health', healthRoutes);
router.use('/sync', syncRoutes);
router.use('/sync', syncOrchestratorRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/analytics/ga4', ga4Routes);
router.use('/finance', financeRoutes);
router.use('/catalog', catalogRoutes);
router.use('/marketing', marketingRoutes);
router.use('/risk', riskRouter);
router.use('/webhooks/shopify', express.raw({ type: 'application/json' }), webhookRoutes);
