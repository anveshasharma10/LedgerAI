import { Response } from 'express';
import { query } from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { validateAmount, validateCategory } from '../utils/validation.js';
import { getBudgetStatus } from '../utils/helpers.js';

export async function createBudget(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { category, amount, month, year } = req.body;

    const amountCheck = validateAmount(amount);
    if (!amountCheck.isValid) {
      res.status(400).json({ success: false, message: amountCheck.message });
      return;
    }

    if (!validateCategory(category)) {
      res.status(400).json({ success: false, message: 'Invalid budget category' });
      return;
    }

    const monthNum = parseInt(String(month), 10);
    const yearNum = parseInt(String(year), 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      res.status(400).json({ success: false, message: 'Month must be between 1 and 12' });
      return;
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      res.status(400).json({ success: false, message: 'Valid year is required' });
      return;
    }

    // Check duplicate budget (same user + same category + same month + same year)
    const duplicate = await query<any>(
      'SELECT id FROM budgets WHERE user_id = ? AND category = ? AND month = ? AND year = ?',
      [userId, category, monthNum, yearNum]
    );

    if (duplicate.length > 0) {
      res.status(409).json({
        success: false,
        message: `A budget for ${category} already exists for ${monthNum}/${yearNum}. You can edit the existing budget.`,
      });
      return;
    }

    const result: any = await query(
      'INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)',
      [userId, category, amountCheck.parsed, monthNum, yearNum]
    );

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: {
        id: result.insertId,
        user_id: userId,
        category,
        amount: amountCheck.parsed,
        month: monthNum,
        year: yearNum,
      },
    });
  } catch (err: any) {
    console.error('Create Budget Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create budget' });
  }
}

export async function getBudgets(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const month = req.query.month ? parseInt(String(req.query.month), 10) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : now.getFullYear();

    const budgets = await query<any>(
      'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ? ORDER BY category ASC',
      [userId, month, year]
    );

    // Calculate spent amount for each category in the requested month/year
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const expenses = await query<any>(
      'SELECT category, amount FROM expenses WHERE user_id = ? AND expense_date LIKE ?',
      [userId, `${monthStr}%`]
    );

    const categorySpent: { [cat: string]: number } = {};
    expenses.forEach(e => {
      categorySpent[e.category] = (categorySpent[e.category] || 0) + (parseFloat(e.amount) || 0);
    });

    let totalBudget = 0;
    let totalSpent = 0;

    const enrichedBudgets = budgets.map(b => {
      const budgetAmount = parseFloat(b.amount) || 0;
      const spent = categorySpent[b.category] || 0;
      const remaining = budgetAmount - spent;
      const usage = budgetAmount > 0 ? Number(((spent / budgetAmount) * 100).toFixed(1)) : 0;
      const { status, color } = getBudgetStatus(usage);

      totalBudget += budgetAmount;
      totalSpent += spent;

      return {
        id: b.id,
        category: b.category,
        amount: budgetAmount,
        spent: Number(spent.toFixed(2)),
        remaining: Number(remaining.toFixed(2)),
        usage,
        status,
        color,
        month: b.month,
        year: b.year,
      };
    });

    res.json({
      success: true,
      data: {
        period: { month, year },
        totalBudget: Number(totalBudget.toFixed(2)),
        totalSpent: Number(totalSpent.toFixed(2)),
        totalRemaining: Number((totalBudget - totalSpent).toFixed(2)),
        overallUsage: totalBudget > 0 ? Number(((totalSpent / totalBudget) * 100).toFixed(1)) : 0,
        budgets: enrichedBudgets,
      },
    });
  } catch (err: any) {
    console.error('Get Budgets Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve budgets' });
  }
}

export async function getBudgetById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const budgetId = parseInt(req.params.id, 10);

    const budgets = await query<any>(
      'SELECT * FROM budgets WHERE id = ? AND user_id = ?',
      [budgetId, userId]
    );

    if (budgets.length === 0) {
      res.status(404).json({ success: false, message: 'Budget not found' });
      return;
    }

    res.json({
      success: true,
      data: budgets[0],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get budget' });
  }
}

export async function updateBudget(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const budgetId = parseInt(req.params.id, 10);
    const { amount, category, month, year } = req.body;

    const existing = await query<any>(
      'SELECT * FROM budgets WHERE id = ? AND user_id = ?',
      [budgetId, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Budget not found or unauthorized' });
      return;
    }

    const amountCheck = validateAmount(amount);
    if (!amountCheck.isValid) {
      res.status(400).json({ success: false, message: amountCheck.message });
      return;
    }

    const targetCategory = category || existing[0].category;
    const targetMonth = month ? parseInt(String(month), 10) : existing[0].month;
    const targetYear = year ? parseInt(String(year), 10) : existing[0].year;

    // Check duplicate
    const duplicate = await query<any>(
      'SELECT id FROM budgets WHERE user_id = ? AND category = ? AND month = ? AND year = ? AND id != ?',
      [userId, targetCategory, targetMonth, targetYear, budgetId]
    );

    if (duplicate.length > 0) {
      res.status(409).json({
        success: false,
        message: `A budget for ${targetCategory} already exists for ${targetMonth}/${targetYear}`,
      });
      return;
    }

    await query(
      'UPDATE budgets SET amount = ?, category = ?, month = ?, year = ? WHERE id = ? AND user_id = ?',
      [amountCheck.parsed, targetCategory, targetMonth, targetYear, budgetId, userId]
    );

    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: {
        id: budgetId,
        category: targetCategory,
        amount: amountCheck.parsed,
        month: targetMonth,
        year: targetYear,
      },
    });
  } catch (err: any) {
    console.error('Update Budget Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update budget' });
  }
}

export async function deleteBudget(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const budgetId = parseInt(req.params.id, 10);

    const existing = await query<any>(
      'SELECT id FROM budgets WHERE id = ? AND user_id = ?',
      [budgetId, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Budget not found or unauthorized' });
      return;
    }

    await query('DELETE FROM budgets WHERE id = ? AND user_id = ?', [budgetId, userId]);

    res.json({
      success: true,
      message: 'Budget deleted successfully',
      data: { id: budgetId },
    });
  } catch (err: any) {
    console.error('Delete Budget Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete budget' });
  }
}
