import type { NextApiRequest, NextApiResponse } from 'next';
import { sendOTP } from '../../../../services/otpService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, phone, email, deviceFingerprint } = req.body;
  if (!userId || (!phone && !email)) return res.status(400).json({ error: 'Missing required fields' });
  // TODO: Analytics: log send attempt
  // TODO: Device fingerprinting: store deviceFingerprint
  try {
    const result = await sendOTP({ userId, phone, email });
    // TODO: Compliance: log delivery in DB, return log ID
    res.status(200).json({ ...result, complianceLogId: 'stub-log-id' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
  // TODO: Add extensibility hooks, analytics, compliance export
} 