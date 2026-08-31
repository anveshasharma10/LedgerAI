import { Router } from 'express';
import * as expenseController from '../controllers/expenseController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// All expense routes require authentication
router.use(authenticateToken);

router.post('/', expenseController.createExpense);
router.post('/seed-demo', expenseController.seedDynamicDemoData);
router.get('/', expenseController.getExpenses);
router.get('/:id', expenseController.getExpenseById);
router.put('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

export default router;
