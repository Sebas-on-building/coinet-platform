import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function inviteReferral(req: Request, res: Response) {
  const { referrerId, refereeEmail } = req.body;
  const referral = await prisma.referral.create({ data: { referrerId } });
  // Send referral email logic here (reuse existing service)
  res.json({ success: true, referralId: referral.id });
}

export async function acceptReferral(req: Request, res: Response) {
  const { referralId, refereeId } = req.body;
  const referral = await prisma.referral.update({ where: { id: referralId }, data: { refereeId, acceptedAt: new Date() } });
  res.json({ success: true, referral });
}

export async function rewardReferral(req: Request, res: Response) {
  const { referralId, rewardType } = req.body;
  const referral = await prisma.referral.update({ where: { id: referralId }, data: { rewardGiven: true, rewardType } });
  res.json({ success: true, referral });
}

export async function getReferralStats(req: Request, res: Response) {
  const total = await prisma.referral.count();
  const rewarded = await prisma.referral.count({ where: { rewardGiven: true } });
  res.json({ total, rewarded });
} 