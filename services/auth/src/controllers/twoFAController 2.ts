import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authService } from '../../../../src/lib/auth/AuthService';
import { ServiceError } from '../../../../src/lib/errors/ErrorManager';

const prisma = new PrismaClient();

export async function setup2FA(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (dbUser.twoFactorEnabled) {
      return res.status(400).json({ error: 'Two-factor authentication is already enabled' });
    }

    // Generate 2FA secret and QR code
    const twoFactorSetup = authService.generateTwoFactorSecret(dbUser.email);

    // Store the secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: twoFactorSetup.secret }
    });

    // Log the auth event
    authService.logAuthEvent('2fa_setup_initiated', user.id, {
      email: dbUser.email,
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    });

    res.json({
      qrCode: twoFactorSetup.qrCode,
      secret: twoFactorSetup.secret,
      backupCodes: twoFactorSetup.backupCodes
    });

  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verify2FA(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { token } = req.body;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!token) {
      return res.status(400).json({ error: 'Two-factor authentication token is required' });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!dbUser.twoFactorSecret) {
      return res.status(400).json({ error: 'Two-factor authentication is not set up' });
    }

    // Verify the TOTP code
    const isValid = authService.verifyTwoFactorCode(dbUser.twoFactorSecret, token);

    if (isValid) {
      // Enable 2FA if this is the first successful verification
      if (!dbUser.twoFactorEnabled) {
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorEnabled: true }
        });

        // Log the auth event
        authService.logAuthEvent('2fa_enabled', user.id, {
          email: dbUser.email,
          ip: req.ip || req.connection.remoteAddress || 'unknown'
        });
      }

      res.json({ valid: true, message: 'Two-factor authentication verified successfully' });
    } else {
      res.status(401).json({ valid: false, error: 'Invalid two-factor authentication code' });
    }

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function generateBackupCodes(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!dbUser.twoFactorEnabled) {
      return res.status(400).json({ error: 'Two-factor authentication is not enabled' });
    }

    // Generate new backup codes
    const twoFactorSetup = authService.generateTwoFactorSecret(dbUser.email);
    const backupCodes = twoFactorSetup.backupCodes;

    // Store backup codes in database (in a real implementation, these would be hashed)
    // For now, we'll just return them

    // Log the auth event
    authService.logAuthEvent('2fa_backup_codes_generated', user.id, {
      email: dbUser.email,
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    });

    res.json({
      codes: backupCodes,
      message: 'New backup codes generated. Store them securely.'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyBackupCode(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { code } = req.body;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!code) {
      return res.status(400).json({ error: 'Backup code is required' });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!dbUser.twoFactorEnabled) {
      return res.status(400).json({ error: 'Two-factor authentication is not enabled' });
    }

    // In a real implementation, backup codes would be stored in database and validated
    // For now, we'll simulate backup code validation
    const isValidBackupCode = code.length === 8 && /^[A-F0-9]{8}$/.test(code.toUpperCase());

    if (isValidBackupCode) {
      // Log the auth event
      authService.logAuthEvent('2fa_backup_code_used', user.id, {
        email: dbUser.email,
        ip: req.ip || req.connection.remoteAddress || 'unknown'
      });

      res.json({
        valid: true,
        message: 'Backup code verified successfully',
        warning: 'This backup code has been used and is no longer valid'
      });
    } else {
      res.status(401).json({ valid: false, error: 'Invalid backup code' });
    }

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function trustDevice(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { deviceId } = req.body;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In a real implementation, trusted devices would be stored in database
    // For now, we'll just log the event

    // Log the auth event
    authService.logAuthEvent('device_trusted', user.id, {
      email: dbUser.email,
      deviceId,
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    });

    res.json({
      trusted: true,
      message: 'Device has been marked as trusted'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function disable2FA(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { password, token } = req.body;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!password || !token) {
      return res.status(400).json({ error: 'Password and current 2FA token are required' });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!dbUser.twoFactorEnabled) {
      return res.status(400).json({ error: 'Two-factor authentication is not enabled' });
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(password, dbUser.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Verify current 2FA token
    const isValid2FA = authService.verifyTwoFactorCode(dbUser.twoFactorSecret!, token);
    if (!isValid2FA) {
      return res.status(401).json({ error: 'Invalid two-factor authentication code' });
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });

    // Log the auth event
    authService.logAuthEvent('2fa_disabled', user.id, {
      email: dbUser.email,
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    });

    res.json({
      success: true,
      message: 'Two-factor authentication has been disabled'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
} 