import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const ACCESS_SECRET = process.env.ACCESS_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh_secret';

export const resolvers = {
  Mutation: {
    signup: async (_: any, { email, password }: any, { res }: any) => {
      if (!validator.isEmail(email)) throw new Error('Invalid email format');
      if (!validator.isStrongPassword(password, { minLength: 8 })) throw new Error('Password not strong enough');
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new Error('Email already exists');
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({ data: { email, passwordHash } });
      const accessToken = jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
      await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });
      return { accessToken };
    },
    login: async (_: any, { email, password }: any, { res }: any) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error('Invalid credentials');
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new Error('Invalid credentials');
      const accessToken = jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
      await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });
      return { accessToken };
    },
    refreshToken: async (_: any, __: any, { req }: any) => {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) throw new Error('No refresh token');
      const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      if (!stored) throw new Error('Invalid refresh token');
      const payload: any = jwt.verify(refreshToken, REFRESH_SECRET);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new Error('User not found');
      const accessToken = jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });
      return { accessToken };
    },
    logout: async (_: any, __: any, { req, res }: any) => {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        await prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => { });
      }
      res.clearCookie('refreshToken');
      return true;
    },
    requestPasswordReset: async (_: any, { email }: any) => {
      // Mock: In production, generate token, store, and send email
      if (!validator.isEmail(email)) throw new Error('Invalid email format');
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return { success: false, message: 'User not found' };
      // Generate and store token, send email (mocked)
      return { success: true, message: 'Password reset email sent (mock)' };
    },
    resetPassword: async (_: any, { token, newPassword }: any) => {
      // Mock: In production, verify token, update password
      if (!validator.isStrongPassword(newPassword, { minLength: 8 })) throw new Error('Password not strong enough');
      // Find user by token, update password (mocked)
      return { success: true, message: 'Password reset successful (mock)' };
    },
    enable2FA: async (_: any, __: any, { req }: any) => {
      // Mock: In production, generate secret, store, return QR code
      return { qrCode: 'mock-qr-code', secret: 'mock-secret', enabled: true };
    },
    verify2FA: async (_: any, { token }: any, { req }: any) => {
      // Mock: In production, verify token, enable 2FA for user
      return { qrCode: null, secret: null, enabled: true };
    },
  },
}; 