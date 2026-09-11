import { query } from '../config/db.js';

export async function ensureUserBudgetsForPeriod(userId: number, month: number, year: number): Promise<any[]> {
  let budgets = await query<any>(
    'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ? ORDER BY category ASC',
    [userId, month, year]
  );

  if (budgets.length === 0) {
    // Check if user has budgets from another month to carry forward
    const priorBudgets = await query<any>(
      'SELECT category, amount FROM budgets WHERE user_id = ? ORDER BY year DESC, month DESC',
      [userId]
    );

    if (priorBudgets.length > 0) {
      const seenCategories = new Set<string>();
      for (const pb of priorBudgets) {
        if (!seenCategories.has(pb.category)) {
          seenCategories.add(pb.category);
          await query(
            'INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)',
            [userId, pb.category, parseFloat(pb.amount) || 0, month, year]
          );
        }
      }
    } else {
      // Default baseline category budgets for new users
      const defaultAllocations = [
        { category: 'Rent', amount: 22000 },
        { category: 'Food', amount: 15000 },
        { category: 'Shopping', amount: 12000 },
        { category: 'Bills', amount: 8000 },
        { category: 'Transport', amount: 6500 },
        { category: 'Entertainment', amount: 5000 },
        { category: 'Healthcare', amount: 6000 },
        { category: 'Education', amount: 5000 },
        { category: 'Other', amount: 4000 },
      ];
      for (const def of defaultAllocations) {
        await query(
          'INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)',
          [userId, def.category, def.amount, month, year]
        );
      }
    }

    budgets = await query<any>(
      'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ? ORDER BY category ASC',
      [userId, month, year]
    );
  }

  return budgets;
}
