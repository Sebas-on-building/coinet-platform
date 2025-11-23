import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyOTP } from '../../../../services/otpService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, otp, deviceFingerprint } = req.body;
  if (!userId || !otp) return res.status(400).json({ error: 'Missing required fields' });
  // TODO: Analytics: log verify attempt
  // TODO: Device fingerprinting: store deviceFingerprint
  try {
    const verified = await verifyOTP({ userId, otp });
    // TODO: Compliance: log verification in DB, return log ID
    res.status(200).json({ verified, complianceLogId: 'stub-log-id' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
  // TODO: Add extensibility hooks, analytics, compliance export
} 