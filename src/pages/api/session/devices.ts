import type { NextApiRequest, NextApiResponse } from 'next';
import { listUserDevices } from '../../utils/sessionUtils';
import { t } from '../../utils/i18n';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: t('error.method_not_allowed') });
  // TODO: Get userId from session/auth middleware
  const userId = req.headers['x-user-id'] as string; // Replace with real auth
  if (!userId) return res.status(401).json({ error: t('error.unauthorized') });
  try {
    const devices = await listUserDevices(userId);
    res.status(200).json({ devices });
  } catch (err) {
    res.status(500).json({ error: t('error.server_error') });
  }
} 