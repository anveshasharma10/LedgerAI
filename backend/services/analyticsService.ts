/**
 * Analytics Service
 * Provides aggregated financial data for Chart.js and metrics
 */

import { query } from '../config/db.js';
import { calculateFinancials, getBudgetStatus } from '../utils/helpers.js';

export async function getAnalyticsSummary(userId: number) {
  // Income total
  const incomeRows = await query<{ total_amount: number }>(
    'SELECT SUM(amount) as total_amount FROM income WHERE user_id = ?',
    [userId]
  );
  const totalIncome = parseFloat(incomeRows[0]?.total_amount as any) || 0;

  // Expense total
  const expenseRows = await query<{ total_amount: number }>(
    'SELECT SUM(amount) as total_amount FROM expenses WHERE user_id = ?',
    [userId]
  );
  const totalExpenses = parseFloat(expenseRows[0]?.total_amount as any) || 0;

  const financials = calculateFinancials(totalIncome, totalExpenses);

  // Current month budget total & used
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const budgetRows = await query<{ total_amount: number }>(
    'SELECT SUM(amount) as total_amount FROM budgets WHERE user_id = ? AND month = ? AND year = ?',
    [userId, currentMonth, currentYear]
  );
  const monthlyBudget = parseFloat(budgetRows[0]?.total_amount as any) || 0;

  // Expenses this month
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const currentMonthExpenses = await query<{ total_amount: number }>(
    'SELECT SUM(amount) as total_amount FROM expenses WHERE user_id = ? AND expense_date LIKE ?',
    [userId, `${currentMonthStr}%`]
  );
  const budgetUsed = parseFloat(currentMonthExpenses[0]?.total_amount as any) || 0;
  const budgetPercentage = monthlyBudget > 0 ? Number(((budgetUsed / monthlyBudget) * 100).toFixed(1)) : 0;

  // Get MoM Comparison data
  const savingsData = await getSavingsAnalytics(userId);

  return {
    ...financials,
    monthlyBudget,
    budgetUsed,
    budgetPercentage,
    currentMonth,
    currentYear,
    momComparison: {
      expenseChangePercent: savingsData.momComparison.percentageChange,
      lastMonthExpense: savingsData.momComparison.previousMonthExpense,
      currentMonthExpense: savingsData.momComparison.currentMonthExpense,
      trend: savingsData.momComparison.trend,
    },
  };
}

export async function getMonthlyAnalytics(userId: number) {
  // Aggregate last 6-12 months
  const expenses = await query<any>(
    'SELECT amount, expense_date FROM expenses WHERE user_id = ? ORDER BY expense_date ASC',
    [userId]
  );
  const income = await query<any>(
    'SELECT amount, income_date FROM income WHERE user_id = ? ORDER BY income_date ASC',
    [userId]
  );

  const monthsMap: { [monthKey: string]: { month: string; monthName: string; income: number; expense: number; savings: number; savingsRate: number } } = {};

  // Initialize last 6 months
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const target = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
    const label = target.toLocaleString('default', { month: 'short', year: 'numeric' });
    monthsMap[key] = { month: label, monthName: label, income: 0, expense: 0, savings: 0, savingsRate: 0 };
  }

  income.forEach(item => {
    const key = String(item.income_date).substring(0, 7);
    if (monthsMap[key]) {
      monthsMap[key].income += parseFloat(item.amount) || 0;
    } else {
      const parts = key.split('-');
      if (parts.length === 2) {
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        const label = dt.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthsMap[key] = {
          month: label,
          monthName: label,
          income: parseFloat(item.amount) || 0,
          expense: 0,
          savings: 0,
          savingsRate: 0,
        };
      }
    }
  });

  expenses.forEach(item => {
    const key = String(item.expense_date).substring(0, 7);
    if (monthsMap[key]) {
      monthsMap[key].expense += parseFloat(item.amount) || 0;
    } else {
      const parts = key.split('-');
      if (parts.length === 2) {
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        const label = dt.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthsMap[key] = {
          month: label,
          monthName: label,
          income: 0,
          expense: parseFloat(item.amount) || 0,
          savings: 0,
          savingsRate: 0,
        };
      }
    }
  });

  const sortedKeys = Object.keys(monthsMap).sort();
  const result = sortedKeys.map(k => {
    const m = monthsMap[k];
    m.savings = Math.max(0, m.income - m.expense);
    m.savingsRate = m.income > 0 ? Number(((m.savings / m.income) * 100).toFixed(1)) : 0;
    return m;
  });

  return result;
}

export async function getCategoryAnalytics(userId: number) {
  const rows = await query<{ category: string; total_amount: number; count: number }>(
    'SELECT category, SUM(amount) as total_amount, COUNT(*) as count FROM expenses WHERE user_id = ? GROUP BY category',
    [userId]
  );

  const total = rows.reduce((acc, r) => acc + (parseFloat(r.total_amount as any) || 0), 0);

  const categories = rows.map(r => {
    const catTotal = parseFloat(r.total_amount as any) || 0;
    const percentage = total > 0 ? Number(((catTotal / total) * 100).toFixed(1)) : 0;
    return {
      category: r.category,
      total: catTotal,
      count: parseInt(r.count as any, 10) || 0,
      percentage,
    };
  }).sort((a, b) => b.total - a.total);

  return {
    totalExpenses: total,
    categories,
  };
}

export async function getBudgetStatusAnalytics(userId: number) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const budgets = await query<any>(
    'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?',
    [userId, currentMonth, currentYear]
  );

  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const expenses = await query<any>(
    'SELECT category, amount FROM expenses WHERE user_id = ? AND expense_date LIKE ?',
    [userId, `${currentMonthStr}%`]
  );

  const categorySpentMap: { [cat: string]: number } = {};
  expenses.forEach(e => {
    categorySpentMap[e.category] = (categorySpentMap[e.category] || 0) + (parseFloat(e.amount) || 0);
  });

  const budgetStatuses = budgets.map(b => {
    const budgetAmount = parseFloat(b.amount) || 0;
    const spent = categorySpentMap[b.category] || 0;
    const remaining = budgetAmount - spent;
    const usage = budgetAmount > 0 ? Number(((spent / budgetAmount) * 100).toFixed(1)) : 0;
    const { status, color } = getBudgetStatus(usage);

    return {
      id: b.id,
      category: b.category,
      budget: budgetAmount,
      spent: Number(spent.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
      usage,
      status,
      color,
      month: b.month,
      year: b.year,
    };
  });

  return budgetStatuses;
}

export async function getSavingsAnalytics(userId: number) {
  const monthly = await getMonthlyAnalytics(userId);
  const savingsTrend = monthly.map(m => ({
    month: m.month,
    income: m.income,
    expense: m.expense,
    savings: m.savings,
    savingsRate: m.income > 0 ? Number(((m.savings / m.income) * 100).toFixed(1)) : 0,
  }));

  // Calculate Month-over-Month comparison
  let previousMonthExpense = 0;
  let currentMonthExpense = 0;
  let momPercentage = 0;

  if (monthly.length >= 2) {
    const curr = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    currentMonthExpense = curr.expense;
    previousMonthExpense = prev.expense;
    if (previousMonthExpense > 0) {
      momPercentage = Number((((currentMonthExpense - previousMonthExpense) / previousMonthExpense) * 100).toFixed(1));
    }
  }

  return {
    savingsTrend,
    monthlySavings: savingsTrend,
    momComparison: {
      currentMonthExpense,
      previousMonthExpense,
      percentageChange: momPercentage,
      trend: momPercentage > 0 ? 'increase' : momPercentage < 0 ? 'decrease' : 'stable',
    },
  };
}
