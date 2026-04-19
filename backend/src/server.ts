import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { validateEnv } from './config/env';
import dashboardRouter from './routes/dashboard';
import healthRouter from './routes/health';
import syncRouter from './routes/sync';
import shopifyWebhookRouter from './webhooks/shopifyWebhook';
import { startScheduler } from './jobs/scheduler';

validateEnv();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.use('/api/dashboard', dashboardRouter);
app.use('/api/health', healthRouter);
app.use('/api/sync', syncRouter);

// Raw body needed for HMAC verification
app.use(
  '/webhooks/shopify',
  express.raw({ type: 'application/json' }),
  shopifyWebhookRouter
);

startScheduler();

const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, () => {
  console.log(`SHAYN MIS Backend running on port ${PORT}`);
});

export default app;
