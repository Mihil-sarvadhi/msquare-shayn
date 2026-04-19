import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

const projectRoot = process.cwd();
dotenv.config({ path: path.join(projectRoot, '.env') });

const appEnv = process.env.APP_ENV || 'local';
const flavorPath = path.join(projectRoot, `.env.${appEnv}`);
if (fs.existsSync(flavorPath)) {
  dotenv.config({ path: flavorPath, override: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'dev', 'staging', 'production']).default('local'),
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  FRONTEND_URL: z.string().default('http://localhost:5000'),
  LOG_LEVEL: z.string().default('info'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX: z.string().default('100'),
  // Shopify
  SHOPIFY_STORE_DOMAIN: z.string().min(1, 'SHOPIFY_STORE_DOMAIN is required'),
  SHOPIFY_ACCESS_TOKEN: z.string().min(1, 'SHOPIFY_ACCESS_TOKEN is required'),
  SHOPIFY_API_VERSION: z.string().default('2026-01'),
  // Meta Ads
  META_USER_TOKEN: z.string().min(1, 'META_USER_TOKEN is required'),
  META_AD_ACCOUNT_ID: z.string().min(1, 'META_AD_ACCOUNT_ID is required'),
  META_API_VERSION: z.string().default('v25.0'),
  // iThink
  ITHINK_ACCESS_TOKEN: z.string().min(1, 'ITHINK_ACCESS_TOKEN is required'),
  ITHINK_SECRET_KEY: z.string().min(1, 'ITHINK_SECRET_KEY is required'),
  ITHINK_BASE_URL: z.string().min(1, 'ITHINK_BASE_URL is required'),
  // Judge.me
  JUDGEME_API_TOKEN: z.string().optional(),
  JUDGEME_SHOP_DOMAIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration. See logs for details.');
}

const env = parsed.data;

export const environment = {
  nodeEnv: env.NODE_ENV,
  appEnv: env.APP_ENV,
  port: Number(env.PORT),
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  frontendUrl: env.FRONTEND_URL,
  logLevel: env.LOG_LEVEL,
  rateLimitWindowMs: Number(env.RATE_LIMIT_WINDOW_MS),
  rateLimitMax: Number(env.RATE_LIMIT_MAX),
  shopify: {
    storeDomain: env.SHOPIFY_STORE_DOMAIN,
    accessToken: env.SHOPIFY_ACCESS_TOKEN,
    apiVersion: env.SHOPIFY_API_VERSION,
  },
  meta: {
    userToken: env.META_USER_TOKEN,
    adAccountId: env.META_AD_ACCOUNT_ID,
    apiVersion: env.META_API_VERSION,
  },
  ithink: {
    accessToken: env.ITHINK_ACCESS_TOKEN,
    secretKey: env.ITHINK_SECRET_KEY,
    baseUrl: env.ITHINK_BASE_URL,
  },
  judgeme: {
    apiToken: env.JUDGEME_API_TOKEN,
    shopDomain: env.JUDGEME_SHOP_DOMAIN,
  },
} as const;

export type Environment = typeof environment;
