import { Response } from 'express';
import { query } from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const notifications = await query<any>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [userId]
    );

    const unreadCount = notifications.filter(n => !n.is_read || n.is_read === 0).length;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err: any) {
    console.error('Get Notifications Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications' });
  }
}

export async function markAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id, 10);

    await query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    await query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
}

export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id, 10);

    await query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
}
