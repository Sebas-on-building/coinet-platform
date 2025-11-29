import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function trackStepCompletion(req: Request, res: Response) {
  const { userId, step } = req.body;
  await prisma.onboardingAnalytics.create({ data: { userId, step, completed: true } });
  res.json({ success: true });
}

export async function trackDropOff(req: Request, res: Response) {
  const { userId, step } = req.body;
  await prisma.onboardingAnalytics.create({ data: { userId, step, droppedOff: true } });
  res.json({ success: true });
}

export async function getOnboardingStats(req: Request, res: Response) {
  const { step } = req.query;
  const completed = await prisma.onboardingAnalytics.count({ where: { step: Number(step), completed: true } });
  const droppedOff = await prisma.onboardingAnalytics.count({ where: { step: Number(step), droppedOff: true } });
  res.json({ step, completed, droppedOff });
} 