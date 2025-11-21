import type { NextApiRequest, NextApiResponse } from 'next';
import { ReferralCodeModel } from '../../../models/referral';
import { t } from '../../../utils/i18n';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: t('error.method_not_allowed') });
  const { code } = req.query;
  if (!code || typeof code !== 'string') return res.status(400).json({ error: t('error.invalid_code') });
  try {
    const referral = await ReferralCodeModel.findByCode(code);
    if (!referral) return res.status(404).json({ error: t('error.not_found') });
    // TODO: Populate creator info, usage stats, extensibility
    res.status(200).json({
      code: referral.code,
      creatorId: referral.creatorId,
      uses: referral.uses,
      maxUses: referral.maxUses,
      isActive: referral.isActive,
      expiresAt: referral.expiresAt,
      notes: referral.notes,
      createdAt: referral.createdAt,
      // TODO: Add more fields as needed
    });
  } catch (err) {
    res.status(500).json({ error: t('error.server_error') });
  }
} 