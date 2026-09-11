/**
 * Authentication Middleware
 * Verifies JWT token and attaches user object to request
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    name: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'ai_expense_manager_jwt_secret_key_2026';

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null) || (req.query?.token as string);

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
      name: decoded.name || 'User',
    };
    next();
  } catch (err) {
    res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token. Please log in again.',
    });
    return;
  }
}

export function generateToken(payload: { id: number; email: string; role: string; name: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
