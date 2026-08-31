import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import * as reportService from '../services/reportService.js';

export async function getMonthly(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const month = req.query.month ? parseInt(String(req.query.month), 10) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : now.getFullYear();

    const report = await reportService.getMonthlyReport(userId, month, year);
    res.json({ success: true, data: report });
  } catch (err: any) {
    console.error('Monthly Report Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate monthly report' });
  }
}

export async function getYearly(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();

    const report = await reportService.getYearlyReport(userId, year);
    res.json({ success: true, data: report });
  } catch (err: any) {
    console.error('Yearly Report Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate yearly report' });
  }
}

export async function getCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const report = await reportService.getCategoryReport(
      userId,
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined
    );
    res.json({ success: true, data: report });
  } catch (err: any) {
    console.error('Category Report Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate category report' });
  }
}

export async function exportCSV(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const csvContent = await reportService.exportTransactionsCSV(userId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="financial_transactions.csv"');
    res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('Export CSV Error:', err);
    res.status(500).json({ success: false, message: 'Failed to export CSV file' });
  }
}
