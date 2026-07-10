import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { publicKey } from '../config/jwt';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

/**
 * Require valid JWT access token in the Authorization header
 */
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Token missing.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as {
      id: string;
      email: string;
      role: Role;
    };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (error: any) {
    console.error('JWT verification error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired access token.' });
  }
};

/**
 * Require the authenticated user to have one of the specified roles
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};
