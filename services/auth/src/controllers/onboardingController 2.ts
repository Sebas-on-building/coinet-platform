import { Request, Response } from 'express';
import { sendOnboardingEmail } from '../services/emailService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function onboardingStep1(req: Request, res: Response) {
  const { email, userName } = req.body;
  const ctaLink = `${process.env.FRONTEND_URL || 'https://coinet.com'}/onboarding/step2`;
  await sendOnboardingEmail(email, userName, '1', ctaLink);
  res.json({ success: true, step: 1 });
}

export async function onboardingStep2(req: Request, res: Response) {
  const { email, userName } = req.body;
  const ctaLink = `${process.env.FRONTEND_URL || 'https://coinet.com'}/onboarding/step3`;
  await sendOnboardingEmail(email, userName, '2', ctaLink);
  res.json({ success: true, step: 2 });
}

export async function onboardingStep3(req: Request, res: Response) {
  const { email, userName } = req.body;
  const ctaLink = `${process.env.FRONTEND_URL || 'https://coinet.com'}/dashboard`;
  await sendOnboardingEmail(email, userName, '3', ctaLink);
  res.json({ success: true, step: 3 });
}

export async function getOnboardingProgress(req: Request, res: Response) {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
  const steps = await prisma.onboardingStep.findMany({ where: { userId: req.user.id } });
  res.json({ steps });
}

export async function completeOnboardingStep(req: Request, res: Response) {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
  const { step, meta } = req.body;
  await prisma.onboardingStep.upsert({
    where: { userId_step: { userId: req.user.id, step } },
    update: { completed: true, meta },
    create: { userId: req.user.id, step, completed: true, meta },
  });
  res.json({ success: true });
} 