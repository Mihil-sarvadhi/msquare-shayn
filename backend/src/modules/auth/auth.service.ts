import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { User, UserSession } from '@db/models';
import { signToken } from '@utils/jwt';
import { AppError } from '@utils/appError';
import { ERROR_TYPES } from '@constant/errorTypes.constant';

const SESSION_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function login(
  email: string,
  password: string,
  ip?: string,
  userAgent?: string,
): Promise<{ token: string; user: { id: number; name: string; email: string; role: string } }> {
  const [row] = await sequelize.query<{
    id: number; name: string; email: string; password_hash: string; role: string; is_active: boolean;
  }>(
    `SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = :email LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { email: email.toLowerCase().trim() } },
  );

  if (!row || !row.is_active) {
    throw new AppError({ errorType: ERROR_TYPES.UNAUTHORIZED, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
  }

  const passwordMatch = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatch) {
    throw new AppError({ errorType: ERROR_TYPES.UNAUTHORIZED, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
  }

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const token = signToken({ sub: row.id, email: row.email, role: row.role }, '48h');
  const token_hash = hashToken(token);

  await UserSession.create({ user_id: row.id, token_hash, ip_address: ip, user_agent: userAgent, expires_at: expiresAt });

  return { token, user: { id: row.id, name: row.name, email: row.email, role: row.role } };
}

export async function logout(token: string): Promise<void> {
  const token_hash = hashToken(token);
  await UserSession.destroy({ where: { token_hash } });
}

export async function validateSession(token: string): Promise<{ id: number; email: string; role: string } | null> {
  const token_hash = hashToken(token);
  const [row] = await sequelize.query<{ user_id: number; email: string; role: string; expires_at: Date }>(
    `SELECT s.user_id, u.email, u.role, s.expires_at
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = :token_hash AND u.is_active = TRUE
     LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { token_hash } },
  );

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await UserSession.destroy({ where: { token_hash } });
    return null;
  }

  return { id: row.user_id, email: row.email, role: row.role };
}

export async function getMe(userId: number): Promise<{ id: number; name: string; email: string; role: string } | null> {
  const user = await User.findOne({ where: { id: userId, is_active: true } });
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function cleanExpiredSessions(): Promise<void> {
  await sequelize.query(`DELETE FROM user_sessions WHERE expires_at < NOW()`, { type: QueryTypes.DELETE });
}
