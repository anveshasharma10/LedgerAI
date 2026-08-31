import { Response } from 'express';
import { query } from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { validateAmount, validateCategory, validateDate, validatePaymentMethod } from '../utils/validation.js';

export async function createExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { amount, category, description, expense_date, payment_method, notes } = req.body;

    const amountCheck = validateAmount(amount);
    if (!amountCheck.isValid) {
      res.status(400).json({ success: false, message: amountCheck.message });
      return;
    }

    if (!description || !description.trim()) {
      res.status(400).json({ success: false, message: 'Description is required' });
      return;
    }

    if (!validateCategory(category)) {
      res.status(400).json({ success: false, message: 'Invalid category specified' });
      return;
    }

    if (!validateDate(expense_date)) {
      res.status(400).json({ success: false, message: 'Valid expense date is required (YYYY-MM-DD)' });
      return;
    }

    if (!validatePaymentMethod(payment_method)) {
      res.status(400).json({ success: false, message: 'Invalid payment method' });
      return;
    }

    const result: any = await query(
      `INSERT INTO expenses (user_id, amount, category, description, expense_date, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        amountCheck.parsed,
        category,
        description.trim(),
        expense_date,
        payment_method,
        notes ? notes.trim() : null,
      ]
    );

    const newExpenseId = result.insertId;

    // Check budget thresholds and auto-create notification
    const dateObj = new Date(expense_date);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const budgets = await query<any>(
      'SELECT amount FROM budgets WHERE user_id = ? AND category = ? AND month = ? AND year = ?',
      [userId, category, month, year]
    );

    if (budgets.length > 0) {
      const budgetAmount = parseFloat(budgets[0].amount) || 0;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      
      const totalMonthExp = await query<any>(
        'SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND category = ? AND expense_date LIKE ?',
        [userId, category, `${monthStr}%`]
      );
      const totalSpent = parseFloat(totalMonthExp[0]?.total as any) || 0;
      const usage = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

      if (usage >= 100) {
        await query(
          'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
          [
            userId,
            `🚨 ${category} Budget Exceeded!`,
            `You have spent ₹${totalSpent.toLocaleString()} on ${category}, exceeding your monthly budget of ₹${budgetAmount.toLocaleString()} (${Math.round(usage)}%).`,
            'danger',
            0,
          ]
        );
      } else if (usage >= 90) {
        await query(
          'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
          [
            userId,
            `⚠️ ${category} Budget at ${Math.round(usage)}%`,
            `Critical alert: You have reached ${Math.round(usage)}% of your ${category} budget (₹${totalSpent.toLocaleString()} of ₹${budgetAmount.toLocaleString()}).`,
            'warning',
            0,
          ]
        );
      } else if (usage >= 70) {
        await query(
          'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
          [
            userId,
            `ℹ️ ${category} Budget Reached 70%`,
            `Notice: You have used ${Math.round(usage)}% of your ${category} budget for this month.`,
            'info',
            0,
          ]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      data: {
        id: newExpenseId,
        user_id: userId,
        amount: amountCheck.parsed,
        category,
        description: description.trim(),
        expense_date,
        payment_method,
        notes: notes ? notes.trim() : null,
      },
    });
  } catch (err: any) {
    console.error('Create Expense Error:', err);
    res.status(500).json({ success: false, message: 'Failed to add expense' });
  }
}

export async function getExpenses(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { search, category, payment_method, startDate, endDate, page = '1', limit = '10', sortBy = 'expense_date', sortOrder = 'desc' } = req.query;

    let sql = 'SELECT * FROM expenses WHERE user_id = ?';
    const params: any[] = [userId];

    if (search && typeof search === 'string' && search.trim()) {
      sql += ' AND (description LIKE ? OR notes LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category && typeof category === 'string' && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (payment_method && typeof payment_method === 'string' && payment_method !== 'All') {
      sql += ' AND payment_method = ?';
      params.push(payment_method);
    }

    if (startDate && typeof startDate === 'string') {
      sql += ' AND expense_date >= ?';
      params.push(startDate);
    }

    if (endDate && typeof endDate === 'string') {
      sql += ' AND expense_date <= ?';
      params.push(endDate);
    }

    // Total count for pagination
    const allMatching = await query<any>(sql, params);
    const totalRecords = allMatching.length;
    const totalAmount = allMatching.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);

    const validSortCols: { [key: string]: string } = {
      expense_date: 'expense_date',
      amount: 'amount',
      category: 'category',
      description: 'description',
    };
    const orderCol = validSortCols[String(sortBy)] || 'expense_date';
    const orderDir = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${orderCol} ${orderDir}`;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const expenses = await query<any>(sql, params);

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalRecords / limitNum) || 1,
          totalRecords,
          limit: limitNum,
          totalAmount: Number(totalAmount.toFixed(2)),
        },
      },
    });
  } catch (err: any) {
    console.error('Get Expenses Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve expenses' });
  }
}

