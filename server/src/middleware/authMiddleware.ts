import { NextFunction, Request, Response } from 'express';
import { getUserById, verifyAuthToken } from '../services/authService.js';
import { PublicUser } from '../types/domain.js';

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    const claims = verifyAuthToken(token);
    const user = getUserById(claims.userId);
    if (!user) {
      res.status(401).json({ error: 'User session no longer valid.' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}
