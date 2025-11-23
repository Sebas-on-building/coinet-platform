import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getUserBadges(req: Request, res: Response) {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
  const badges = await prisma.badge.findMany({ where: { userId: req.user.id } });
  res.json({ badges });
}

export async function awardBadge(req: Request, res: Response) {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
  const { name, icon, meta } = req.body;
  const badge = await prisma.badge.create({ data: { userId: req.user.id, name, icon, meta } });
  res.json({ badge });
} 