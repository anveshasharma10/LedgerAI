import { Response } from 'express';
import { query } from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';
import { validateEmail, validatePassword } from '../utils/validation.js';

// Helper to record audit events
async function logAuditEvent(
  adminId: number,
  adminName: string,
  action: string,
  target: string,
  details: string,
  ipAddress: string
) {
  try {
    await query(
      'INSERT INTO audit_logs (admin_id, admin_name, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, adminName, action, target, details, ipAddress || '127.0.0.1']
    );
  } catch (err) {
    console.error('Audit log write error:', err);
  }
}

/**
 * 1. Admin Dashboard Overview
 * GET /api/admin/dashboard
 */
export async function getDashboardOverview(req: AuthRequest, res: Response): Promise<void> {
  try {
    // 1. Users metrics
    const users: any[] = await query('SELECT id, role, is_active, created_at FROM users');
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active === 1 || u.is_active === true).length;
    const inactiveUsers = totalUsers - activeUsers;

    // 2. Financial totals
    const expRow: any[] = await query('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses');
    const incRow: any[] = await query('SELECT COUNT(*) as count, SUM(amount) as total FROM income');

    const totalExpenses = parseFloat(expRow[0]?.total || 0);
    const totalExpensesCount = parseInt(expRow[0]?.count || 0, 10);
    const totalIncome = parseFloat(incRow[0]?.total || 0);
    const totalIncomeCount = parseInt(incRow[0]?.count || 0, 10);
    const totalTransactions = totalExpensesCount + totalIncomeCount;

    // 3. User map for attribution
    const allUsersList: any[] = await query('SELECT id, name, email FROM users');
    const userMap = new Map<number, { name: string; email: string }>();
    allUsersList.forEach(u => userMap.set(u.id, { name: u.name, email: u.email }));

    // 4. Monthly Incomes vs Expenses (Past 6 Months)
    const now = new Date();
    const monthsData: { month: string; income: number; expenses: number; transactions: number; users: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      const mExp: any[] = await query(
        'SELECT SUM(amount) as total, COUNT(*) as count FROM expenses WHERE expense_date LIKE ?',
        [`${monthKey}%`]
      );
      const mInc: any[] = await query(
        'SELECT SUM(amount) as total, COUNT(*) as count FROM income WHERE income_date LIKE ?',
        [`${monthKey}%`]
      );

      const mUsers = users.filter(u => {
        if (!u.created_at) return false;
        const uDate = new Date(u.created_at);
        return uDate.getFullYear() === year && uDate.getMonth() + 1 === monthNum;
      }).length;

      const incTotal = parseFloat(mInc[0]?.total || 0);
      const expTotal = parseFloat(mExp[0]?.total || 0);
      const txCount = parseInt(mExp[0]?.count || 0, 10) + parseInt(mInc[0]?.count || 0, 10);

      monthsData.push({
        month: monthLabel,
        income: incTotal,
        expenses: expTotal,
        transactions: txCount,
        users: mUsers,
      });
    }

    // 5. Category Breakdown
    const categories: any[] = await query(
      'SELECT category, COUNT(*) as count, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC LIMIT 6'
    );

    // 6. Recent Activity
    const recentExpenses: any[] = await query(
      'SELECT id, user_id, amount, category, description, expense_date as date, created_at FROM expenses ORDER BY id DESC LIMIT 5'
    );
    const recentIncomes: any[] = await query(
      'SELECT id, user_id, amount, source as category, description, income_date as date, created_at FROM income ORDER BY id DESC LIMIT 5'
    );

    const recentActivity = [
      ...recentExpenses.map(e => ({
        id: `exp-${e.id}`,
        userName: userMap.get(e.user_id)?.name || 'Unknown User',
        userEmail: userMap.get(e.user_id)?.email || '',
        activity: `Expense: ${e.description} (${e.category})`,
        type: 'Expense',
        amount: parseFloat(e.amount),
        date: e.date,
      })),
      ...recentIncomes.map(i => ({
        id: `inc-${i.id}`,
        userName: userMap.get(i.user_id)?.name || 'Unknown User',
        userEmail: userMap.get(i.user_id)?.email || '',
        activity: `Income: ${i.description} (${i.category})`,
        type: 'Income',
        amount: parseFloat(i.amount),
        date: i.date,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7);

    res.json({
      success: true,
      data: {
        cards: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          totalTransactions,
          totalIncome,
          totalExpenses,
          netBalance: totalIncome - totalExpenses,
        },
        charts: {
          monthsData,
          categoryDistribution: categories.map(c => ({
            category: c.category,
            total: parseFloat(c.total || 0),
            count: parseInt(c.count || 0, 10),
          })),
        },
        recentActivity,
      },
    });
  } catch (err: any) {
    console.error('Admin Dashboard Overview Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
}

/**
 * 2. User Management List
 * GET /api/admin/users
 */
export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const status = (req.query.status as string) || 'all';
    const role = (req.query.role as string) || 'all';
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '15', 10)));

    let allUsers: any[] = await query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id DESC');

    // Filter
    if (search) {
      allUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        String(u.id).includes(search)
      );
    }

    if (status === 'active') {
      allUsers = allUsers.filter(u => u.is_active === 1 || u.is_active === true);
    } else if (status === 'inactive') {
      allUsers = allUsers.filter(u => u.is_active === 0 || u.is_active === false);
    }

    if (role !== 'all') {
      allUsers = allUsers.filter(u => u.role === role);
    }

    const totalCount = allUsers.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedUsers = allUsers.slice(offset, offset + limit);

    // Enrich with summary
    const enriched = await Promise.all(
      paginatedUsers.map(async (u) => {
        const exp: any[] = await query('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses WHERE user_id = ?', [u.id]);
        const inc: any[] = await query('SELECT COUNT(*) as count, SUM(amount) as total FROM income WHERE user_id = ?', [u.id]);
        const expTotal = parseFloat(exp[0]?.total || 0);
        const incTotal = parseFloat(inc[0]?.total || 0);
        const txCount = parseInt(exp[0]?.count || 0, 10) + parseInt(inc[0]?.count || 0, 10);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role || 'user',
          is_active: u.is_active === 1 || u.is_active === true,
          created_at: u.created_at,
          total_income: incTotal,
          total_expenses: expTotal,
          transaction_count: txCount,
          net_balance: incTotal - expTotal,
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: enriched,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      },
    });
  } catch (err: any) {
    console.error('Admin getUsers Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
}

/**
 * 3. User Details
 * GET /api/admin/users/:id
 */
export async function getUserDetails(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    const users: any[] = await query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const user = users[0];

    const expSum: any[] = await query('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses WHERE user_id = ?', [userId]);
    const incSum: any[] = await query('SELECT COUNT(*) as count, SUM(amount) as total FROM income WHERE user_id = ?', [userId]);
    const budgetSum: any[] = await query('SELECT COUNT(*) as count FROM budgets WHERE user_id = ?', [userId]);

    const totalExpenses = parseFloat(expSum[0]?.total || 0);
    const totalExpensesCount = parseInt(expSum[0]?.count || 0, 10);
    const totalIncome = parseFloat(incSum[0]?.total || 0);
    const totalIncomeCount = parseInt(incSum[0]?.count || 0, 10);
    const totalBudgets = parseInt(budgetSum[0]?.count || 0, 10);

    // Recent Transactions for this user
    const expenses: any[] = await query(
      'SELECT id, amount, category, description, expense_date as date, payment_method, notes FROM expenses WHERE user_id = ? ORDER BY id DESC LIMIT 10',
      [userId]
    );
    const incomes: any[] = await query(
      'SELECT id, amount, source as category, description, income_date as date, payment_method, notes FROM income WHERE user_id = ? ORDER BY id DESC LIMIT 10',
      [userId]
    );

    const recentActivity = [
      ...expenses.map(e => ({ ...e, type: 'Expense' })),
      ...incomes.map(i => ({ ...i, type: 'Income' })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

    res.json({
      success: true,
      data: {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          is_active: user.is_active === 1 || user.is_active === true,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        financialSummary: {
          totalIncome,
          totalExpenses,
          balance: totalIncome - totalExpenses,
          totalTransactions: totalExpensesCount + totalIncomeCount,
          totalBudgets,
          expensesCount: totalExpensesCount,
          incomeCount: totalIncomeCount,
        },
        recentActivity,
      },
    });
  } catch (err: any) {
    console.error('Admin getUserDetails Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user details' });
  }
}

/**
 * 4. Update User Status
 * PUT /api/admin/users/:id/status
 */
export async function updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    if (isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    if (req.user!.id === targetUserId && !is_active) {
      res.status(400).json({ success: false, message: 'You cannot deactivate your own administrative account.' });
      return;
    }

    const userCheck: any[] = await query('SELECT id, name, email FROM users WHERE id = ?', [targetUserId]);
    if (userCheck.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const targetUser = userCheck[0];
    const statusVal = is_active ? 1 : 0;
    await query('UPDATE users SET is_active = ? WHERE id = ?', [statusVal, targetUserId]);

    // Record audit log
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await logAuditEvent(
      req.user!.id,
      req.user!.name,
      is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      `${targetUser.name} (${targetUser.email})`,
      `User account status changed to ${is_active ? 'Active' : 'Deactivated'} by admin.`,
      ip
    );

    res.json({
      success: true,
      message: `User account successfully ${is_active ? 'activated' : 'deactivated'}.`,
      data: { id: targetUserId, is_active: !!is_active },
    });
  } catch (err: any) {
    console.error('Admin updateUserStatus Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update account status' });
  }
}

