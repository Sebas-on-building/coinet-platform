import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/authenticateToken';
import { requireRole, requireAnyRole } from '../middleware/rbac';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.sendStatus(401);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, createdAt: true, updatedAt: true } });
  if (!user) return res.sendStatus(404);
  res.json(user);
});

// Admin-only route
router.get('/admin', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  res.json({ message: 'Welcome, admin!', user: (req as any).user });
});

// Analyst or admin route
router.get('/analyst', authenticateToken, requireAnyRole(['analyst', 'admin']), async (req: Request, res: Response) => {
  res.json({ message: 'Welcome, analyst or admin!', user: (req as any).user });
});

// Minimal info for any authenticated user
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ id: user.id, role: user.role });
});

export default router; 