import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb, syncUserFromMongo } from '../db.js';
import { User } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pindivantalu_super_secret_jwt_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.pindi_token) {
    token = req.cookies.pindi_token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const db = getDb();
    let user = db.users.find((u) => u.id === decoded.id || u.email.toLowerCase() === decoded.email?.toLowerCase());

    if (user && user.accountStatus === 'active') {
      req.user = user;
    }
  } catch (err) {
    // Invalid or expired token
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    return;
  }
  next();
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    return;
  }

  // If role is not admin in cache, check MongoDB in case it was updated to admin
  if (req.user.role?.toLowerCase() !== 'admin') {
    try {
      const refreshed = await syncUserFromMongo(req.user.id || req.user.email);
      if (refreshed && refreshed.role?.toLowerCase() === 'admin') {
        req.user = refreshed;
      }
    } catch {
      // Fallback
    }
  }

  if (req.user.role?.toLowerCase() !== 'admin') {
    res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' });
    return;
  }

  next();
}

