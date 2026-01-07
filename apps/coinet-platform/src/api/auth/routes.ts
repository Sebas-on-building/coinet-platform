import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { z } from 'zod';
import { 
  authRateLimit, 
  recordAuthFailure, 
  clearAuthFailures,
  isAuthBlocked 
} from '../../middleware/rateLimit';

const router: Router = Router();

// Helper function to safely access Prisma models
const getPrismaModel = (modelName: string) => {
  try {
    if (!prisma) {
      logger.error('Prisma client is not initialized', {
        prismaType: typeof prisma,
        hasPrisma: false,
      });
      throw new Error('Prisma client is not initialized');
    }
    
    const model = (prisma as any)[modelName];
    if (!model) {
      // Get available models from prisma object (excluding internal properties)
      const availableModels = Object.keys(prisma).filter(
        key => !key.startsWith('$') && !key.startsWith('_') && typeof (prisma as any)[key] === 'object'
      );
      logger.error(`Prisma model '${modelName}' is not available`, {
        availableModels,
        prismaType: typeof prisma,
        prismaConstructor: prisma?.constructor?.name,
        hasPrisma: !!prisma,
      });
      throw new Error(`Prisma model '${modelName}' is not available. Available models: ${availableModels.join(', ')}`);
    }
    
    if (typeof model.findUnique !== 'function' && modelName === 'user') {
      // Only check for findUnique on user model (session uses different methods)
      logger.error(`Prisma model '${modelName}' does not have findUnique method`, {
        modelType: typeof model,
        modelKeys: model ? Object.keys(model) : [],
      });
      throw new Error(`Prisma model '${modelName}' does not have findUnique method`);
    }
    
    return model;
  } catch (error) {
    logger.error(`Error accessing Prisma model '${modelName}'`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

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
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Check if IP is blocked due to too many failures
    if (await isAuthBlocked(req)) {
      logger.warn('🚫 Auth blocked due to too many failures', { requestId, path: req.path });
      return res.status(429).json({
        success: false,
        error: 'Too many failed login attempts. Please try again later.',
        requestId,
      });
    }
    
    // Runtime check for prisma
    if (!prisma) {
      logger.error('Prisma client not available in login handler', { requestId });
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
        requestId,
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
    const User = getPrismaModel('user');
    const user = await User.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      await recordAuthFailure(req);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        requestId,
      });
    }

    // Check if user is active
    if (!user.active) {
      await recordAuthFailure(req);
      return res.status(401).json({
        success: false,
        error: 'Account is inactive',
        requestId,
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await recordAuthFailure(req);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        requestId,
      });
    }
    
    // Clear any recorded auth failures on successful login
    await clearAuthFailures(req);

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
    await User.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const Session = getPrismaModel('session');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await Session.create({
      data: {
        userId: user.id,
        tenantId: 'default',
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
router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Runtime check for prisma
    if (!prisma) {
      logger.error('Prisma client not available in register handler', { requestId });
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
        requestId,
      });
    }

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
    const User = getPrismaModel('user');
    const existingUser = await User.findUnique({
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
    const user = await User.create({
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
    const Session = getPrismaModel('session');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await Session.create({
      data: {
        userId: user.id,
        tenantId: 'default',
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Registration error details', { 
      errorMessage, 
      errorStack,
      errorType: error?.constructor?.name,
      prismaAvailable: !!prisma,
      prismaType: typeof prisma,
      // Don't include prisma object itself to avoid circular reference
    });
    // Include error details in response for debugging
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    });
  }
});

// ============================================================================
// GET /users/me - Get current user
// ============================================================================
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Runtime check for prisma
    if (!prisma) {
      logger.error('Prisma client not available in /me handler');
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
      });
    }

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
    const User = getPrismaModel('user');
    const user = await User.findUnique({
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
    // Runtime check for prisma
    if (!prisma) {
      logger.error('Prisma client not available in logout handler');
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const token = authHeader.substring(7);

    // Delete session
    const Session = getPrismaModel('session');
    await Session.deleteMany({
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
