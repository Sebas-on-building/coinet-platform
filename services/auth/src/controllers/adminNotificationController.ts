import { Request, Response } from 'express';
import { sendAdminNotificationEmail } from '../services/emailService';

export async function notifyUser(req: Request, res: Response) {
  const { to, subject, message } = req.body;
  await sendAdminNotificationEmail(to, subject, message);
  res.json({ success: true });
}

export async function notifyAdmin(req: Request, res: Response) {
  const { to, subject, message } = req.body;
  await sendAdminNotificationEmail(to, subject, message);
  res.json({ success: true });
} 