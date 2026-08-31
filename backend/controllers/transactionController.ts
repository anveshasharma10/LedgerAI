import { Response } from 'express';
import { query } from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export async function getTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const {
      search,
      type = 'All', // 'All', 'Income', 'Expense'
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'date', // 'date', 'amount', 'type', 'description'
      sortOrder = 'desc',
      page = '1',
      limit = '10',
    } = req.query;

    // 1. Fetch Expenses
    let rawExpenses: any[] = [];
    if (type === 'All' || type === 'Expense') {
      rawExpenses = await query<any>('SELECT * FROM expenses WHERE user_id = ?', [userId]);
    }

    // 2. Fetch Income
    let rawIncome: any[] = [];
    if (type === 'All' || type === 'Income') {
      rawIncome = await query<any>('SELECT * FROM income WHERE user_id = ?', [userId]);
    }

    const expenses = rawExpenses.map(e => ({
      id: e.id,
      type: 'Expense',
      amount: parseFloat(e.amount) || 0,
      category: e.category || 'Other',
      description: e.description || 'Expense',
      date: e.expense_date || (e.created_at ? e.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      payment_method: e.payment_method || 'UPI',
      notes: e.notes || '',
      created_at: e.created_at,
    }));

    const income = rawIncome.map(i => ({
      id: i.id,
      type: 'Income',
      amount: parseFloat(i.amount) || 0,
      category: i.source || 'Other',
      description: i.description || i.source || 'Income',
      date: i.income_date || (i.created_at ? i.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      payment_method: 'Bank Transfer / Deposit',
      notes: i.notes || '',
      created_at: i.created_at,
    }));

    let all: any[] = [...expenses, ...income];

    // Search filter
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      all = all.filter(t => 
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.payment_method && t.payment_method.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (category && typeof category === 'string' && category !== 'All') {
      all = all.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    // Date range filter
    if (startDate && typeof startDate === 'string' && startDate.trim()) {
      all = all.filter(t => t.date >= startDate);
    }
    if (endDate && typeof endDate === 'string' && endDate.trim()) {
      all = all.filter(t => t.date <= endDate);
    }

    // Amount filter
    if (minAmount && !isNaN(parseFloat(String(minAmount)))) {
      const min = parseFloat(String(minAmount));
      all = all.filter(t => parseFloat(t.amount) >= min);
    }
    if (maxAmount && !isNaN(parseFloat(String(maxAmount)))) {
      const max = parseFloat(String(maxAmount));
      all = all.filter(t => parseFloat(t.amount) <= max);
    }

    // Total counts and sums
    const totalRecords = all.length;
    const totalIncome = all.filter(t => t.type === 'Income').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const totalExpenses = all.filter(t => t.type === 'Expense').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

    // Sorting
    all.sort((a, b) => {
      let valA = a[String(sortBy)] || a.date;
      let valB = b[String(sortBy)] || b.date;

      if (sortBy === 'amount') {
        valA = parseFloat(valA);
        valB = parseFloat(valB);
      }

      if (valA < valB) return String(sortOrder).toLowerCase() === 'asc' ? -1 : 1;
      if (valA > valB) return String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
    const offset = (pageNum - 1) * limitNum;
    const paginated = all.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: {
        transactions: paginated,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalRecords / limitNum) || 1,
          totalRecords,
          limit: limitNum,
          totalIncome: Number(totalIncome.toFixed(2)),
          totalExpenses: Number(totalExpenses.toFixed(2)),
          netBalance: Number((totalIncome - totalExpenses).toFixed(2)),
        },
      },
    });
  } catch (err: any) {
    console.error('Get Transactions Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve transactions' });
  }
}
