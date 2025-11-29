import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import validator from 'validator';
import { sendPasswordResetEmail, sendAlertEmail } from '../services/emailService';
import { authService } from '../../../../src/lib/auth/AuthService';
import { ServiceError } from '../../../../src/lib/errors/ErrorManager';

const prisma = new PrismaClient();

export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent user enumeration
    if (!user) {
      return res.status(200).json({ success: true });
    }

    // Check if user is locked out
    const isLocked = await authService.checkAccountLockout(user as any);
    if (isLocked) {
      return res.status(423).json({
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    });

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL || 'https://coinet.com'}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetLink);

    // Log the auth event
    authService.logAuthEvent('password_reset_requested', user.id, {
      email,
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    });

    res.json({ success: true });

  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate password strength using AuthService
    const passwordValidation = authService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // Find and validate reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = resetToken.user;
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Hash the new password using AuthService
    const passwordHash = await authService.hashPassword(newPassword);

    // Update user password using the correct field name
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: passwordHash }
    });

    // Mark reset token as used
    await prisma.passwordResetToken.update({
      where: { token },
      data: { used: true }
    });

    // Revoke all existing sessions for security
    const sessions = authService.getUserSessions(user.id);
    sessions.forEach(session => {
      authService.revokeSession(session.sessionId);
    });

    // Send alert email for password change
    await sendAlertEmail(
      user.email,
      'Your Coinet password was changed',
      'Your password was successfully changed. If this was not you, please contact support immediately.'
    );

    // Log the auth event
    authService.logAuthEvent('password_reset_completed', user.id, {
      email: user.email,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      sessionsRevoked: sessions.length
    });

    res.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.'
    });

  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
} 