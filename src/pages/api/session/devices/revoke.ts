import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { revokeDevice } from '@/utils/sessionUtils';
import { t } from '@/utils/i18n';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: t('error.method_not_allowed') });

  const { userId } = getAuth(req);
  const { deviceId } = req.body as { deviceId?: string };
  if (!userId || !deviceId) return res.status(400).json({ error: t('error.missing_fields') });

  try {
    await revokeDevice(userId, deviceId);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: t('error.server_error') });
  }
} 