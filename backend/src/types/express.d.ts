declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: number;
      email: string;
      role: string;
    }
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
export {};
