const required: string[] = [
  'DATABASE_URL',
  'SHOPIFY_STORE_DOMAIN',
  'SHOPIFY_ACCESS_TOKEN',
  'SHOPIFY_API_VERSION',
  'META_USER_TOKEN',
  'META_AD_ACCOUNT_ID',
  'META_API_VERSION',
  'ITHINK_ACCESS_TOKEN',
  'ITHINK_SECRET_KEY',
  'ITHINK_BASE_URL',
];

export function validateEnv(): void {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
