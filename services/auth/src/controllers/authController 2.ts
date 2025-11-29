import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { sendWelcomeEmail, sendAlertEmail } from '../services/emailService';
import { authService, User, LoginCredentials, RegisterCredentials } from '../../../../src/lib/auth/AuthService';
import { AuthError, ServiceError } from '../../../../src/lib/errors/ErrorManager';

const prisma = new PrismaClient();

export async function signup(req: Request, res: Response) {
  try {
    const { email, password, confirmPassword, acceptTerms } = req.body;

    // Validate input
    if (!email || !password || !confirmPassword || !acceptTerms) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!acceptTerms) {
      return res.status(400).json({ error: 'You must accept the terms and conditions' });
    }

    // Validate password strength
    const passwordValidation = authService.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const passwordHash = await authService.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash,
        role: 'user',
        isVerified: false,
        twoFactorEnabled: false,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Send welcome email
    await sendWelcomeEmail(email, email.split('@')[0]);

    // Create session and generate tokens
    const deviceInfo = {
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      fingerprint: req.headers['x-fingerprint'] as string
    };

    const sessionId = authService.createSession(user.id, deviceInfo);
    const tokens = authService.generateTokens(user as User, sessionId);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Log the auth event
    authService.logAuthEvent('user_signup', user.id, { email, ip: deviceInfo.ip });

    res.status(201).json({
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password, twoFactorCode, rememberMe } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check account lockout
    const isLocked = await authService.checkAccountLockout(user as User);
    if (isLocked) {
      return res.status(423).json({
        error: 'Account is temporarily locked due to too many failed attempts',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      await authService.incrementLoginAttempts(user.id);

      // Send alert email for failed login
      await sendAlertEmail(email, 'Suspicious Login Attempt',
        'There was a failed login attempt to your Coinet account. If this was not you, please reset your password.');

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(400).json({
          error: 'Two-factor authentication code required',
          code: 'TWO_FACTOR_REQUIRED'
        });
      }

      const isValid2FA = authService.verifyTwoFactorCode(user.twoFactorSecret!, twoFactorCode);
      if (!isValid2FA) {
        return res.status(401).json({ error: 'Invalid two-factor authentication code' });
      }
    }

    // Reset login attempts on successful login
    await authService.resetLoginAttempts(user.id);

    // Create session and generate tokens
    const deviceInfo = {
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      fingerprint: req.headers['x-fingerprint'] as string
    };

    const sessionId = authService.createSession(user.id, deviceInfo);
    const tokens = authService.generateTokens(user as User, sessionId);

    // Set refresh token as HTTP-only cookie
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 30 days or 7 days
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Log the auth event
    authService.logAuthEvent('user_login', user.id, {
      email,
      ip: deviceInfo.ip,
      userAgent: deviceInfo.userAgent,
      twoFactorUsed: user.twoFactorEnabled
    });

    res.json({
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error) {
    if (error instanceof AuthError || error instanceof ServiceError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    // Use AuthService to refresh the token
    const newTokens = await authService.refreshAccessToken(refreshToken);

    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', newTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken: newTokens.accessToken,
      expiresIn: newTokens.expiresIn
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({
        error: error.message,
        code: error.code
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies.refreshToken;
    const user = (req as any).user;

    if (refreshToken) {
      // This would normally revoke the refresh token from the database
      // For now, we'll just clear the cookie
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      }).catch(() => { });
    }

    // Revoke session if user is authenticated
    if (user?.sessionId) {
      authService.revokeSession(user.sessionId);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    // Log the auth event
    if (user?.id) {
      authService.logAuthEvent('user_logout', user.id, {
        ip: req.ip || req.connection.remoteAddress || 'unknown'
      });
    }

    res.json({ success: true });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
} 