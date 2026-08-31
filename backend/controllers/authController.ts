import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { generateToken, AuthRequest } from '../middleware/authMiddleware.js';
import { validateEmail, validatePassword } from '../utils/validation.js';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Full name is required' });
      return;
    }

    if (!validateEmail(email)) {
      res.status(400).json({ success: false, message: 'Please enter a valid email address' });
      return;
    }

    const passCheck = validatePassword(password);
    if (!passCheck.isValid) {
      res.status(400).json({ success: false, message: passCheck.message });
      return;
    }

    // Check duplicate email
    const existing = await query<any>('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result: any = await query(
      'INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashedPassword, 'user', 1]
    );

    const userId = result.insertId;
    const token = generateToken({
      id: userId,
      email: email.trim().toLowerCase(),
      role: 'user',
      name: name.trim(),
    });

    // Add welcome notification
    await query(
      'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
      [
        userId,
        'Welcome to AI Expense & Budget Manager!',
        'Start tracking your income, expenses, and create smart budgets to unlock AI insights.',
        'info',
        0,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: userId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'user',
        },
      },
    });
  } catch (err: any) {
    console.error('Registration Error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete registration' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const users = await query<any>('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (users.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const user = users[0];
    if (user.is_active === 0 || user.is_active === false) {
      res.status(403).json({ success: false, message: 'Account is deactivated or suspended. Please contact an administrator.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      name: user.name,
    });

    // Log admin login to audit logs
    if (user.role === 'admin') {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      try {
        await query(
          'INSERT INTO audit_logs (admin_id, admin_name, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
          [user.id, user.name, 'ADMIN_LOGIN', 'Admin Console', 'Administrator authenticated successfully', ip]
        );
      } catch (logErr) {
        console.error('Failed to write audit log:', logErr);
      }
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err: any) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Failed to process login' });
  }
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const users = await query<any>('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      res.status(404).json({ success: false, message: 'User profile not found' });
      return;
    }

    const user = users[0];

    // Fetch user counts & sums
    const expenses = await query<any>('SELECT amount FROM expenses WHERE user_id = ?', [userId]);
    const income = await query<any>('SELECT amount FROM income WHERE user_id = ?', [userId]);
    const budgets = await query<any>('SELECT id FROM budgets WHERE user_id = ?', [userId]);

    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalIncome = income.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

    const stats = {
      expensesCount: expenses.length,
      incomeCount: income.length,
      budgetsCount: budgets.length,
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      balance: Number((totalIncome - totalExpenses).toFixed(2)),
    };

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        },
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        stats,
      },
    });
  } catch (err: any) {
    console.error('getProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve profile' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, email } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }

    if (!validateEmail(email)) {
      res.status(400).json({ success: false, message: 'Valid email is required' });
      return;
    }

    // Check duplicate email
    const duplicate = await query<any>(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email.trim().toLowerCase(), userId]
    );

    if (duplicate.length > 0) {
      res.status(409).json({ success: false, message: 'Email is already in use by another account' });
      return;
    }

    await query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name.trim(), email.trim().toLowerCase(), userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current password and new password are required' });
      return;
    }

    const passCheck = validatePassword(newPassword);
    if (!passCheck.isValid) {
      res.status(400).json({ success: false, message: passCheck.message });
      return;
    }

    const users = await query<any>('SELECT password FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Incorrect current password' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
}
