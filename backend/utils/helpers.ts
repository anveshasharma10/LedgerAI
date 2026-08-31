/**
 * Helper Utilities for Financial Calculations and Formatting
 */

export const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Healthcare',
  'Education',
  'Travel',
  'Rent',
  'Other',
];

export const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
  'Other',
];

export const INCOME_SOURCES = [
  'Salary',
  'Freelance',
  'Business',
  'Scholarship',
  'Investment',
  'Other',
];

export function calculateFinancials(totalIncome: number, totalExpenses: number) {
  const balance = totalIncome - totalExpenses;
  const savings = balance > 0 ? balance : 0;
  const savingsRate = totalIncome > 0 ? Number(((savings / totalIncome) * 100).toFixed(2)) : 0;

  return {
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    balance: Number(balance.toFixed(2)),
    savings: Number(savings.toFixed(2)),
    savingsRate,
  };
}

export function getBudgetStatus(usagePercentage: number): {
  status: 'Normal' | 'Warning' | 'Critical' | 'Exceeded';
  color: string;
} {
  if (usagePercentage >= 100) {
    return { status: 'Exceeded', color: '#ef4444' };
  } else if (usagePercentage >= 90) {
    return { status: 'Critical', color: '#f97316' };
  } else if (usagePercentage >= 70) {
    return { status: 'Warning', color: '#eab308' };
  }
  return { status: 'Normal', color: '#10b981' };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateCSV(headers: string[], rows: any[][]): string {
  const escapeCSV = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headerLine = headers.map(escapeCSV).join(',');
  const rowLines = rows.map(row => row.map(escapeCSV).join(','));
  return [headerLine, ...rowLines].join('\n');
}
