import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from '../backend/config/db.js';
import { seedInitialData } from '../backend/services/seedService.js';
import authRoutes from '../backend/routes/authRoutes.js';
import expenseRoutes from '../backend/routes/expenseRoutes.js';
import incomeRoutes from '../backend/routes/incomeRoutes.js';
import budgetRoutes from '../backend/routes/budgetRoutes.js';
import transactionRoutes from '../backend/routes/transactionRoutes.js';
import analyticsRoutes from '../backend/routes/analyticsRoutes.js';
import aiRoutes from '../backend/routes/aiRoutes.js';
import reportRoutes from '../backend/routes/reportRoutes.js';
import notificationRoutes from '../backend/routes/notificationRoutes.js';
import adminRoutes from '../backend/routes/adminRoutes.js';
import { errorHandler } from '../backend/middleware/errorMiddleware.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure DB is initialized
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      await seedInitialData();
      dbInitialized = true;
    } catch (e) {
      console.error('Vercel DB Init Error:', e);
    }
  }
  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'vercel-serverless', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

export default app;
