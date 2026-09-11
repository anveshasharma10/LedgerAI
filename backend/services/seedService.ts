import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { generateDynamicDemoData } from './demoService.js';
import { generateRevaFinancialData } from './revaDataGenerator.js';
import { ensureUserBudgetsForPeriod } from './budgetService.js';

export async function seedInitialData() {
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

    // Check if Reva or Alex need active dataset generation for the current period
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const curMonthStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    const alexUser: any[] = await query('SELECT id FROM users WHERE email = ?', ['demo@example.com']);
    if (alexUser.length > 0) {
      const alexId = alexUser[0].id;
      const alexCurrentExp: any[] = await query(
        'SELECT id FROM expenses WHERE user_id = ? AND expense_date LIKE ? LIMIT 1',
        [alexId, `${curMonthStr}%`]
      );
      if (alexCurrentExp.length === 0) {
        console.log('🔄 Populating Alex demo financial data with active current-month records...');
        await generateDynamicDemoData(alexId, { clearExisting: true });
      }
      await ensureUserBudgetsForPeriod(alexId, curMonth, curYear);
    }

    if (revaUserId) {
      const revaCurrentExp: any[] = await query(
        'SELECT id FROM expenses WHERE user_id = ? AND expense_date LIKE ? LIMIT 1',
        [revaUserId, `${curMonthStr}%`]
      );
      if (revaCurrentExp.length === 0) {
        console.log('🔄 Populating Reva creative studio financial data with active current-month records...');
        await generateRevaFinancialData(revaUserId, { clearExisting: true });
      }
      await ensureUserBudgetsForPeriod(revaUserId, curMonth, curYear);
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}
