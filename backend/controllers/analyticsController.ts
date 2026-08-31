import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import * as analyticsService from '../services/analyticsService.js';

export async function getSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const summary = await analyticsService.getAnalyticsSummary(userId);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    console.error('Analytics Summary Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve summary analytics' });
  }
}

export async function getMonthly(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const monthly = await analyticsService.getMonthlyAnalytics(userId);
    res.json({ success: true, data: monthly });
  } catch (err: any) {
    console.error('Analytics Monthly Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve monthly analytics' });
  }
}

export async function getCategories(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const categories = await analyticsService.getCategoryAnalytics(userId);
    res.json({ success: true, data: categories });
  } catch (err: any) {
    console.error('Analytics Categories Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve category analytics' });
  }
}

export async function getBudgetStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const budgetStatus = await analyticsService.getBudgetStatusAnalytics(userId);
    res.json({ success: true, data: budgetStatus });
  } catch (err: any) {
    console.error('Analytics Budget Status Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve budget status analytics' });
  }
}

export async function getSavings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const savings = await analyticsService.getSavingsAnalytics(userId);
    res.json({ success: true, data: savings });
  } catch (err: any) {
    console.error('Analytics Savings Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve savings analytics' });
  }
}
