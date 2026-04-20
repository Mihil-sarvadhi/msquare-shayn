import type { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { environment } from '@config/config';

export const registerSecurityMiddlewares = (app: Express) => {
  const allowedOrigins = [
    environment.frontendUrl,
    'http://localhost:5000',
    'http://localhost:5001',
    'http://localhost:5002',
  ];
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: environment.rateLimitWindowMs,
      max: environment.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
};
