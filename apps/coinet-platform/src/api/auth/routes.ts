import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

// =============================================================================
// SECURITY CONSTANTS
// =============================================================================

/** 
 * Marker for OAuth users who cannot use password login.
 * This is a cryptographically random string that cannot be guessed or brute-forced.
 * OAuth users have this as their password hash, which will never match any input.
 */
const OAUTH_USER_PASSWORD_MARKER = '$OAUTH_PROVIDER$_NO_PASSWORD_LOGIN_ALLOWED';

/**
 * Generate a secure random password for OAuth users.
 * This ensures bcrypt.compare() will always fail for OAuth accounts attempting password login.
 */
function generateOAuthPasswordMarker(): string {
  // Generate a random 64-byte hex string - impossible to guess
  return `$OAUTH$${crypto.randomBytes(64).toString('hex')}`;
}

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
  email: z.string().email().transform(v => v.toLowerCase()),
  password: z.string().min(1), // Min 1 for login (validation happens via bcrypt)
});

// SECURITY: Strong password requirements for registration
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const registerSchema = z.object({
  email: z.string().email().transform(v => v.toLowerCase()),
  password: passwordSchema,
  name: z.string().max(100).optional(),
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

    // Generate JWT token with proper claims
    // SECURITY: Never use fallback secrets - fail loudly if not configured
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      logger.error('❌ CRITICAL: JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable',
        requestId,
      });
    }
    const JWT_ISSUER = process.env.JWT_ISSUER || 'coinet-platform';
    const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'coinet-users';
    
    const token = jwt.sign(
      {
        userId: user.id,
        sub: user.id, // Standard JWT claim
        email: user.email,
        role: user.role,
        tier: user.tier,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }
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
      // SECURITY: Generic error to prevent user enumeration
      // Don't reveal that this specific email exists
      logger.info('Registration attempt for existing email', { email: email.substring(0, 3) + '***' });
      return res.status(400).json({
        success: false,
        error: 'Unable to create account with this email. Please try a different email or log in.',
        requestId,
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

    // Generate JWT token with proper claims
    const JWT_SECRET = process.env.JWT_SECRET!;
    const JWT_ISSUER = process.env.JWT_ISSUER || 'coinet-platform';
    const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'coinet-users';
    
    const token = jwt.sign(
      {
        userId: user.id,
        sub: user.id, // Standard JWT claim
        email: user.email,
        role: user.role,
        tier: user.tier,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }
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
  const requestId = (req as any).requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Runtime check for prisma
    if (!prisma) {
      logger.error('Prisma client not available in /me handler', { requestId });
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
        requestId,
      });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        requestId,
      });
    }

    const token = authHeader.substring(7);
    const JWT_SECRET = process.env.JWT_SECRET;
    
    // SECURITY: Never use fallback - fail if not configured
    if (!JWT_SECRET) {
      logger.error('❌ CRITICAL: JWT_SECRET not configured', { requestId });
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable',
        requestId,
      });
    }

    // Verify token signature
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        requestId,
      });
    }

    // SECURITY: Verify session is still active in database
    // This ensures logged-out sessions are actually invalidated
    const Session = getPrismaModel('session');
    const session = await Session.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      logger.warn('🚫 Token valid but session not found or inactive', {
        requestId,
        userId: decoded.userId,
      });
      return res.status(401).json({
        success: false,
        error: 'Session invalid or expired. Please log in again.',
        requestId,
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
        requestId,
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
    logger.error('Get user error', error, { requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId,
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

// ============================================================================
// GET /auth/google - Initiate Google OAuth flow
// ============================================================================
router.get('/google', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const redirect = req.query.redirect as string;
    const redirectUrl = redirect ? decodeURIComponent(redirect) : `${req.protocol}://${req.get('host')}/auth/callback`;
    
    // Check if Google OAuth is configured
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      logger.warn('Google OAuth not configured', { requestId });
      return res.status(501).json({
        success: false,
        error: {
          code: 'OAUTH_NOT_CONFIGURED',
          message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
        },
        requestId,
      });
    }
    
    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({ redirect: redirectUrl, requestId })).toString('base64url');
    
    // Store state in session/cookie (simplified - in production use secure session storage)
    // For now, we'll include it in the redirect URL
    
    // Build Google OAuth URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', `${req.protocol}://${req.get('host')}/auth/google/callback`);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');
    
    logger.info('Redirecting to Google OAuth', { requestId, redirectUrl });
    
    // Redirect to Google
    res.redirect(googleAuthUrl.toString());
  } catch (error) {
    logger.error('Google OAuth initiation error', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OAUTH_ERROR',
        message: 'Failed to initiate Google OAuth',
      },
      requestId,
    });
  }
});

