import express from 'express';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import { END_POINTS } from '@constant';
import { ErrorHandler, registerSecurityMiddlewares, responseHandler } from '@middleware';
import { router as rootRouter } from '@routes/index';

export const createApp = (): Express => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  registerSecurityMiddlewares(app);
  app.use(responseHandler);

  app.use(END_POINTS.COMMON, rootRouter);

  // Webhook route (raw body needed for HMAC verification)
  // Registered in routes/index.ts with express.raw middleware

  app.use(ErrorHandler);

  return app;
};
