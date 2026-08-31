import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware.js';
import { query } from '../config/db.js';

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Access forbidden. Administrator privileges required.',
      });
      return;
    }

    // Verify active status in database
    const users: any[] = await query('SELECT id, role, is_active FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0 || (users[0].is_active !== 1 && users[0].is_active !== true) || users[0].role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Access forbidden. Account is either inactive, demoted, or not an administrator.',
      });
      return;
    }

    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ success: false, message: 'Authorization check failed' });
  }
}