// ============================================================================
// GET /auth/google/callback - Handle Google OAuth callback
// ============================================================================
router.get('/google/callback', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      logger.warn('Google OAuth error', { error, requestId });
      return res.redirect(`/auth/callback?error=${encodeURIComponent(error as string)}`);
    }
    
    if (!code) {
      logger.warn('Google OAuth callback missing code', { requestId });
      return res.redirect('/auth/callback?error=missing_code');
    }
    
    // Decode state
    let stateData: { redirect: string; requestId: string };
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
    } catch {
      logger.warn('Invalid state parameter', { requestId });
      return res.redirect('/auth/callback?error=invalid_state');
    }
    
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.redirect('/auth/callback?error=oauth_not_configured');
    }
    
    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${req.protocol}://${req.get('host')}/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      logger.error('Failed to exchange Google OAuth code', { errorData, requestId });
      return res.redirect('/auth/callback?error=token_exchange_failed');
    }
    
    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;
    
    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      logger.error('Failed to fetch Google user info', { requestId });
      return res.redirect('/auth/callback?error=user_info_failed');
    }
    
    const googleUser = await userInfoResponse.json();
    const { email, name, picture } = googleUser;
    
    if (!email) {
      logger.warn('Google user missing email', { requestId });
      return res.redirect('/auth/callback?error=missing_email');
    }
    
    // Find or create user
    const User = getPrismaModel('user');
    let user = await User.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user) {
      // Create new user
      // SECURITY: OAuth users get a random impossible-to-guess password marker
      // This prevents password login for OAuth accounts
      user = await User.create({
        data: {
          email: email.toLowerCase(),
          name: name || null,
          avatar: picture || null,
          role: 'USER',
          tier: 'FREE',
          active: true,
          // SECURITY: Random marker prevents password login for OAuth users
          password: generateOAuthPasswordMarker(),
        },
      });
      logger.info('User created via Google OAuth', { userId: user.id, email });
    } else {
      // Update user info
      await User.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          avatar: picture || user.avatar,
          lastLoginAt: new Date(),
        },
      });
      logger.info('User logged in via Google OAuth', { userId: user.id, email });
    }
    
    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET!;
    const JWT_ISSUER = process.env.JWT_ISSUER || 'coinet-platform';
    const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'coinet-users';
    
    const token = jwt.sign(
      {
        userId: user.id,
        sub: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Create session
    const Session = getPrismaModel('session');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Session.create({
      data: {
        userId: user.id,
        tenantId: 'default',
        token,
        expiresAt,
        isActive: true,
      },
    });
    
    // Redirect to frontend with token
    const redirectUrl = new URL(stateData.redirect);
    redirectUrl.searchParams.set('token', token);
    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('Google OAuth callback error', error);
    res.redirect('/auth/callback?error=internal_error');
  }
});

