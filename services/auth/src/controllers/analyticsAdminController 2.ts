import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getAggregateStats(req: Request, res: Response) {
  const totalUsers = await prisma.user.count();
  const totalBadges = await prisma.badge.count();
  const totalEvents = await prisma.analyticsEvent.count();
  res.json({ totalUsers, totalBadges, totalEvents });
} 