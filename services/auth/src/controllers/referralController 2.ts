import { Request, Response } from 'express';
import { sendReferralEmail } from '../services/emailService';

export async function sendReferralInvite(req: Request, res: Response) {
  const { to, referrer, referralLink } = req.body;
  await sendReferralEmail(to, referrer, referralLink);
  res.json({ success: true });
}

// Future: Accept referral, track analytics, reward both users, etc. 