import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/summary', analyticsController.getSummary);
router.get('/monthly', analyticsController.getMonthly);
router.get('/categories', analyticsController.getCategories);
router.get('/budget-status', analyticsController.getBudgetStatus);
router.get('/savings', analyticsController.getSavings);

export default router;
