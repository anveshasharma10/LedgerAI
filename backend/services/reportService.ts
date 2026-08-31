/**
 * Report Service
 * Monthly, yearly, category reports and CSV export
 */

import { query } from '../config/db.js';
import { calculateFinancials, generateCSV } from '../utils/helpers.js';

export async function getMonthlyReport(userId: number, month: number, year: number) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const income = await query<any>(
    'SELECT * FROM income WHERE user_id = ? AND income_date LIKE ? ORDER BY income_date DESC',
    [userId, `${monthStr}%`]
  );

  const expenses = await query<any>(
    'SELECT * FROM expenses WHERE user_id = ? AND expense_date LIKE ? ORDER BY expense_date DESC',
    [userId, `${monthStr}%`]
  );

  const totalIncome = income.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const financials = calculateFinancials(totalIncome, totalExpenses);

  // Category breakdown for this month
  const categoryMap: { [cat: string]: { total: number; count: number } } = {};
  expenses.forEach(e => {
    if (!categoryMap[e.category]) {
      categoryMap[e.category] = { total: 0, count: 0 };
    }
    categoryMap[e.category].total += parseFloat(e.amount) || 0;
    categoryMap[e.category].count += 1;
  });

  const categories = Object.keys(categoryMap).map(cat => ({
    category: cat,
    total: Number(categoryMap[cat].total.toFixed(2)),
    amount: Number(categoryMap[cat].total.toFixed(2)),
    count: categoryMap[cat].count,
    percentage: totalExpenses > 0 ? Number(((categoryMap[cat].total / totalExpenses) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.total - a.total);

  // Highest single expense
  let highestExpense: any = null;
  if (expenses.length > 0) {
    highestExpense = expenses.reduce((prev, curr) => (parseFloat(curr.amount) > parseFloat(prev.amount) ? curr : prev), expenses[0]);
  }

  // Top 5 largest expenses
  const topExpenses = [...expenses].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5);

  const monthDate = new Date(year, month - 1, 1);
  const monthName = monthDate.toLocaleString('default', { month: 'long' });
  const monthString = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return {
    period: {
      month,
      year,
      monthName,
      monthString,
    },
    summary: {
      ...financials,
      netSavings: financials.savings,
    },
    categories,
    categoryBreakdown: categories,
    topExpenses,
    highestExpense,
    highestCategory: categories.length > 0 ? categories[0] : null,
    totalTransactions: income.length + expenses.length,
    incomeList: income,
    expensesList: expenses,
  };
}

export async function getYearlyReport(userId: number, year: number) {
  const yearStr = `${year}-%`;

  const income = await query<any>(
    'SELECT * FROM income WHERE user_id = ? AND income_date LIKE ? ORDER BY income_date DESC',
    [userId, yearStr]
  );

  const expenses = await query<any>(
    'SELECT * FROM expenses WHERE user_id = ? AND expense_date LIKE ? ORDER BY expense_date DESC',
    [userId, yearStr]
  );

  const totalIncome = income.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const financials = calculateFinancials(totalIncome, totalExpenses);

  // Monthly breakdown for the year
  const monthlyData: { [m: number]: { month: string; monthName: string; income: number; expense: number; savings: number; savingsRate: number } } = {};
  for (let m = 1; m <= 12; m++) {
    const dt = new Date(year, m - 1, 1);
    const mName = dt.toLocaleString('default', { month: 'short' });
    monthlyData[m] = {
      month: mName,
      monthName: mName,
      income: 0,
      expense: 0,
      savings: 0,
      savingsRate: 0,
    };
  }

  income.forEach(i => {
    const m = parseInt(String(i.income_date).substring(5, 7), 10);
    if (monthlyData[m]) monthlyData[m].income += parseFloat(i.amount) || 0;
  });

  expenses.forEach(e => {
    const m = parseInt(String(e.expense_date).substring(5, 7), 10);
    if (monthlyData[m]) monthlyData[m].expense += parseFloat(e.amount) || 0;
  });

  let activeMonthsWithActivity = 0;
  let cumulativeSavings = 0;

  Object.keys(monthlyData).forEach(m => {
    const num = parseInt(m, 10);
    const inc = monthlyData[num].income;
    const exp = monthlyData[num].expense;
    const sav = Math.max(0, inc - exp);
    monthlyData[num].savings = sav;
    monthlyData[num].savingsRate = inc > 0 ? Number(((sav / inc) * 100).toFixed(1)) : 0;
    if (inc > 0 || exp > 0) {
      activeMonthsWithActivity++;
      cumulativeSavings += sav;
    }
  });

  const avgMonthlySavings = activeMonthsWithActivity > 0 ? Number((cumulativeSavings / activeMonthsWithActivity).toFixed(2)) : 0;

  const annualSummary = {
    ...financials,
    netSavings: financials.savings,
    avgMonthlySavings,
  };

  return {
    year,
    summary: annualSummary,
    annualSummary,
    monthlyBreakdown: Object.values(monthlyData),
    totalExpensesCount: expenses.length,
    totalIncomeCount: income.length,
  };
}

export async function getCategoryReport(userId: number, startDate?: string, endDate?: string) {
  let sql = 'SELECT * FROM expenses WHERE user_id = ?';
  const params: any[] = [userId];

  if (startDate && endDate) {
    sql += ' AND expense_date >= ? AND expense_date <= ?';
    params.push(startDate, endDate);
  }
  sql += ' ORDER BY expense_date DESC';

  const expenses = await query<any>(sql, params);
  const totalExpenses = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);

  const categoryMap: { [cat: string]: { total: number; count: number; items: any[] } } = {};
  expenses.forEach(e => {
    if (!categoryMap[e.category]) {
      categoryMap[e.category] = { total: 0, count: 0, items: [] };
    }
    categoryMap[e.category].total += parseFloat(e.amount) || 0;
    categoryMap[e.category].count += 1;
    categoryMap[e.category].items.push(e);
  });

  const categories = Object.keys(categoryMap).map(cat => {
    const tot = categoryMap[cat].total;
    const cnt = categoryMap[cat].count;
    return {
      category: cat,
      total: Number(tot.toFixed(2)),
      count: cnt,
      avgPerItem: cnt > 0 ? Number((tot / cnt).toFixed(2)) : 0,
      percentage: totalExpenses > 0 ? Number(((tot / totalExpenses) * 100).toFixed(1)) : 0,
      items: categoryMap[cat].items,
    };
  }).sort((a, b) => b.total - a.total);

  return {
    totalExpenses,
    summary: {
      totalExpenses,
      totalCount: expenses.length,
      categoryCount: categories.length,
    },
    categories,
  };
}

export async function exportTransactionsCSV(userId: number): Promise<string> {
  const expenses = await query<any>(
    'SELECT expense_date as date, "Expense" as type, category, description, amount, payment_method, notes FROM expenses WHERE user_id = ? ORDER BY expense_date DESC',
    [userId]
  );

  const income = await query<any>(
    'SELECT income_date as date, "Income" as type, source as category, description, amount, "N/A" as payment_method, "" as notes FROM income WHERE user_id = ? ORDER BY income_date DESC',
    [userId]
  );

  const all = [...expenses, ...income].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const headers = ['Date', 'Type', 'Category/Source', 'Description', 'Amount (INR)', 'Payment Method', 'Notes'];
  const rows = all.map(t => [
    t.date,
    t.type,
    t.category,
    t.description,
    t.amount,
    t.payment_method,
    t.notes || '',
  ]);

  return generateCSV(headers, rows);
}
