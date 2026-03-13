import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { listUserDevices } from '../../../utils/sessionUtils';
import { t } from '../../../utils/i18n';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: t('error.method_not_allowed') });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: t('error.unauthorized') });

  try {
    const devices = await listUserDevices(userId);
    res.status(200).json({ devices });
  } catch (err) {
    res.status(500).json({ error: t('error.server_error') });
  }
} 