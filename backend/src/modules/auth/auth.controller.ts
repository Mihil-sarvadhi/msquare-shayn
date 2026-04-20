import type { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import * as service from './auth.service';

const COOKIE_NAME = 'shayn_token';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 48 * 60 * 60 * 1000,
  path: '/',
};

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const ip = req.ip ?? req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const { token, user } = await service.login(email, password, ip, userAgent);

    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    // Return token in body so frontend can store it in memory for Bearer auth
    handleApiResponse(res, { data: { user, token } });
  } catch (err) {
    handleErrorResponse(res, {
      statusCode: 401,
      message: err instanceof Error ? err.message : 'Login failed',
      error: err,
    });
  }
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (token) await service.logout(token);
    res.clearCookie(COOKIE_NAME, { path: '/' });
    handleApiResponse(res, { data: { message: 'Logged out' } });
  } catch (err) {
    handleErrorResponse(res, { statusCode: 500, message: 'Logout failed', error: err });
  }
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const user = await service.getMe(userId);
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }
    // Return the current token so frontend can re-hydrate Bearer memory after a page refresh
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    handleApiResponse(res, { data: { user, token } });
  } catch (err) {
    handleErrorResponse(res, { statusCode: 500, message: 'Failed to fetch user', error: err });
  }
}
