/**
 * AI Expense & Budget Manager - Express Server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import { initDatabase, query } from './backend/config/db.js';
import authRoutes from './backend/routes/authRoutes.js';
import expenseRoutes from './backend/routes/expenseRoutes.js';
import incomeRoutes from './backend/routes/incomeRoutes.js';
import budgetRoutes from './backend/routes/budgetRoutes.js';
import transactionRoutes from './backend/routes/transactionRoutes.js';
import analyticsRoutes from './backend/routes/analyticsRoutes.js';
import aiRoutes from './backend/routes/aiRoutes.js';
import reportRoutes from './backend/routes/reportRoutes.js';
import notificationRoutes from './backend/routes/notificationRoutes.js';
import adminRoutes from './backend/routes/adminRoutes.js';
import { errorHandler } from './backend/middleware/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), app: 'AI Expense & Budget Manager' });
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

import { seedInitialData } from './backend/services/seedService.js';

// Serve Frontend Static Files
const frontendPath = path.join(process.cwd(), 'frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}

// Page route aliases for clean URLs
const pages = [
  'index',
  'login',
  'register',
  'dashboard',
  'expenses',
  'income',
  'budgets',
  'transactions',
  'analytics',
  'ai-assistant',
  'reports',
  'profile',
  'admin',
  'admin-users',
  'admin-transactions',
  'admin-analytics',
  'admin-system',
  'admin-audit',
  'admin-reports',
];

pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(frontendPath, `${page}.html`));
  });
});

// Default fallback to index.html for unknown routes
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(frontendPath, 'index.html'))) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.send('AI Expense & Budget Manager backend running.');
  }
});

// Central Error Handler
app.use(errorHandler);

// Initialize DB and start server
async function start() {
  await initDatabase();
  await seedInitialData();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AI Expense & Budget Manager running on port ${PORT}`);
  });
}

start();
