import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listUsers(req: Request, res: Response) {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, createdAt: true } });
  res.json({ users });
}

export async function getUser(req: Request, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, createdAt: true, updatedAt: true } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { email, role } = req.body;
  const user = await prisma.user.update({ where: { id }, data: { email, role } });
  res.json(user);
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  res.json({ success: true });
}

export async function getUserAnalytics(req: Request, res: Response) {
  const total = await prisma.user.count();
  const byRole = await prisma.user.groupBy({ by: ['role'], _count: { role: true } });
  res.json({ total, byRole });
}

export async function setUserRole(req: Request, res: Response) {
  const { userId, role } = req.body;
  await prisma.user.update({ where: { id: userId }, data: { role } });
  res.json({ success: true });
}

export async function getAuditLogs(req: Request, res: Response) {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ logs });
} 