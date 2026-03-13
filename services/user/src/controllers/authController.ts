/**
 * Authentication Controller - Industry-Leading Security
 * Advanced authentication with JWT, 2FA, session management,
 * and comprehensive security features
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from 'winston';
import { getJwtSecret } from '../getJwtSecret';

const prisma = new PrismaClient();
const logger = createLogger({
  level: 'info',
  defaultMeta: { service: 'auth-controller' }
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  id?: string;
}

export class AuthController {
  /**
   * User registration with comprehensive validation
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, referralCode } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        res.status(400).json({
          error: 'User already exists',
          message: 'An account with this email already exists'
        });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate verification token
      const verificationToken = uuidv4();

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: passwordHash,
          name,
          verificationToken,
          role: 'USER',
          tier: 'free',
          referralCode: referralCode || null
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tier: true,
          createdAt: true
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      // Create session
      await prisma.session.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          token,
          deviceInfo: req.get('User-Agent') || 'unknown',
          ipAddress: req.ip || 'unknown',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Log successful registration
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_REGISTERED',
          details: { email: user.email, referralCode },
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        requestId: (req as any).id
      });

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
          expiresIn: '7d'
        },
        message: 'Registration successful. Please check your email to verify your account.'
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration'
      });
    }
  }

  /**
   * User login with security features
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, twoFactorCode, deviceInfo } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          role: true,
          tier: true,
          active: true,
          isSuspended: true,
          isVerified: true,
          isTwoFactorEnabled: true,
          twoFASecret: true,
          loginAttempts: true,
          lockedUntil: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        // Log failed attempt
        await prisma.auditLog.create({
          data: {
            userId: null,
            action: 'LOGIN_FAILED',
            details: { email, reason: 'user_not_found' },
            ipAddress: req.ip || 'unknown'
          }
        });

        res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
        return;
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        res.status(423).json({
          error: 'Account locked',
          message: 'Account is temporarily locked due to too many failed attempts',
          lockedUntil: user.lockedUntil
        });
        return;
      }

      // Check if account is suspended
      if (user.isSuspended) {
        res.status(423).json({
          error: 'Account suspended',
          message: 'Your account has been suspended. Please contact support.'
        });
        return;
      }

      // Check if account is active
      if (!user.active) {
        res.status(423).json({
          error: 'Account inactive',
          message: 'Your account is inactive. Please contact support.'
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        // Increment login attempts
        const attempts = (user.loginAttempts || 0) + 1;
        const lockAccount = attempts >= 5;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: attempts,
            lockedUntil: lockAccount ? new Date(Date.now() + 30 * 60 * 1000) : null // 30 minutes
          }
        });

        // Log failed attempt
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_FAILED',
            details: { email, reason: 'invalid_password', attempts },
            ipAddress: req.ip || 'unknown'
          }
        });

        res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
          attemptsRemaining: lockAccount ? 0 : 5 - attempts
        });
        return;
      }

      // Check 2FA if enabled
      if (user.isTwoFactorEnabled) {
        if (!twoFactorCode) {
          res.status(200).json({
            success: false,
            requiresTwoFactor: true,
            message: 'Two-factor authentication code required'
          });
          return;
        }

        const isValid2FA = speakeasy.totp.verify({
          secret: user.twoFASecret!,
          encoding: 'base32',
          token: twoFactorCode,
          window: 2 // Allow 2 time steps (60 seconds)
        });

        if (!isValid2FA) {
          // Log failed 2FA attempt
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'TWO_FACTOR_FAILED',
              details: { email },
              ipAddress: req.ip || 'unknown'
            }
          });

          res.status(401).json({
            error: 'Invalid two-factor code',
            message: 'The two-factor authentication code is invalid or expired'
          });
          return;
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          tier: user.tier
        },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      // Generate refresh token
      const refreshToken = uuidv4();

      // Create session
      await prisma.session.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          token,
          refreshToken,
          deviceInfo: deviceInfo || req.get('User-Agent') || 'unknown',
          ipAddress: req.ip || 'unknown',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Reset login attempts and update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date()
        }
      });

      // Log successful login
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN',
          details: { email, deviceInfo, twoFactorUsed: user.isTwoFactorEnabled },
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        twoFactorUsed: user.isTwoFactorEnabled,
        requestId: (req as any).id
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tier: user.tier,
            isVerified: user.isVerified,
            isTwoFactorEnabled: user.isTwoFactorEnabled
          },
          token,
          refreshToken,
          expiresIn: '7d'
        },
        message: 'Login successful'
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login'
      });
    }
  }

  /**
   * User logout
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (userId && token) {
        // Invalidate session
        await prisma.session.updateMany({
          where: { userId, token },
          data: { isActive: false }
        });

        // Log logout
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'USER_LOGOUT',
            details: {},
            ipAddress: req.ip || 'unknown'
          }
        });

        logger.info('User logged out', { userId, requestId: req.id });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        requestId: (req as any).id
      });
    }
  }

  /**
   * Refresh JWT token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Refresh token required',
          message: 'Please provide a refresh token'
        });
        return;
      }

      // Find session
      const session = await prisma.session.findFirst({
        where: {
          refreshToken,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                tier: true,
                active: true,
                isSuspended: true
              }
            }
          }
      });

      if (!session || !session.user.active || session.user.isSuspended) {
        res.status(401).json({
          error: 'Invalid refresh token',
          message: 'The refresh token is invalid or expired'
        });
        return;
      }

      // Generate new JWT token
      const newToken = jwt.sign(
        { 
          userId: session.user.id, 
          email: session.user.email, 
          role: session.user.role,
          tier: session.user.tier
        },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      // Update session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: newToken,
          lastActivity: new Date()
        }
      });

      logger.info('Token refreshed', {
        userId: session.user.id,
        requestId: (req as any).id
      });

      res.json({
        success: true,
        data: {
          token: newToken,
          expiresIn: '7d'
        },
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Token refresh failed',
        requestId: (req as any).id
      });
    }
  }

  /**
   * Forgot password
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      // Always return success for security (don't reveal if email exists)
      if (user) {
        // Generate reset token
        const resetToken = uuidv4();
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: resetToken,
            passwordResetExpires: resetExpires
          }
        });

        // Log password reset request
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'PASSWORD_RESET_REQUESTED',
            details: { email },
            ipAddress: req.ip || 'unknown'
          }
        });

        // TODO: Send email with reset link
        logger.info('Password reset requested', {
          userId: user.id,
          email,
          requestId: (req as any).id
        });
      }

      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Password reset request failed',
        requestId: (req as any).id
      });
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: { gt: new Date() }
        }
      });

      if (!user) {
        res.status(400).json({
          error: 'Invalid or expired reset token',
          message: 'The password reset token is invalid or has expired'
        });
        return;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date()
        }
      });

      // Invalidate all existing sessions for security
      await prisma.session.updateMany({
        where: { userId: user.id },
        data: { isActive: false }
      });

      // Log password reset
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_COMPLETED',
          details: {},
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('Password reset completed', {
        userId: user.id,
        requestId: (req as any).id
      });

      res.json({
        success: true,
        message: 'Password reset successful. Please log in with your new password.'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({
        error: 'Password reset failed',
        requestId: (req as any).id
      });
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      const user = await prisma.user.findFirst({
        where: { verificationToken: token }
      });

      if (!user) {
        res.status(400).json({
          error: 'Invalid verification token',
          message: 'The email verification token is invalid'
        });
        return;
      }

      // Update user as verified
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verificationToken: null,
          verifiedAt: new Date()
        }
      });

      // Log email verification
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'EMAIL_VERIFIED',
          details: {},
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('Email verified', {
        userId: user.id,
        requestId: (req as any).id
      });

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(500).json({
        error: 'Email verification failed',
        requestId: (req as any).id
      });
    }
  }
}

export default AuthController;
