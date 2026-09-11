import { Response } from 'express';
import { query } from '../config/db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import * as aiService from '../services/aiService.js';
import * as analyticsService from '../services/analyticsService.js';

export async function categorizeExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { description, notes } = req.body;

    if (!description || !description.trim()) {
      res.status(400).json({ success: false, message: 'Expense description is required for categorization' });
      return;
    }

    const result = await aiService.categorizeExpense(description.trim(), notes);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('AI Categorize Error:', err);
    res.status(500).json({ success: false, message: 'AI categorization failed' });
  }
}

export async function analyzeSpending(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    // Gather real user financial context
    const summary = await analyticsService.getAnalyticsSummary(userId);
    const categoryData = await analyticsService.getCategoryAnalytics(userId);
    const monthlyTrends = await analyticsService.getMonthlyAnalytics(userId);
    const budgetUsage = await analyticsService.getBudgetStatusAnalytics(userId);

    const analysis = await aiService.analyzeSpending({
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      balance: summary.balance,
      savingsRate: summary.savingsRate,
      categories: categoryData.categories,
      monthlyTrends: monthlyTrends.map(m => ({ month: m.month, income: m.income, expense: m.expense })),
      budgetUsage: budgetUsage.map(b => ({ category: b.category, budget: b.budget, spent: b.spent, usage: b.usage })),
    });

    // Save insights to ai_insights table for durability
    if (analysis.insights && analysis.insights.length > 0) {
      for (const ins of analysis.insights) {
        await query(
          'INSERT INTO ai_insights (user_id, insight_type, content) VALUES (?, ?, ?)',
          [userId, ins.type, `${ins.title}: ${ins.message}`]
        );
      }
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (err: any) {
    console.error('AI Analyze Spending Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate spending analysis' });
  }
}

export async function getBudgetRecommendation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const summary = await analyticsService.getAnalyticsSummary(userId);
    const categoryData = await analyticsService.getCategoryAnalytics(userId);
    const budgets = await query<any>('SELECT category, amount FROM budgets WHERE user_id = ?', [userId]);

    const recommendation = await aiService.generateBudgetRecommendation({
      monthlyIncome: summary.totalIncome > 0 ? summary.totalIncome : 50000,
      historicalExpenses: categoryData.categories.map(c => ({ category: c.category, amount: c.total, percentage: c.percentage })),
      currentBudgets: budgets.map(b => ({ category: b.category, amount: parseFloat(b.amount) || 0 })),
    });

    const incomeBase = summary.totalIncome > 0 ? summary.totalIncome : 50000;
    const normalizedData = {
      ...recommendation,
      recommendedBudgets: (recommendation.allocations || []).map(a => ({
        category: a.category,
        recommendedAmount: a.recommendedAmount,
        rationale: a.reasoning || `${a.percentageOfIncome}% of monthly income`,
        percentageOfIncome: a.percentageOfIncome,
        reasoning: a.reasoning,
      })),
      strategySummary: recommendation.overview,
      budgetSplit503020: {
        needs: { amount: Math.round(incomeBase * 0.50), percentage: 50 },
        wants: { amount: Math.round(incomeBase * 0.30), percentage: 30 },
        savings: { amount: Math.round(incomeBase * 0.20), percentage: 20 },
      },
      savingsGoalRecommendation: {
        targetMonthlySavings: recommendation.recommendedSavings,
      },
    };

    res.json({
      success: true,
      data: normalizedData,
    });
  } catch (err: any) {
    console.error('AI Budget Recommendation Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate budget recommendations' });
  }
}

export async function getInsights(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    // Fetch saved database insights first
    const saved = await query<any>(
      'SELECT * FROM ai_insights WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    // If few saved, generate fresh analysis dynamically
    if (saved.length < 3) {
      const summary = await analyticsService.getAnalyticsSummary(userId);
      const categoryData = await analyticsService.getCategoryAnalytics(userId);
      const monthlyTrends = await analyticsService.getMonthlyAnalytics(userId);
      const budgetUsage = await analyticsService.getBudgetStatusAnalytics(userId);

      const dynamicAnalysis = await aiService.analyzeSpending({
        totalIncome: summary.totalIncome,
        totalExpenses: summary.totalExpenses,
        balance: summary.balance,
        savingsRate: summary.savingsRate,
        categories: categoryData.categories,
        monthlyTrends: monthlyTrends.map(m => ({ month: m.month, income: m.income, expense: m.expense })),
        budgetUsage: budgetUsage.map(b => ({ category: b.category, budget: b.budget, spent: b.spent, usage: b.usage })),
      });

      res.json({
        success: true,
        data: {
          savedInsights: saved,
          activeInsights: dynamicAnalysis.insights,
          summary: dynamicAnalysis.summary,
          recommendations: dynamicAnalysis.recommendations,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        savedInsights: saved,
        activeInsights: saved.map(s => ({
          type: s.insight_type,
          title: s.insight_type,
          message: s.content,
          severity: s.insight_type === 'Overspending' || s.insight_type === 'Budget Alert' ? 'warning' : 'positive',
        })),
      },
    });
  } catch (err: any) {
    console.error('Get Insights Error:', err);
    res.status(500).json({ success: false, message: 'Failed to get insights' });
  }
}

export async function chat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }

    // Build real user financial context
    const summary = await analyticsService.getAnalyticsSummary(userId);
    const categoryData = await analyticsService.getCategoryAnalytics(userId);
    const recentExpenses = await query<any>(
      'SELECT amount, category, description, expense_date FROM expenses WHERE user_id = ? ORDER BY expense_date DESC LIMIT 5',
      [userId]
    );
    const recentIncome = await query<any>(
      'SELECT amount, source, description, income_date FROM income WHERE user_id = ? ORDER BY income_date DESC LIMIT 5',
      [userId]
    );
    const budgets = await analyticsService.getBudgetStatusAnalytics(userId);

    const botResponse = await aiService.chatWithAssistant(message.trim(), {
      userName: req.user!.name,
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      balance: summary.balance,
      savingsRate: summary.savingsRate,
      recentExpenses,
      recentIncome,
      budgets,
      topCategories: categoryData.categories,
    });

    res.json({
      success: true,
      data: {
        message: botResponse,
      },
    });
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ success: false, message: 'AI chat assistant encountered an error' });
  }
}
