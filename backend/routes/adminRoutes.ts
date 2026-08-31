import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import * as adminController from '../controllers/adminController.js';

const router = Router();

// Apply auth & admin guard to all admin routes
router.use(authenticateToken, requireAdmin);

router.get('/dashboard', adminController.getDashboardOverview);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/role', adminController.updateUserRole);
router.get('/transactions', adminController.getTransactions);
router.get('/analytics', adminController.getAnalytics);
router.get('/system-health', adminController.getSystemHealth);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/reports', adminController.getReports);

export default router;
