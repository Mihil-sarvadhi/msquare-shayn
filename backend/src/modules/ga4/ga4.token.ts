import fs from 'fs';
import path from 'path';
import { createPrivateKey } from 'crypto';
import { GoogleAuth } from 'google-auth-library';
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ConnectorHealth } from '@db/models';
import { environment } from '@config/config';
import { logger } from '@logger/logger';

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

interface TokenRow {
  access_token: string;
  expires_at: string;
}

function toPem(body: string): string {
  const wrapped = body.match(/.{1,64}/g)?.join('\n') ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
}

function isParseablePrivateKey(pem: string): boolean {
  try {
    createPrivateKey({ key: pem, format: 'pem' });
    return true;
  } catch {
    return false;
  }
}

function resolvePrivateKey(raw: string): string {
  const unescaped = raw.replace(/\\n/g, '\n').trim();
  const candidates: string[] = [];

  // Candidate 1: as provided (common case when env has full PEM).
  candidates.push(unescaped);

  // Candidate 2: PEM-wrap plain base64 body if markers are missing.
  if (!unescaped.includes('-----BEGIN PRIVATE KEY-----')) {
    const compact = unescaped.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(compact)) {
      candidates.push(toPem(compact));
      // Candidate 3: tolerate accidental leading "n" before MII.
      candidates.push(toPem(compact.replace(/^n(?=MII)/, '')));
    }
  }

  const valid = candidates.find((key) => isParseablePrivateKey(key));
  if (!valid) {
    throw new Error(
      'Invalid GA4 private key format. Ensure GA4_PRIVATE_KEY is full PEM with \\n newlines.',
    );
  }
  return valid;
}

/**
 * Build a GoogleAuth instance. Prefer the ga4-credentials.json file at project
 * root if present (most reliable — no env escaping issues). Fall back to env vars.
 */
function buildAuth(): GoogleAuth {
  const credentialsPath = path.resolve(process.cwd(), '../ga4-credentials.json');
  const altPath         = path.resolve(process.cwd(), 'ga4-credentials.json');

  if (fs.existsSync(credentialsPath)) {
    return new GoogleAuth({ keyFile: credentialsPath, scopes: [SCOPE] });
  }
  if (fs.existsSync(altPath)) {
    return new GoogleAuth({ keyFile: altPath, scopes: [SCOPE] });
  }

  const { type, projectId, privateKeyId, privateKey, clientEmail, clientId } =
    environment.ga4;

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error(
      'GA4 credentials not found: place ga4-credentials.json at project root or set GA4_* env vars',
    );
  }

  const resolvedPrivateKey = resolvePrivateKey(privateKey);

  return new GoogleAuth({
    credentials: {
      type,
      project_id: projectId,
      private_key_id: privateKeyId,
      private_key: resolvedPrivateKey,
      client_email: clientEmail,
      client_id: clientId,
    },
    scopes: [SCOPE],
  });
}
// tokenUri intentionally omitted — google-auth-library uses the default oauth2 endpoint

export async function generateToken(): Promise<string> {
  const auth = buildAuth();
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  if (!token) throw new Error('GA4 access token was empty');

  // 55 minutes from now (Google tokens expire in ~60 min)
  const expiresAt = new Date(Date.now() + 55 * 60 * 1000);

  await sequelize.query('DELETE FROM ga4_tokens', { type: QueryTypes.DELETE });
  await sequelize.query(
    `INSERT INTO ga4_tokens (access_token, expires_at, created_at, updated_at)
     VALUES (:token, :expiresAt, NOW(), NOW())`,
    { type: QueryTypes.INSERT, replacements: { token, expiresAt } },
  );

  return token;
}

export async function getValidToken(): Promise<string> {
  const rows = await sequelize.query<TokenRow>(
    `SELECT access_token, expires_at FROM ga4_tokens
     WHERE expires_at > NOW() + INTERVAL '10 minutes'
     ORDER BY id DESC LIMIT 1`,
    { type: QueryTypes.SELECT },
  );

  if (rows.length > 0) return rows[0].access_token;

  return generateToken();
}

export async function refreshTokenJob(): Promise<void> {
  try {
    await generateToken();
    await ConnectorHealth.update(
      { last_sync_at: new Date(), status: 'green', error_message: undefined },
      { where: { connector_name: 'ga4' } },
    );
    logger.info('[GA4] Token refreshed');
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'ga4' } },
    );
    logger.error(`[GA4] Token refresh failed: ${(err as Error).message}`);
  }
}
