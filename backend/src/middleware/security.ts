import type { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { environment } from '@config/config';

export const registerSecurityMiddlewares = (app: Express) => {
  app.use(cors({ origin: environment.frontendUrl, credentials: true }));
  app.use(helmet());
  app.use(rateLimit({
    windowMs: environment.rateLimitWindowMs,
    max: environment.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  }));
};
