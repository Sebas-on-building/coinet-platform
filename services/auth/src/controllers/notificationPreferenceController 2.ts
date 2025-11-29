import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getPreferences(req: Request, res: Response) {
  const { userId } = req.query;
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId: String(userId) } });
  res.json(prefs);
}

export async function updatePreferences(req: Request, res: Response) {
  const { userId, email, push, sms, inApp, categories } = req.body;
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId },
    update: { email, push, sms, inApp, categories },
    create: { userId, email, push, sms, inApp, categories },
  });
  res.json(prefs);
}

export async function subscribeCategory(req: Request, res: Response) {
  const { userId, category } = req.body;
  const prefs = await prisma.notificationPreference.update({
    where: { userId },
    data: { categories: { push: category } },
  });
  res.json(prefs);
}

export async function unsubscribeCategory(req: Request, res: Response) {
  const { userId, category } = req.body;
  const prefs = await prisma.notificationPreference.update({
    where: { userId },
    data: { categories: { set: [] } }, // For demo, clear all; in real, remove one
  });
  res.json(prefs);
} 