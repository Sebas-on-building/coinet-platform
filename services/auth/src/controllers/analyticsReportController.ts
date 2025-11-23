import { Request, Response } from 'express';
import { sendAnalyticsReportEmail } from '../services/emailService';

export async function sendWeeklyReport(req: Request, res: Response) {
  const { email, userName, reportSummary, dashboardLink } = req.body;
  await sendAnalyticsReportEmail(email, userName, reportSummary, dashboardLink);
  res.json({ success: true, type: 'weekly' });
}

export async function sendMonthlyReport(req: Request, res: Response) {
  const { email, userName, reportSummary, dashboardLink } = req.body;
  await sendAnalyticsReportEmail(email, userName, reportSummary, dashboardLink);
  res.json({ success: true, type: 'monthly' });
}

// Future: Custom report, real-time analytics, etc. 