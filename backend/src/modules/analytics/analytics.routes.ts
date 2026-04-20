import { Router } from 'express';
import * as c from './analytics.controller';

const router = Router();

router.get('/net-revenue', c.netRevenueHandler);
router.get('/rto-by-state', c.rtoByStateHandler);
router.get('/cod-vs-prepaid-rto', c.codVsPrepaidRtoHandler);
router.get('/geo-revenue', c.geoRevenueHandler);
router.get('/logistics-costs', c.logisticsCostsHandler);
router.get('/cod-cashflow', c.codCashFlowHandler);
router.get('/customer-overview', c.customerOverviewHandler);
router.get('/customer-segments', c.customerSegmentsHandler);
router.get('/top-customers', c.topCustomersHandler);
router.get('/discount-analysis', c.discountAnalysisHandler);
router.get('/marketing-trend', c.marketingTrendHandler);
router.get('/attribution-gap', c.attributionGapHandler);
router.get('/top-skus', c.topSkusHandler);

export default router;
