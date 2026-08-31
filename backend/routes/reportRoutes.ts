import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/monthly', reportController.getMonthly);
router.get('/yearly', reportController.getYearly);
router.get('/category', reportController.getCategory);
router.get('/export/csv', reportController.exportCSV);

export default router;
