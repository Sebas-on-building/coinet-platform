import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuditService } from './auditService';

const prisma = new PrismaClient();

export const UserService = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      await AuditService.log(null, 'login_failed', email);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    await AuditService.log(user.id, 'login_success');
    res.json({ token });
  },
  async register(req: Request, res: Response) {
    const { email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'User exists' });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash, role: 'USER' } });
    await AuditService.log(user.id, 'register');
    res.status(201).json({ id: user.id, email: user.email });
  },
  async googleCallback(req: any, res: Response) {
    // Assume passport attaches user
    const token = jwt.sign({ id: req.user.id, role: req.user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    await AuditService.log(req.user.id, 'google_login');
    res.redirect(`/auth/success?token=${token}`);
  },
  async appleCallback(req: any, res: Response) {
    const token = jwt.sign({ id: req.user.id, role: req.user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    await AuditService.log(req.user.id, 'apple_login');
    res.redirect(`/auth/success?token=${token}`);
  },
  async me(req: Request, res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!);
      if (typeof payload !== 'string' && payload) {
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        res.json({ id: user.id, email: user.email, role: user.role });
      } else {
        res.status(401).json({ error: 'Unauthorized' });
      }
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
    }
  },
  async getProfile(req: any, res: Response) {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ id: user.id, email: user.email, role: user.role });
  },
  async updateProfile(req: any, res: Response) {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { name } = req.body;
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { name } });
    await AuditService.log(user.id, 'profile_updated');
    res.json({ id: user.id, email: user.email, name: user.name });
  },
  async changePassword(req: any, res: Response) {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { oldPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });
    await AuditService.log(user.id, 'password_changed');
    res.json({ success: true });
  },
  async deleteAccount(req: any, res: Response) {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await prisma.user.delete({ where: { id: req.user.id } });
    await AuditService.log(req.user.id, 'account_deleted');
    res.json({ success: true });
  },
  async assignRole(req: Request, res: Response) {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { userId, role } = req.body;
    const user = await prisma.user.update({ where: { id: userId }, data: { role } });
    await AuditService.log(req.user.id, 'role_assigned', `Assigned ${role} to ${userId}`);
    res.json({ id: user.id, role: user.role });
  },
  async checkRole(req: any, res: Response) {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json({ role: req.user.role });
  },
  async listRoles(req: Request, res: Response) {
    res.json(['ADMIN', 'MODERATOR', 'USER', 'AUTHOR']);
  },
}; 