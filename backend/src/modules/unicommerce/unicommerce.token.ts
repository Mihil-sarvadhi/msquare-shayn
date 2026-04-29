import axios from 'axios';
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ConnectorHealth } from '@db/models';
import { AppError } from '@utils/appError';
import { ERROR_TYPES } from '@constant/errorTypes.constant';
import { logger } from '@logger/logger';

interface TokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
}

const REFRESH_BUFFER_MS = 60 * 1000; // refresh 1 minute before actual expiry
const STALE_BUFFER_INTERVAL = "INTERVAL '10 minutes'";

function baseUrl(): string {
  const url = process.env.UNICOMMERCE_BASE_URL;
  if (!url) {
    throw new AppError({
      errorType: ERROR_TYPES.INTERNAL_ERROR,
      message: 'UNICOMMERCE_BASE_URL not set',
      code: 'UNICOMMERCE_CONFIG_MISSING',
    });
  }
  return url;
}

function clientId(): string {
  return process.env.UNICOMMERCE_CLIENT_ID ?? 'my-trusted-client';
}

async function persistToken(payload: OAuthTokenResponse): Promise<string> {
  const expiresAt = new Date(Date.now() + payload.expires_in * 1000 - REFRESH_BUFFER_MS);
  await sequelize.query('DELETE FROM unicommerce_tokens', { type: QueryTypes.DELETE });
  await sequelize.query(
    `INSERT INTO unicommerce_tokens (access_token, refresh_token, expires_at, created_at)
     VALUES (:accessToken, :refreshToken, :expiresAt, NOW())`,
    {
      type: QueryTypes.INSERT,
      replacements: {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresAt,
      },
    },
  );
  return payload.access_token;
}

export async function generateToken(): Promise<string> {
  const username = process.env.UNICOMMERCE_USERNAME;
  const password = process.env.UNICOMMERCE_PASSWORD;
  if (!username || !password) {
    throw new AppError({
      errorType: ERROR_TYPES.INTERNAL_ERROR,
      message: 'UNICOMMERCE_USERNAME / UNICOMMERCE_PASSWORD not set',
      code: 'UNICOMMERCE_CONFIG_MISSING',
    });
  }

  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId(),
    username,
    password,
  });

  const res = await axios.post<OAuthTokenResponse>(`${baseUrl()}/oauth/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
  });

  logger.info('[Unicommerce] Token generated successfully');
  return persistToken(res.data);
}

export async function refreshToken(): Promise<string> {
  const rows = await sequelize.query<TokenRow>(
    `SELECT access_token, refresh_token, expires_at::text
     FROM unicommerce_tokens
     ORDER BY id DESC LIMIT 1`,
    { type: QueryTypes.SELECT },
  );
  if (!rows.length) return generateToken();

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId(),
    refresh_token: rows[0].refresh_token,
  });

  try {
    const res = await axios.post<OAuthTokenResponse>(
      `${baseUrl()}/oauth/token`,
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000,
      },
    );
    logger.info('[Unicommerce] Token refreshed successfully');
    return persistToken(res.data);
  } catch (err) {
    logger.warn(`[Unicommerce] Refresh failed, regenerating: ${(err as Error).message}`);
    return generateToken();
  }
}

export async function getValidToken(): Promise<string> {
  const rows = await sequelize.query<TokenRow>(
    `SELECT access_token, refresh_token, expires_at::text
     FROM unicommerce_tokens
     WHERE expires_at > NOW() + ${STALE_BUFFER_INTERVAL}
     ORDER BY id DESC LIMIT 1`,
    { type: QueryTypes.SELECT },
  );
  if (rows.length) return rows[0].access_token;

  const allRows = await sequelize.query<TokenRow>(
    `SELECT access_token, refresh_token, expires_at::text
     FROM unicommerce_tokens
     ORDER BY id DESC LIMIT 1`,
    { type: QueryTypes.SELECT },
  );
  if (allRows.length) return refreshToken();

  return generateToken();
}

export async function refreshTokenJob(): Promise<void> {
  try {
    await refreshToken();
    await ConnectorHealth.update(
      { last_sync_at: new Date(), status: 'green', error_message: undefined },
      { where: { connector_name: 'unicommerce' } },
    );
    logger.info('[Unicommerce] Token refresh job complete');
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'unicommerce' } },
    );
    logger.error(`[Unicommerce] Token refresh failed: ${(err as Error).message}`);
  }
}
