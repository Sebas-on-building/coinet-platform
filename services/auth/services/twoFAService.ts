import { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { PrismaClient, User } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const TwoFAService = {
  async generateSecret(user: User) {
    const secret = speakeasy.generateSecret({ name: `Coinet (${user.email})` });
    await prisma.user.update({ where: { id: user.id }, data: { twoFASecret: secret.base32 } });
    return secret;
  },
  async verifyTOTP(user: User, token: string) {
    return speakeasy.totp.verify({
      secret: user.twoFASecret!,
      encoding: 'base32',
      token,
      window: 1,
    });
  },
  async generateBackupCodes(user: User) {
    const codes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
    await prisma.backupCode.createMany({
      data: codes.map(code => ({ userId: user.id, code, used: false })),
    });
    return codes;
  },
  async verifyBackupCode(user: User, code: string) {
    const backup = await prisma.backupCode.findFirst({ where: { userId: user.id, code, used: false } });
    if (!backup) return false;
    await prisma.backupCode.update({ where: { id: backup.id }, data: { used: true } });
    return true;
  },
  async trustDevice(user: User, deviceId: string) {
    await prisma.trustedDevice.create({ data: { userId: user.id, deviceId } });
  },
  async isDeviceTrusted(user: User, deviceId: string) {
    return !!(await prisma.trustedDevice.findFirst({ where: { userId: user.id, deviceId } }));
  },
  async setup(req: any, res: Response) {
    const secret = speakeasy.generateSecret({ length: 20 });
    await prisma.user.update({ where: { id: req.user.id }, data: { twoFASecret: secret.base32 } });
    const qr = await qrcode.toDataURL(secret.otpauth_url!);
    res.json({ secret: secret.base32, qr });
  },
  async verify(req: any, res: Response) {
    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.twoFASecret) {
      res.status(400).json({ error: '2FA not setup' });
      return;
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token,
    });
    if (!verified) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.json({ success: true });
  },
  async disable(req: any, res: Response) {
    await prisma.user.update({ where: { id: req.user.id }, data: { twoFASecret: null } });
    res.json({ success: true });
  },
  async getBackupCodes(req: any, res: Response) {
    // Generate or fetch backup codes
    res.json({ codes: [] });
  },
}; 