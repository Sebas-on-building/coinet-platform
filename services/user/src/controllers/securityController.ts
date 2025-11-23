/**
 * Security Controller - Industry-Leading Security Features
 * 2FA, API keys, session management, and advanced security
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { createLogger } from 'winston';
import crypto from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger({
  level: 'info',
  defaultMeta: { service: 'security-controller' }
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  id?: string;
}

export class SecurityController {
  /**
   * Setup Two-Factor Authentication
   */
  static async setup2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, isTwoFactorEnabled: true }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.isTwoFactorEnabled) {
        res.status(400).json({
          error: 'Two-factor authentication already enabled',
          message: 'Please disable 2FA first before setting up a new one'
        });
        return;
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Coinet AI (${user.email})`,
        issuer: 'Coinet AI',
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      // Store secret temporarily (not enabled until verified)
      await prisma.user.update({
        where: { id: userId },
        data: { twoFASecret: secret.base32 }
      });

      logger.info('2FA setup initiated', { userId, requestId: req.id });

      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl,
          manualEntryKey: secret.base32,
          backupCodes: [] // Will be generated after verification
        },
        message: 'Scan the QR code with your authenticator app and verify to enable 2FA'
      });
    } catch (error) {
      logger.error('2FA setup error:', error);
      res.status(500).json({
        error: 'Failed to setup 2FA',
        requestId: req.id
      });
    }
  }

  /**
   * Verify and enable Two-Factor Authentication
   */
  static async verify2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { code } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFASecret: true, isTwoFactorEnabled: true }
      });

      if (!user?.twoFASecret) {
        res.status(400).json({
          error: 'No 2FA setup in progress',
          message: 'Please initiate 2FA setup first'
        });
        return;
      }

      // Verify the code
      const isValid = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!isValid) {
        res.status(400).json({
          error: 'Invalid verification code',
          message: 'The code you entered is invalid or expired'
        });
        return;
      }

      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => bcrypt.hash(code, 10))
      );

      // Enable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          isTwoFactorEnabled: true,
          twoFactorBackupCodes: hashedBackupCodes,
          updatedAt: new Date()
        }
      });

      // Log 2FA enablement
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'TWO_FACTOR_ENABLED',
          details: {},
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('2FA enabled successfully', { userId, requestId: req.id });

      res.json({
        success: true,
        data: {
          backupCodes,
          enabled: true
        },
        message: 'Two-factor authentication enabled successfully. Save these backup codes!'
      });
    } catch (error) {
      logger.error('2FA verification error:', error);
      res.status(500).json({
        error: 'Failed to verify 2FA',
        requestId: req.id
      });
    }
  }

  /**
   * Disable Two-Factor Authentication
   */
  static async disable2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { password, code } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          password: true, 
          twoFASecret: true, 
          isTwoFactorEnabled: true 
        }
      });

      if (!user?.isTwoFactorEnabled) {
        res.status(400).json({
          error: '2FA not enabled',
          message: 'Two-factor authentication is not enabled for this account'
        });
        return;
      }

      // Verify password
      if (!await bcrypt.compare(password, user.password)) {
        res.status(400).json({
          error: 'Invalid password',
          message: 'Please enter your current password'
        });
        return;
      }

      // Verify 2FA code
      const isValid = speakeasy.totp.verify({
        secret: user.twoFASecret!,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!isValid) {
        res.status(400).json({
          error: 'Invalid 2FA code',
          message: 'Please enter a valid code from your authenticator app'
        });
        return;
      }

      // Disable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          isTwoFactorEnabled: false,
          twoFASecret: null,
          twoFactorBackupCodes: null,
          updatedAt: new Date()
        }
      });

      // Log 2FA disablement
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'TWO_FACTOR_DISABLED',
          details: {},
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('2FA disabled', { userId, requestId: req.id });

      res.json({
        success: true,
        message: 'Two-factor authentication disabled successfully'
      });
    } catch (error) {
      logger.error('2FA disable error:', error);
      res.status(500).json({
        error: 'Failed to disable 2FA',
        requestId: req.id
      });
    }
  }

  /**
   * Generate backup codes
   */
  static async generateBackupCodes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isTwoFactorEnabled: true }
      });

      if (!user?.isTwoFactorEnabled) {
        res.status(400).json({
          error: '2FA not enabled',
          message: 'Two-factor authentication must be enabled to generate backup codes'
        });
        return;
      }

      // Generate new backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => bcrypt.hash(code, 10))
      );

      // Update user with new backup codes
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: hashedBackupCodes }
      });

      // Log backup codes generation
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'BACKUP_CODES_GENERATED',
          details: { count: backupCodes.length },
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('Backup codes generated', { userId, requestId: req.id });

      res.json({
        success: true,
        data: { backupCodes },
        message: 'New backup codes generated. Save these securely!'
      });
    } catch (error) {
      logger.error('Generate backup codes error:', error);
      res.status(500).json({
        error: 'Failed to generate backup codes',
        requestId: req.id
      });
    }
  }

  /**
   * Get security information
   */
  static async getSecurityInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const [user, activeSessions, recentLogins] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            isTwoFactorEnabled: true,
            lastLoginAt: true,
            loginAttempts: true,
            lockedUntil: true,
            createdAt: true
          }
        }),
        prisma.session.count({
          where: { userId, isActive: true }
        }),
        prisma.auditLog.findMany({
          where: {
            userId,
            action: 'USER_LOGIN'
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            ipAddress: true,
            details: true,
            createdAt: true
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          twoFactorEnabled: user?.isTwoFactorEnabled || false,
          lastLogin: user?.lastLoginAt,
          activeSessions,
          recentLogins,
          accountAge: user?.createdAt,
          securityScore: this.calculateSecurityScore(user, activeSessions)
        }
      });
    } catch (error) {
      logger.error('Get security info error:', error);
      res.status(500).json({
        error: 'Failed to fetch security information',
        requestId: req.id
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify current password
      if (!await bcrypt.compare(currentPassword, user.password)) {
        res.status(400).json({
          error: 'Invalid current password',
          message: 'Please enter your current password correctly'
        });
        return;
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: newPasswordHash,
          updatedAt: new Date()
        }
      });

      // Invalidate all other sessions for security
      await prisma.session.updateMany({
        where: { 
          userId, 
          token: { not: req.headers.authorization?.replace('Bearer ', '') || '' }
        },
        data: { isActive: false }
      });

      // Log password change
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PASSWORD_CHANGED',
          details: {},
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('Password changed', { userId, requestId: req.id });

      res.json({
        success: true,
        message: 'Password changed successfully. Other sessions have been terminated.'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        error: 'Failed to change password',
        requestId: req.id
      });
    }
  }

  /**
   * Get active sessions
   */
  static async getActiveSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sessions = await prisma.session.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          lastActivity: true,
          createdAt: true
        },
        orderBy: { lastActivity: 'desc' }
      });

      res.json({
        success: true,
        data: sessions.map(session => ({
          ...session,
          isCurrent: session.id === req.headers['x-session-id']
        }))
      });
    } catch (error) {
      logger.error('Get active sessions error:', error);
      res.status(500).json({
        error: 'Failed to fetch sessions',
        requestId: req.id
      });
    }
  }

  /**
   * Terminate session
   */
  static async terminateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await prisma.session.updateMany({
        where: { 
          id: sessionId, 
          userId 
        },
        data: { isActive: false }
      });

      // Log session termination
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SESSION_TERMINATED',
          details: { sessionId },
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('Session terminated', { userId, sessionId, requestId: req.id });

      res.json({
        success: true,
        message: 'Session terminated successfully'
      });
    } catch (error) {
      logger.error('Terminate session error:', error);
      res.status(500).json({
        error: 'Failed to terminate session',
        requestId: req.id
      });
    }
  }

  /**
   * Get API keys
   */
  static async getApiKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const apiKeys = await prisma.apiKey.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          name: true,
          keyPreview: true,
          permissions: true,
          lastUsed: true,
          expiresAt: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: apiKeys
      });
    } catch (error) {
      logger.error('Get API keys error:', error);
      res.status(500).json({
        error: 'Failed to fetch API keys',
        requestId: req.id
      });
    }
  }

  /**
   * Create API key
   */
  static async createApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, permissions, expiresInDays } = req.body;

      // Check if user already has maximum API keys
      const existingKeys = await prisma.apiKey.count({
        where: { userId, isActive: true }
      });

      const maxKeys = req.user.role === 'admin' ? 100 : 10;
      if (existingKeys >= maxKeys) {
        res.status(400).json({
          error: 'API key limit reached',
          message: `Maximum ${maxKeys} API keys allowed`
        });
        return;
      }

      // Generate API key
      const keyValue = `ck_${crypto.randomBytes(32).toString('hex')}`;
      const keyHash = await bcrypt.hash(keyValue, 10);
      const keyPreview = `${keyValue.substring(0, 8)}...${keyValue.substring(-4)}`;

      const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const apiKey = await prisma.apiKey.create({
        data: {
          id: uuidv4(),
          userId,
          name,
          keyHash,
          keyPreview,
          permissions: permissions || ['read'],
          expiresAt
        },
        select: {
          id: true,
          name: true,
          keyPreview: true,
          permissions: true,
          expiresAt: true,
          createdAt: true
        }
      });

      // Log API key creation
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'API_KEY_CREATED',
          details: { keyId: apiKey.id, name, permissions },
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('API key created', { 
        userId, 
        keyId: apiKey.id, 
        name, 
        requestId: req.id 
      });

      res.status(201).json({
        success: true,
        data: {
          ...apiKey,
          key: keyValue // Only returned once
        },
        message: 'API key created successfully. Save it securely - it won\'t be shown again!'
      });
    } catch (error) {
      logger.error('Create API key error:', error);
      res.status(500).json({
        error: 'Failed to create API key',
        requestId: req.id
      });
    }
  }

  /**
   * Revoke API key
   */
  static async revokeApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { keyId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await prisma.apiKey.updateMany({
        where: { id: keyId, userId },
        data: { 
          isActive: false,
          revokedAt: new Date()
        }
      });

      // Log API key revocation
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'API_KEY_REVOKED',
          details: { keyId },
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('API key revoked', { userId, keyId, requestId: req.id });

      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error) {
      logger.error('Revoke API key error:', error);
      res.status(500).json({
        error: 'Failed to revoke API key',
        requestId: req.id
      });
    }
  }

  /**
   * Calculate security score
   */
  private static calculateSecurityScore(user: any, activeSessions: number): number {
    let score = 0;
    
    // Base security
    score += 20;
    
    // Email verification
    if (user?.isVerified) score += 20;
    
    // Two-factor authentication
    if (user?.isTwoFactorEnabled) score += 30;
    
    // Account age (older = more secure)
    if (user?.createdAt) {
      const accountAge = Date.now() - user.createdAt.getTime();
      const daysOld = accountAge / (24 * 60 * 60 * 1000);
      if (daysOld > 30) score += 15;
      else if (daysOld > 7) score += 10;
      else if (daysOld > 1) score += 5;
    }
    
    // Session management (fewer active sessions = more secure)
    if (activeSessions <= 2) score += 10;
    else if (activeSessions <= 5) score += 5;
    
    // Recent login activity
    if (user?.lastLoginAt) {
      const daysSinceLogin = (Date.now() - user.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceLogin <= 7) score += 5;
    }

    return Math.min(score, 100);
  }
}

export default SecurityController;
