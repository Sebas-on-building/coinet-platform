import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { z } from 'zod';

const router: Router = Router();

// Verify prisma is initialized
if (!prisma) {
  logger.error('❌ Prisma client is not initialized in auth routes');
  throw new Error('Prisma client initialization failed');
}

// Verify JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  logger.error('❌ JWT_SECRET environment variable is not set');
  throw new Error('JWT_SECRET must be configured');
}

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

// ============================================================================
// POST /auth/login
// ============================================================================
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate prisma is available
    if (!prisma) {
      logger.error('Prisma client not available');
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
      });
    }

    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email or password format',
        details: validation.error.errors,
      });
    }

    const { email, password } = validation.data;

    // Find user
    const user = await (prisma as any).user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({
        success: false,
        error: 'Account is inactive',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    await (prisma as any).user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await (prisma as any).session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        isActive: true,
      },
    });

    logger.info('User logged in', { userId: user.id, email: user.email });

    // Return response matching frontend expectations
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tier: user.tier,
          avatar: user.avatar,
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString(),
          last_sign_in_at: user.lastLoginAt?.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Login error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================================================
// POST /auth/register
// ============================================================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input format',
        details: validation.error.errors,
      });
    }

    const { email, password, name } = validation.data;

    // Check if user already exists
    const existingUser = await (prisma as any).user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await (prisma as any).user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null,
        role: 'USER',
        tier: 'FREE',
        active: true,
      },
    });

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET!;
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await (prisma as any).session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        isActive: true,
      },
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    // Return response matching frontend expectations
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tier: user.tier,
          avatar: user.avatar,
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Registration error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================================================
// GET /users/me - Get current user
// ============================================================================
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const token = authHeader.substring(7);
    const JWT_SECRET = process.env.JWT_SECRET!;

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Get user
    const user = await (prisma as any).user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        avatar: user.avatar,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
        last_sign_in_at: user.lastLoginAt?.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get user error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ============================================================================
// POST /auth/logout
// ============================================================================
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const token = authHeader.substring(7);

    // Delete session
    await (prisma as any).session.deleteMany({
      where: { token },
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
