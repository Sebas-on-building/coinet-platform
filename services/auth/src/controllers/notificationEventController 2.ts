import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function sendNotification(req: Request, res: Response) {
  const { userId, type, channel, content, meta, abTestId } = req.body;
  const event = await prisma.notificationEvent.create({ data: { userId, type, channel, content, meta, abTestId } });
  res.json({ success: true, event });
}

export async function markAsRead(req: Request, res: Response) {
  const { eventId } = req.body;
  const event = await prisma.notificationEvent.update({ where: { id: eventId }, data: { read: true } });
  res.json({ success: true, event });
}

export async function getNotificationStats(req: Request, res: Response) {
  const { userId } = req.query;
  const unread = await prisma.notificationEvent.count({ where: { userId: String(userId), read: false } });
  const total = await prisma.notificationEvent.count({ where: { userId: String(userId) } });
  res.json({ unread, total });
}

export async function abTestNotification(req: Request, res: Response) {
  const { userId, type, channel, content, variant } = req.body;
  // Create A/B test record
  const abTest = await prisma.aBTest.create({ data: { name: type, variant, userId, event: undefined } });
  // Send notification event
  const event = await prisma.notificationEvent.create({ data: { userId, type, channel, content, abTestId: abTest.id } });
  res.json({ success: true, abTest, event });
} 