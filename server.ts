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

import { generateDynamicDemoData } from './backend/services/demoService.js';
import { generateRevaFinancialData } from './backend/services/revaDataGenerator.js';

// Seed initial demo data & admin if database is fresh
async function seedInitialData() {
  try {
    const adminCheck: any[] = await query('SELECT id, is_active, role FROM users WHERE email = ?', ['admin@ledgerai.com']);
    const adminPass = await bcrypt.hash('Admin@123', 10);
    if (adminCheck.length === 0) {
      console.log('👑 Seeding system administrator account...');
      await query(
        'INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
        ['System Administrator', 'admin@ledgerai.com', adminPass, 'admin', 1]
      );
      console.log('✅ Admin account seeded: admin@ledgerai.com / Admin@123');
    } else {
      await query(
        'UPDATE users SET password = ?, role = "admin", is_active = 1 WHERE email = ?',
        [adminPass, 'admin@ledgerai.com']
      );
      console.log('✅ Admin account credentials verified and active: admin@ledgerai.com / Admin@123');
    }

    const users = await query('SELECT id FROM users WHERE email = ?', ['demo@example.com']);
    const hashedPassword = await bcrypt.hash('Demo@123', 10);
    if (users.length === 0) {
      console.log('🌱 Seeding initial demo account and dynamic multi-category financial records...');
      const userRes: any = await query(
        'INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
        ['Alex', 'demo@example.com', hashedPassword, 'user', 1]
      );
      const userId = userRes.insertId;

      await generateDynamicDemoData(userId, { clearExisting: false });

      console.log('✅ Demo account & dynamic dataset seeded successfully: demo@example.com / Demo@123');
    } else {
      await query('UPDATE users SET name = ?, password = ?, is_active = 1 WHERE email = ?', ['Alex', hashedPassword, 'demo@example.com']);
    }

    // Seed or populate Reva's account with a unique creative design dataset
    const revaCheck: any[] = await query('SELECT id FROM users WHERE email = ?', ['reva@example.com']);
    const revaHashedPassword = await bcrypt.hash('Reva@123', 10);
    let revaUserId: number;

    if (revaCheck.length === 0) {
      console.log('🎨 Seeding Reva account and creative studio financial records...');
      const revaRes: any = await query(
        'INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
        ['Reva', 'reva@example.com', revaHashedPassword, 'user', 1]
      );
      revaUserId = revaRes.insertId;
    } else {
      revaUserId = revaCheck[0].id;
      await query('UPDATE users SET name = ?, password = ?, is_active = 1 WHERE email = ?', ['Reva', revaHashedPassword, 'reva@example.com']);
    }

    // Check if Reva already has expenses populated; if not, generate her distinct dataset
    const revaExpenses: any[] = await query('SELECT id FROM expenses WHERE user_id = ? LIMIT 1', [revaUserId]);
    if (revaExpenses.length === 0) {
      await generateRevaFinancialData(revaUserId, { clearExisting: true });
      console.log('✅ Reva account populated with unique creative studio financial data!');
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

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
