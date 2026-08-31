import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/categorize-expense', aiController.categorizeExpense);
router.get('/insights', aiController.getInsights);
router.post('/analyze-spending', aiController.analyzeSpending);
router.post('/budget-recommendation', aiController.getBudgetRecommendation);
router.post('/chat', aiController.chat);

export default router;
