import { Router } from 'express';
import * as incomeController from '../controllers/incomeController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// All income routes require authentication
router.use(authenticateToken);

router.post('/', incomeController.createIncome);
router.get('/', incomeController.getIncome);
router.get('/:id', incomeController.getIncomeById);
router.put('/:id', incomeController.updateIncome);
router.delete('/:id', incomeController.deleteIncome);

export default router;
