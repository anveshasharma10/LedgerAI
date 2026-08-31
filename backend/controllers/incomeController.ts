import { Response } from 'express';
import { query } from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { validateAmount, validateDate, validateIncomeSource } from '../utils/validation.js';

export async function createIncome(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { amount, source, description, income_date } = req.body;

    const amountCheck = validateAmount(amount);
    if (!amountCheck.isValid) {
      res.status(400).json({ success: false, message: amountCheck.message });
      return;
    }

    if (!description || !description.trim()) {
      res.status(400).json({ success: false, message: 'Description is required' });
      return;
    }

    if (!validateIncomeSource(source)) {
      res.status(400).json({ success: false, message: 'Invalid income source' });
      return;
    }

    if (!validateDate(income_date)) {
      res.status(400).json({ success: false, message: 'Valid income date is required (YYYY-MM-DD)' });
      return;
    }

    const result: any = await query(
      'INSERT INTO income (user_id, amount, source, description, income_date) VALUES (?, ?, ?, ?, ?)',
      [userId, amountCheck.parsed, source, description.trim(), income_date]
    );

    res.status(201).json({
      success: true,
      message: 'Income record added successfully',
      data: {
        id: result.insertId,
        user_id: userId,
        amount: amountCheck.parsed,
        source,
        description: description.trim(),
        income_date,
      },
    });
  } catch (err: any) {
    console.error('Create Income Error:', err);
    res.status(500).json({ success: false, message: 'Failed to add income' });
  }
}

export async function getIncome(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { search, source, startDate, endDate, page = '1', limit = '10', sortBy = 'income_date', sortOrder = 'desc' } = req.query;

    let sql = 'SELECT * FROM income WHERE user_id = ?';
    const params: any[] = [userId];

    if (search && typeof search === 'string' && search.trim()) {
      sql += ' AND description LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    if (source && typeof source === 'string' && source !== 'All') {
      sql += ' AND source = ?';
      params.push(source);
    }

    if (startDate && typeof startDate === 'string') {
      sql += ' AND income_date >= ?';
      params.push(startDate);
    }

    if (endDate && typeof endDate === 'string') {
      sql += ' AND income_date <= ?';
      params.push(endDate);
    }

    const allMatching = await query<any>(sql, params);
    const totalRecords = allMatching.length;
    const totalAmount = allMatching.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);

    const validSortCols: { [key: string]: string } = {
      income_date: 'income_date',
      amount: 'amount',
      source: 'source',
      description: 'description',
    };
    const orderCol = validSortCols[String(sortBy)] || 'income_date';
    const orderDir = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${orderCol} ${orderDir}`;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const income = await query<any>(sql, params);

    res.json({
      success: true,
      data: {
        income,
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
    console.error('Get Income Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve income' });
  }
}

export async function getIncomeById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const incomeId = parseInt(req.params.id, 10);

    const income = await query<any>(
      'SELECT * FROM income WHERE id = ? AND user_id = ?',
      [incomeId, userId]
    );

    if (income.length === 0) {
      res.status(404).json({ success: false, message: 'Income record not found' });
      return;
    }

    res.json({
      success: true,
      data: income[0],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get income' });
  }
}

export async function updateIncome(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const incomeId = parseInt(req.params.id, 10);
    const { amount, source, description, income_date } = req.body;

    const existing = await query<any>(
      'SELECT id FROM income WHERE id = ? AND user_id = ?',
      [incomeId, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Income record not found or unauthorized' });
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

    if (!validateIncomeSource(source)) {
      res.status(400).json({ success: false, message: 'Invalid income source' });
      return;
    }

    if (!validateDate(income_date)) {
      res.status(400).json({ success: false, message: 'Valid income date is required' });
      return;
    }

    await query(
      'UPDATE income SET amount = ?, source = ?, description = ?, income_date = ? WHERE id = ? AND user_id = ?',
      [amountCheck.parsed, source, description.trim(), income_date, incomeId, userId]
    );

    res.json({
      success: true,
      message: 'Income record updated successfully',
      data: {
        id: incomeId,
        amount: amountCheck.parsed,
        source,
        description: description.trim(),
        income_date,
      },
    });
  } catch (err: any) {
    console.error('Update Income Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update income' });
  }
}

export async function deleteIncome(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const incomeId = parseInt(req.params.id, 10);

    const existing = await query<any>(
      'SELECT id FROM income WHERE id = ? AND user_id = ?',
      [incomeId, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'Income record not found or unauthorized' });
      return;
    }

    await query('DELETE FROM income WHERE id = ? AND user_id = ?', [incomeId, userId]);

    res.json({
      success: true,
      message: 'Income record deleted successfully',
      data: { id: incomeId },
    });
  } catch (err: any) {
    console.error('Delete Income Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete income' });
  }
}
