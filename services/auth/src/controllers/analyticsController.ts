import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function trackEvent(req: Request, res: Response) {
  const { event, meta } = req.body;
  const userId = req.user?.id || null;
  await prisma.analyticsEvent.create({ data: { userId, event, meta } });
  res.json({ success: true });
}

export async function getUserEvents(req: Request, res: Response) {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
  const events = await prisma.analyticsEvent.findMany({ where: { userId: req.user.id }, orderBy: { timestamp: 'desc' }, take: 100 });
  res.json({ events });
} 