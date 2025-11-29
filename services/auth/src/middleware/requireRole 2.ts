import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.sendStatus(401);
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { roles: true } });
    if (!user || !user.roles.some(r => r.name === role)) return res.sendStatus(403);
    next();
  };
}

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.sendStatus(401);
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { roles: { include: { permissions: true } } } });
    const hasPermission = user?.roles.some(role => role.permissions.some(p => p.name === permission));
    if (!hasPermission) return res.sendStatus(403);
    next();
  };
} 