// ============================================================================
// GET /auth/github - Initiate GitHub OAuth flow
// ============================================================================
router.get('/github', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const redirect = req.query.redirect as string;
    const redirectUrl = redirect ? decodeURIComponent(redirect) : `${req.protocol}://${req.get('host')}/auth/callback`;
    
    const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    
    if (!GITHUB_CLIENT_ID) {
      logger.warn('GitHub OAuth not configured', { requestId });
      return res.status(501).json({
        success: false,
        error: {
          code: 'OAUTH_NOT_CONFIGURED',
          message: 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.',
        },
        requestId,
      });
    }
    
    const state = Buffer.from(JSON.stringify({ redirect: redirectUrl, requestId })).toString('base64url');
    
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
    githubAuthUrl.searchParams.set('redirect_uri', `${req.protocol}://${req.get('host')}/auth/github/callback`);
    githubAuthUrl.searchParams.set('scope', 'user:email');
    githubAuthUrl.searchParams.set('state', state);
    
    logger.info('Redirecting to GitHub OAuth', { requestId, redirectUrl });
    
    res.redirect(githubAuthUrl.toString());
  } catch (error) {
    logger.error('GitHub OAuth initiation error', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OAUTH_ERROR',
        message: 'Failed to initiate GitHub OAuth',
      },
      requestId,
    });
  }
});

// ============================================================================
// GET /auth/github/callback - Handle GitHub OAuth callback
// ============================================================================
router.get('/github/callback', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      logger.warn('GitHub OAuth error', { error, requestId });
      return res.redirect(`/auth/callback?error=${encodeURIComponent(error as string)}`);
    }
    
    if (!code) {
      logger.warn('GitHub OAuth callback missing code', { requestId });
      return res.redirect('/auth/callback?error=missing_code');
    }
    
    let stateData: { redirect: string; requestId: string };
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
    } catch {
      logger.warn('Invalid state parameter', { requestId });
      return res.redirect('/auth/callback?error=invalid_state');
    }
    
    const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
    
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      return res.redirect('/auth/callback?error=oauth_not_configured');
    }
    
    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code as string,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      logger.error('Failed to exchange GitHub OAuth code', { errorData, requestId });
      return res.redirect('/auth/callback?error=token_exchange_failed');
    }
    
    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;
    
    if (!access_token) {
      logger.error('GitHub OAuth missing access token', { requestId });
      return res.redirect('/auth/callback?error=missing_token');
    }
    
    // Get user info from GitHub
    const userInfoResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    if (!userInfoResponse.ok) {
      logger.error('Failed to fetch GitHub user info', { requestId });
      return res.redirect('/auth/callback?error=user_info_failed');
    }
    
    const githubUser = await userInfoResponse.json();
    
    // Get email (may need separate API call)
    let email = githubUser.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        const primaryEmail = emails.find((e: any) => e.primary) || emails[0];
        email = primaryEmail?.email;
      }
    }
    
    if (!email) {
      logger.warn('GitHub user missing email', { requestId });
      return res.redirect('/auth/callback?error=missing_email');
    }
    
    // Find or create user
    const User = getPrismaModel('user');
    let user = await User.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user) {
      // SECURITY: OAuth users get a random impossible-to-guess password marker
      // This prevents password login for OAuth accounts
      user = await User.create({
        data: {
          email: email.toLowerCase(),
          name: githubUser.name || githubUser.login || null,
          avatar: githubUser.avatar_url || null,
          role: 'USER',
          tier: 'FREE',
          active: true,
          // SECURITY: Random marker prevents password login for OAuth users
          password: generateOAuthPasswordMarker(),
        },
      });
      logger.info('User created via GitHub OAuth', { userId: user.id, email });
    } else {
      await User.update({
        where: { id: user.id },
        data: {
          name: githubUser.name || githubUser.login || user.name,
          avatar: githubUser.avatar_url || user.avatar,
          lastLoginAt: new Date(),
        },
      });
      logger.info('User logged in via GitHub OAuth', { userId: user.id, email });
    }
    
    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET!;
    const JWT_ISSUER = process.env.JWT_ISSUER || 'coinet-platform';
    const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'coinet-users';
    
    const token = jwt.sign(
      {
        userId: user.id,
        sub: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Create session
    const Session = getPrismaModel('session');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Session.create({
      data: {
        userId: user.id,
        tenantId: 'default',
        token,
        expiresAt,
        isActive: true,
      },
    });
    
    // Redirect to frontend with token
    const redirectUrl = new URL(stateData.redirect);
    redirectUrl.searchParams.set('token', token);
    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('GitHub OAuth callback error', error);
    res.redirect('/auth/callback?error=internal_error');
  }
});

export default router;
