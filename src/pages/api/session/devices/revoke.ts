import type { NextApiRequest, NextApiResponse } from 'next';
import { revokeDevice } from '@/utils/sessionUtils';
import { t } from '@/utils/i18n';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: t('error.method_not_allowed') });
  // TODO: Get userId from session/auth middleware
  const userId = req.headers['x-user-id'] as string; // Replace with real auth
  const { deviceId } = req.body;
  if (!userId || !deviceId) return res.status(400).json({ error: t('error.missing_fields') });
  try {
    await revokeDevice(userId, deviceId);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: t('error.server_error') });
  }
} 