import { Router } from 'express';
import * as transactionController from '../controllers/transactionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', transactionController.getTransactions);

export default router;