/**
 * 5. Update User Role
 * PUT /api/admin/users/:id/role
 */
export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    if (role !== 'admin' && role !== 'user') {
      res.status(400).json({ success: false, message: 'Role must be either admin or user' });
      return;
    }

    const userCheck: any[] = await query('SELECT id, name, email, role FROM users WHERE id = ?', [targetUserId]);
    if (userCheck.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const targetUser = userCheck[0];

    // Prevent demoting the last admin
    if (req.user!.id === targetUserId && role !== 'admin') {
      const adminCount: any[] = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
      if (parseInt(adminCount[0]?.count || 0, 10) <= 1) {
        res.status(400).json({ success: false, message: 'Cannot demote the only system administrator' });
        return;
      }
    }

    await query('UPDATE users SET role = ? WHERE id = ?', [role, targetUserId]);

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await logAuditEvent(
      req.user!.id,
      req.user!.name,
      'USER_ROLE_CHANGED',
      `${targetUser.name} (${targetUser.email})`,
      `Role changed from ${targetUser.role} to ${role}.`,
      ip
    );

    res.json({
      success: true,
      message: `User role updated to ${role}.`,
      data: { id: targetUserId, role },
    });
  } catch (err: any) {
    console.error('Admin updateUserRole Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
}

/**
 * 6. Transaction Monitoring Across Platform
 * GET /api/admin/transactions
 */
export async function getTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const userIdFilter = req.query.user_id ? parseInt(req.query.user_id as string, 10) : null;
    const category = (req.query.category as string) || 'all';
    const type = (req.query.type as string) || 'all';
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

    const users: any[] = await query('SELECT id, name, email FROM users');
    const userMap = new Map<number, { name: string; email: string }>();
    users.forEach(u => userMap.set(u.id, { name: u.name, email: u.email }));

    let expenses: any[] = [];
    let income: any[] = [];

    if (type === 'all' || type === 'expense') {
      expenses = await query('SELECT id, user_id, amount, category, description, expense_date as date, payment_method, notes, created_at FROM expenses ORDER BY id DESC');
    }
    if (type === 'all' || type === 'income') {
      income = await query('SELECT id, user_id, amount, source as category, description, income_date as date, payment_method, notes, created_at FROM income ORDER BY id DESC');
    }

    let allTx = [
      ...expenses.map(e => ({
        ...e,
        type: 'Expense',
        amount: parseFloat(e.amount),
        userName: userMap.get(e.user_id)?.name || 'Unknown User',
        userEmail: userMap.get(e.user_id)?.email || '',
      })),
      ...income.map(i => ({
        ...i,
        type: 'Income',
        amount: parseFloat(i.amount),
        userName: userMap.get(i.user_id)?.name || 'Unknown User',
        userEmail: userMap.get(i.user_id)?.email || '',
      })),
    ];

    // Filter by user ID
    if (userIdFilter) {
      allTx = allTx.filter(t => t.user_id === userIdFilter);
    }

    // Filter by category
    if (category !== 'all') {
      allTx = allTx.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by date range
    if (startDate) {
      allTx = allTx.filter(t => t.date >= startDate);
    }
    if (endDate) {
      allTx = allTx.filter(t => t.date <= endDate);
    }

    // Filter by search
    if (search) {
      allTx = allTx.filter(t =>
        t.description.toLowerCase().includes(search) ||
        t.category.toLowerCase().includes(search) ||
        t.userName.toLowerCase().includes(search) ||
        t.userEmail.toLowerCase().includes(search) ||
        (t.payment_method && t.payment_method.toLowerCase().includes(search))
      );
    }

    // Sort by date descending
    allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalCount = allTx.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = allTx.slice(offset, offset + limit);

    // List of unique categories for filter dropdown
    const availableCategories = Array.from(new Set(allTx.map(t => t.category))).filter(Boolean);

    res.json({
      success: true,
      data: {
        transactions: paginated,
        availableCategories,
        usersList: users.map(u => ({ id: u.id, name: u.name, email: u.email })),
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      },
    });
  } catch (err: any) {
    console.error('Admin getTransactions Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
}

/**
 * 7. Platform Analytics
 * GET /api/admin/analytics
 */
export async function getAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const users: any[] = await query('SELECT id, is_active, created_at FROM users');
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active === 1 || u.is_active === true).length;

    const expRow: any[] = await query('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses');
    const incRow: any[] = await query('SELECT COUNT(*) as count, SUM(amount) as total FROM income');

    const totalExpenses = parseFloat(expRow[0]?.total || 0);
    const totalExpensesCount = parseInt(expRow[0]?.count || 0, 10);
    const totalIncome = parseFloat(incRow[0]?.total || 0);
    const totalIncomeCount = parseInt(incRow[0]?.count || 0, 10);

    // Categories Distribution
    const categoryStats: any[] = await query(
      'SELECT category, COUNT(*) as count, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC'
    );

    // Payment Methods Breakdown
    const paymentMethods: any[] = await query(
      'SELECT payment_method, COUNT(*) as count, SUM(amount) as total FROM expenses GROUP BY payment_method ORDER BY total DESC'
    );

    // Monthly Growth and Flow (Past 12 Months)
    const now = new Date();
    const monthlyTrends: any[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('default', { month: 'short', year: 'numeric' });

      const mExp: any[] = await query(
        'SELECT SUM(amount) as total, COUNT(*) as count FROM expenses WHERE expense_date LIKE ?',
        [`${monthKey}%`]
      );
      const mInc: any[] = await query(
        'SELECT SUM(amount) as total, COUNT(*) as count FROM income WHERE income_date LIKE ?',
        [`${monthKey}%`]
      );

      const mUsers = users.filter(u => {
        if (!u.created_at) return false;
        const uDate = new Date(u.created_at);
        return uDate <= new Date(year, monthNum, 0);
      }).length;

      monthlyTrends.push({
        month: monthLabel,
        key: monthKey,
        income: parseFloat(mInc[0]?.total || 0),
        expenses: parseFloat(mExp[0]?.total || 0),
        transactions: parseInt(mExp[0]?.count || 0, 10) + parseInt(mInc[0]?.count || 0, 10),
        cumulativeUsers: mUsers,
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          activeUsers,
          totalIncome,
          totalExpenses,
          totalTransactions: totalExpensesCount + totalIncomeCount,
          netFlow: totalIncome - totalExpenses,
        },
        categoryStats: categoryStats.map(c => ({
          category: c.category,
          total: parseFloat(c.total || 0),
          count: parseInt(c.count || 0, 10),
        })),
        paymentMethods: paymentMethods.map(p => ({
          method: p.payment_method || 'Other',
          total: parseFloat(p.total || 0),
          count: parseInt(p.count || 0, 10),
        })),
        monthlyTrends,
      },
    });
  } catch (err: any) {
    console.error('Admin getAnalytics Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
}

/**
 * 8. System Health Diagnostics
 * GET /api/admin/system-health
 */
export async function getSystemHealth(req: AuthRequest, res: Response): Promise<void> {
  try {
    const memory = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());

    const usersCount: any[] = await query('SELECT COUNT(*) as count FROM users');
    const expCount: any[] = await query('SELECT COUNT(*) as count FROM expenses');
    const incCount: any[] = await query('SELECT COUNT(*) as count FROM income');
    const budgetCount: any[] = await query('SELECT COUNT(*) as count FROM budgets');
    const aiCount: any[] = await query('SELECT COUNT(*) as count FROM ai_insights');
    const auditCount: any[] = await query('SELECT COUNT(*) as count FROM audit_logs');

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());

    res.json({
      success: true,
      data: {
        services: {
          backend: { status: 'Online', label: 'Express Node.js Server', port: 3000 },
          database: { status: 'Online', label: 'MySQL Resilient Persistence Layer' },
          aiService: { status: hasGeminiKey ? 'Online' : 'Warning', label: 'Gemini AI API Engine' },
          apiGateway: { status: 'Online', label: 'REST API Routing' },
        },
        uptime: {
          seconds: uptimeSec,
          formatted: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`,
        },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'production',
        memory: {
          heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
          heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
          rssMb: Math.round(memory.rss / (1024 * 1024)),
        },
        databaseTables: {
          users: parseInt(usersCount[0]?.count || 0, 10),
          expenses: parseInt(expCount[0]?.count || 0, 10),
          income: parseInt(incCount[0]?.count || 0, 10),
          budgets: parseInt(budgetCount[0]?.count || 0, 10),
          ai_insights: parseInt(aiCount[0]?.count || 0, 10),
          audit_logs: parseInt(auditCount[0]?.count || 0, 10),
        },
      },
    });
  } catch (err: any) {
    console.error('Admin getSystemHealth Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch system diagnostics' });
  }
}

/**
 * 9. Audit Logs
 * GET /api/admin/audit-logs
 */
export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const actionFilter = (req.query.action as string) || 'all';
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

    let logs: any[] = await query('SELECT * FROM audit_logs ORDER BY id DESC');

    if (search) {
      logs = logs.filter(l =>
        (l.admin_name && l.admin_name.toLowerCase().includes(search)) ||
        (l.action && l.action.toLowerCase().includes(search)) ||
        (l.target && l.target.toLowerCase().includes(search)) ||
        (l.details && l.details.toLowerCase().includes(search))
      );
    }

    if (actionFilter !== 'all') {
      logs = logs.filter(l => l.action === actionFilter);
    }

    const totalCount = logs.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = logs.slice(offset, offset + limit);

    const availableActions = Array.from(new Set(logs.map(l => l.action))).filter(Boolean);

    res.json({
      success: true,
      data: {
        logs: paginated,
        availableActions,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      },
    });
  } catch (err: any) {
    console.error('Admin getAuditLogs Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
}

/**
 * 10. Admin Reports
 * GET /api/admin/reports
 */
export async function getReports(req: AuthRequest, res: Response): Promise<void> {
  try {
    const reportType = (req.query.type as string) || 'financial';

    if (reportType === 'users') {
      const users: any[] = await query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id DESC');
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.is_active === 1 || u.is_active === true).length;
      const inactiveUsers = totalUsers - activeUsers;

      const enriched = await Promise.all(
        users.map(async (u) => {
          const exp: any[] = await query('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses WHERE user_id = ?', [u.id]);
          const inc: any[] = await query('SELECT COUNT(*) as count, SUM(amount) as total FROM income WHERE user_id = ?', [u.id]);
          return {
            ...u,
            is_active: u.is_active === 1 || u.is_active === true ? 'Active' : 'Inactive',
            total_income: parseFloat(inc[0]?.total || 0),
            total_expenses: parseFloat(exp[0]?.total || 0),
            transaction_count: parseInt(exp[0]?.count || 0, 10) + parseInt(inc[0]?.count || 0, 10),
          };
        })
      );

      res.json({
        success: true,
        data: {
          summary: { totalUsers, activeUsers, inactiveUsers },
          rows: enriched,
        },
      });
      return;
    }

    if (reportType === 'activity') {
      const users: any[] = await query('SELECT id, name, email FROM users');
      const userMap = new Map<number, { name: string; email: string }>();
      users.forEach(u => userMap.set(u.id, { name: u.name, email: u.email }));

      const expenses: any[] = await query('SELECT user_id, amount, category, description, expense_date as date FROM expenses');
      const income: any[] = await query('SELECT user_id, amount, source as category, description, income_date as date FROM income');

      const allActivity = [
        ...expenses.map(e => ({
          date: e.date,
          user: userMap.get(e.user_id)?.name || 'Unknown',
          email: userMap.get(e.user_id)?.email || '',
          type: 'Expense',
          category: e.category,
          description: e.description,
          amount: parseFloat(e.amount),
        })),
        ...income.map(i => ({
          date: i.date,
          user: userMap.get(i.user_id)?.name || 'Unknown',
          email: userMap.get(i.user_id)?.email || '',
          type: 'Income',
          category: i.category,
          description: i.description,
          amount: parseFloat(i.amount),
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        success: true,
        data: {
          totalCount: allActivity.length,
          rows: allActivity,
        },
      });
      return;
    }

    // Default: Financial Report (monthly & category aggregations)
    const expSum: any[] = await query('SELECT SUM(amount) as total, COUNT(*) as count FROM expenses');
    const incSum: any[] = await query('SELECT SUM(amount) as total, COUNT(*) as count FROM income');
    const totalExpenses = parseFloat(expSum[0]?.total || 0);
    const totalIncome = parseFloat(incSum[0]?.total || 0);
    const totalTransactions = parseInt(expSum[0]?.count || 0, 10) + parseInt(incSum[0]?.count || 0, 10);

    const categoryBreakdown: any[] = await query(
      'SELECT category, COUNT(*) as count, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC'
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          netBalance: totalIncome - totalExpenses,
          totalTransactions,
        },
        categoryBreakdown: categoryBreakdown.map(c => ({
          category: c.category,
          total: parseFloat(c.total || 0),
          count: parseInt(c.count || 0, 10),
        })),
      },
    });
  } catch (err: any) {
    console.error('Admin getReports Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate admin reports' });
  }
}
