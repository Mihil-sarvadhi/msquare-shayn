import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '@utils/jwt';
import { validateSession } from '@modules/auth/auth.service';

const COOKIE_NAME = 'shayn_token';

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return (req.cookies?.[COOKIE_NAME] as string | undefined) ?? null;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ success: false, message: 'Unauthorized', code: 'NO_TOKEN' });
      return;
    }

    verifyToken(token);

    const session = await validateSession(token);
    if (!session) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      res.status(401).json({ success: false, message: 'Session expired', code: 'SESSION_EXPIRED' });
      return;
    }

    req.user = { id: session.id, email: session.email, role: session.role };
    next();
  } catch {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.status(401).json({ success: false, message: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
};

export const authorizeByRole =
  (role: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }
    next();
  };

export const authorizeByAnyRole =
  (roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }
    next();
  };