export async function getExpenseById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const expenseId = parseInt(req.params.id, 10);

    const expenses = await query<any>(
      'SELECT * FROM expenses WHERE id = ? AND user_id = ?',
      [expenseId, userId]
    );

    if (expenses.length === 0) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    res.json({
      success: true,
      data: expenses[0],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get expense' });
  }
}

export async function updateExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const expenseId = parseInt(req.params.id, 10);
    const { amount, category, description, expense_date, payment_method, notes } = req.body;

    const existing = await query<any>(
      'SELECT id FROM expenses WHERE id = ? AND user_id = ?',
      [expenseId, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Expense not found or unauthorized' });
      return;
    }

    const amountCheck = validateAmount(amount);
    if (!amountCheck.isValid) {
      res.status(400).json({ success: false, message: amountCheck.message });
      return;
    }

    if (!description || !description.trim()) {
      res.status(400).json({ success: false, message: 'Description is required' });
      return;
    }

    if (!validateCategory(category)) {
      res.status(400).json({ success: false, message: 'Invalid category' });
      return;
    }

    if (!validateDate(expense_date)) {
      res.status(400).json({ success: false, message: 'Valid expense date is required' });
      return;
    }

    if (!validatePaymentMethod(payment_method)) {
      res.status(400).json({ success: false, message: 'Invalid payment method' });
      return;
    }

    await query(
      `UPDATE expenses 
       SET amount = ?, category = ?, description = ?, expense_date = ?, payment_method = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [
        amountCheck.parsed,
        category,
        description.trim(),
        expense_date,
        payment_method,
        notes ? notes.trim() : null,
        expenseId,
        userId,
      ]
    );

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: {
        id: expenseId,
        amount: amountCheck.parsed,
        category,
        description: description.trim(),
        expense_date,
        payment_method,
        notes: notes ? notes.trim() : null,
      },
    });
  } catch (err: any) {
    console.error('Update Expense Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
}

export async function deleteExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const expenseId = parseInt(req.params.id, 10);

    const existing = await query<any>(
      'SELECT id FROM expenses WHERE id = ? AND user_id = ?',
      [expenseId, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Expense not found or unauthorized' });
      return;
    }

    await query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [expenseId, userId]);

    res.json({
      success: true,
      message: 'Expense deleted successfully',
      data: { id: expenseId },
    });
  } catch (err: any) {
    console.error('Delete Expense Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
}

export async function seedDynamicDemoData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { clearExisting } = req.body;
    const { generateDynamicDemoData } = await import('../services/demoService.js');
    
    const result = await generateDynamicDemoData(userId, { clearExisting: clearExisting !== false });

    res.json({
      success: true,
      message: `Successfully generated dynamic financial records: ${result.expenseCount} multi-category expenses and ${result.incomeCount} incomes.`,
      data: result,
    });
  } catch (err: any) {
    console.error('Seed Demo Data Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate dynamic demo data' });
  }
}

