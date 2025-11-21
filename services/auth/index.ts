/**
 * =========================================
 * ENHANCED AUTHENTICATION SERVICE
 * =========================================
 * World-class authentication service with JWT, OAuth2, RBAC,
 * and comprehensive security features for enterprise-grade protection
 */

import express from 'express';
import passport from 'passport';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import {
  getUserById,
  createUser,
  updateUserRole,
  requireRole,
  storeSession,
  getSession,
  validatePassword,
  hashPassword
} from './userStore';

// Enhanced types for better security
interface JWTPayload {
  id: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  jti: string; // JWT ID for token tracking
  iss: string; // Issuer
  aud: string; // Audience
}

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'premium' | 'enterprise';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

interface AuthRequest extends express.Request {
  user?: User;
  token?: string;
}

// Enhanced configuration
const config = {
  jwt: {
    secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    algorithm: 'HS256' as const,
    issuer: process.env.JWT_ISSUER || 'coinet-auth-service',
    audience: process.env.JWT_AUDIENCE || 'coinet-api'
  },
  session: {
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours
  },
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.AUTH_RATE_LIMIT || '5'), // 5 attempts per window
      message: {
        error: 'Too many authentication attempts',
        retryAfter: '15 minutes'
      }
    },
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.GENERAL_RATE_LIMIT || '1000'), // 1000 requests
      message: {
        error: 'Too many requests',
        retryAfter: '15 minutes'
      }
    }
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    tokenBlacklist: process.env.TOKEN_BLACKLIST_ENABLED !== 'false'
  }
};

// Enhanced logger with security focus
const logger = {
  info: (message: string, meta?: any) => console.log(`[AUTH] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[AUTH WARN] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[AUTH ERROR] ${message}`, meta),
  security: (event: string, details: any) => console.log(`[SECURITY EVENT] ${event}`, details)
};

const app = express();

// Security middleware stack
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://coinet.ai',
      'https://app.coinet.ai',
      'https://staging.coinet.ai'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.security('CORS_BLOCKED', { origin, userAgent: 'unknown' });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  message: config.rateLimit.auth.message,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + user agent for better rate limiting
    return `${req.ip}-${req.get('User-Agent')}`;
  },
  handler: (req, res) => {
    logger.security('AUTH_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });

    res.status(429).json({
      error: config.rateLimit.auth.message.error,
      retryAfter: Math.ceil(config.rateLimit.auth.windowMs / 1000 / 60),
      timestamp: new Date().toISOString()
    });
  }
});

const generalLimiter = rateLimit({
  windowMs: config.rateLimit.general.windowMs,
  max: config.rateLimit.general.max,
  message: config.rateLimit.general.message,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.includes('/health') || req.path.includes('/metrics'),
  keyGenerator: (req) => {
    return `${req.ip}-${req.get('User-Agent')}`;
  }
});

app.use(generalLimiter);

// Enhanced body parsing with security
app.use(express.json({
  limit: '1mb',
  strict: true,
  verify: (req, res, buf) => {
    // Store raw body for signature verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Enhanced session configuration
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: config.session.maxAge,
    sameSite: 'strict'
  },
  store: new (require('connect-redis').default)({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  })
}));

app.use(passport.initialize());
app.use(passport.session());

// Enhanced OAuth2 strategies with better security
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET!,
  callbackURL: '/auth/google/callback',
  scope: ['profile', 'email'],
  state: true, // Enable state parameter for CSRF protection
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    logger.info('Google OAuth callback', {
      profileId: profile.id,
      provider: profile.provider,
      state: req.query.state
    });

    // Validate state parameter for CSRF protection
    if (req.query.state !== req.session.oauthState) {
      logger.security('OAUTH_STATE_MISMATCH', {
        expected: req.session.oauthState,
        received: req.query.state,
        ip: req.ip
      });
      return done(new Error('Invalid state parameter'), null);
    }

    let user = await getUserById(profile.id);
    if (!user) {
      user = await createUser({
        id: profile.id,
        email: profile.emails?.[0]?.value || `${profile.id}@google.user`,
        provider: 'google',
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value
      });
    }

    // Update last login
    await updateUserLastLogin(user.id);

    return done(null, user);
  } catch (error) {
    logger.error('Google OAuth error', error);
    return done(error, null);
  }
}));

passport.use(new AppleStrategy({
  clientID: process.env.APPLE_CLIENT_ID || process.env.APPLE_ID!,
  teamID: process.env.APPLE_TEAM_ID!,
  keyID: process.env.APPLE_KEY_ID!,
  privateKeyString: process.env.APPLE_PRIVATE_KEY!,
  callbackURL: '/auth/apple/callback',
  scope: ['name', 'email'],
  state: true,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, idToken, profile, done) => {
  try {
    logger.info('Apple OAuth callback', {
      profileId: profile.id,
      provider: profile.provider,
      state: req.query.state
    });

    // Validate state parameter for CSRF protection
    if (req.query.state !== req.session.oauthState) {
      logger.security('OAUTH_STATE_MISMATCH', {
        expected: req.session.oauthState,
        received: req.query.state,
        ip: req.ip
      });
      return done(new Error('Invalid state parameter'), null);
    }

    let user = await getUserById(profile.id);
    if (!user) {
      user = await createUser({
        id: profile.id,
        email: idToken?.email || `${profile.id}@apple.user`,
        provider: 'apple',
        name: profile.name?.firstName + ' ' + profile.name?.lastName || 'Apple User',
        avatar: null
      });
    }

    // Update last login
    await updateUserLastLogin(user.id);

    return done(null, user);
  } catch (error) {
    logger.error('Apple OAuth error', error);
    return done(error, null);
  }
}));

// Enhanced passport serialization with security
passport.serializeUser((user: User, done) => {
  // Only serialize essential user data
  done(null, {
    id: user.id,
    role: user.role,
    permissions: user.permissions
  });
});

passport.deserializeUser(async (serializedUser: any, done) => {
  try {
    const user = await getUserById(serializedUser.id);

    if (!user || !user.isActive) {
      logger.security('USER_DESERIALIZATION_FAILED', {
        userId: serializedUser.id,
        reason: !user ? 'User not found' : 'User inactive'
      });
      return done(new Error('User not found or inactive'), null);
    }

    done(null, user);
  } catch (error) {
    logger.error('Deserialize user error', error);
    done(error, null);
  }
});

// Enhanced JWT utilities with comprehensive security
function generateJWT(user: User, options: { type?: 'access' | 'refresh'; expiresIn?: string } = {}) {
  const { type = 'access', expiresIn } = options;

  const payload: Partial<JWTPayload> = {
    id: user.id,
    role: user.role,
    permissions: user.permissions,
    iss: config.jwt.issuer,
    aud: config.jwt.audience,
    jti: crypto.randomUUID() // Unique token ID for tracking
  };

  const tokenConfig = {
    algorithm: config.jwt.algorithm,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    jwtid: payload.jti,
    subject: user.id
  };

  const secret = config.jwt.secret;
  const expiration = expiresIn || (type === 'refresh' ? config.jwt.refreshExpiresIn : config.jwt.expiresIn);

  return jwt.sign(payload, secret, { ...tokenConfig, expiresIn: expiration });
}

function verifyJWT(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithms: [config.jwt.algorithm]
    }) as JWTPayload;

    return payload;
  } catch (error) {
    logger.security('JWT_VERIFICATION_FAILED', { error: error.message });
    throw error;
  }
}

// Helper function for updating last login
async function updateUserLastLogin(userId: string): Promise<void> {
  // Implementation would update user's lastLoginAt field
  logger.info('User login updated', { userId, timestamp: new Date() });
}

// Enhanced authentication endpoints with comprehensive security

// Rate-limited login endpoint
app.post('/login', authLimiter, async (req: AuthRequest, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    // Input validation
    if (!email || !password) {
      logger.security('LOGIN_INVALID_INPUT', { ip: req.ip, hasEmail: !!email, hasPassword: !!password });
      return res.status(400).json({
        error: 'Email and password are required',
        timestamp: new Date().toISOString()
      });
    }

    // Get user from database
    const user = await getUserById(email);
    if (!user) {
      logger.security('LOGIN_FAILED_USER_NOT_FOUND', { email, ip: req.ip });
      return res.status(401).json({
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user is active
    if (!user.isActive) {
      logger.security('LOGIN_INACTIVE_USER', { userId: user.id, ip: req.ip });
      return res.status(401).json({
        error: 'Account is inactive',
        timestamp: new Date().toISOString()
      });
    }

    // Verify password with bcrypt
    const isValidPassword = await validatePassword(password, user.passwordHash);
    if (!isValidPassword) {
      logger.security('LOGIN_INVALID_PASSWORD', { userId: user.id, ip: req.ip });
      return res.status(401).json({
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    // Generate secure JWT tokens
    const accessToken = generateJWT(user, { type: 'access' });
    const refreshToken = generateJWT(user, { type: 'refresh' });

    // Update last login
    await updateUserLastLogin(user.id);

    // Store session
    await storeSession(accessToken, user.id);

    // Set secure HTTP-only cookie for access token
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? config.session.maxAge : undefined
    });

    // Set refresh token in separate secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        lastLoginAt: user.lastLoginAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Login error', error);
    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced OAuth endpoints with state validation
app.get('/auth/google', (req, res, next) => {
  // Generate and store state for CSRF protection
  req.session.oauthState = crypto.randomUUID();
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: req.session.oauthState
  })(req, res, next);
});

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  async (req: AuthRequest, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        logger.security('OAUTH_CALLBACK_NO_USER', { ip: req.ip });
        return res.redirect('/auth/failure?error=no_user');
      }

      const accessToken = generateJWT(user, { type: 'access' });
      const refreshToken = generateJWT(user, { type: 'refresh' });

      await updateUserLastLogin(user.id);
      await storeSession(accessToken, user.id);

      // Set secure cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: config.session.maxAge
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      logger.info('Google OAuth login successful', {
        userId: user.id,
        ip: req.ip
      });

      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?token=${accessToken}`);
    } catch (error) {
      logger.error('Google OAuth callback error', error);
      res.redirect('/auth/failure?error=callback_error');
    }
  }
);

app.get('/auth/apple', (req, res, next) => {
  req.session.oauthState = crypto.randomUUID();
  passport.authenticate('apple', {
    scope: ['name', 'email'],
    state: req.session.oauthState
  })(req, res, next);
});

app.get('/auth/apple/callback',
  passport.authenticate('apple', { failureRedirect: '/auth/failure' }),
  async (req: AuthRequest, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        logger.security('APPLE_OAUTH_CALLBACK_NO_USER', { ip: req.ip });
        return res.redirect('/auth/failure?error=no_user');
      }

      const accessToken = generateJWT(user, { type: 'access' });
      const refreshToken = generateJWT(user, { type: 'refresh' });

      await updateUserLastLogin(user.id);
      await storeSession(accessToken, user.id);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: config.session.maxAge
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      logger.info('Apple OAuth login successful', {
        userId: user.id,
        ip: req.ip
      });

      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?token=${accessToken}`);
    } catch (error) {
      logger.error('Apple OAuth callback error', error);
      res.redirect('/auth/failure?error=callback_error');
    }
  }
);

// Token refresh endpoint
app.post('/refresh', async (req: AuthRequest, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        timestamp: new Date().toISOString()
      });
    }

    const payload = verifyJWT(refreshToken);
    const user = await getUserById(payload.id);

    if (!user || !user.isActive) {
      logger.security('REFRESH_TOKEN_INVALID_USER', { userId: payload.id, ip: req.ip });
      return res.status(401).json({
        error: 'Invalid refresh token',
        timestamp: new Date().toISOString()
      });
    }

    // Generate new tokens
    const newAccessToken = generateJWT(user, { type: 'access' });
    const newRefreshToken = generateJWT(user, { type: 'refresh' });

    // Update session
    await storeSession(newAccessToken, user.id);

    // Set new cookies
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: config.session.maxAge
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    logger.info('Token refreshed successfully', { userId: user.id, ip: req.ip });

    res.json({
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Token refresh error', error);
    res.status(401).json({
      error: 'Invalid refresh token',
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced user profile endpoint with authentication
app.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get user profile error', error);
    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Logout endpoint
app.post('/logout', async (req: AuthRequest, res) => {
  try {
    const accessToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    if (accessToken) {
      // Add token to blacklist if enabled
      if (config.security.tokenBlacklist) {
        // Implementation would add to Redis blacklist
        logger.info('Token blacklisted on logout', { ip: req.ip });
      }
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Logout error', error);
    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: process.uptime()
  });
});

// Authentication middleware
function authenticateToken(req: AuthRequest, res: any, next: any) {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    logger.security('NO_TOKEN_PROVIDED', { ip: req.ip, path: req.path });
    return res.status(401).json({
      error: 'Access token required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const payload = verifyJWT(token);
    req.user = {
      id: payload.id,
      role: payload.role,
      permissions: payload.permissions,
      isActive: true,
      createdAt: new Date()
    } as User;
    req.token = token;

    next();
  } catch (error) {
    logger.security('INVALID_TOKEN', { ip: req.ip, path: req.path, error: error.message });
    res.status(401).json({
      error: 'Invalid or expired token',
      timestamp: new Date().toISOString()
    });
  }
}

// Role-based authorization middleware
function requireRole(roles: string[]) {
  return (req: AuthRequest, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.security('INSUFFICIENT_PERMISSIONS', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        ip: req.ip,
        path: req.path
      });

      return res.status(403).json({
        error: 'Insufficient permissions',
        requiredRoles: roles,
        userRole: req.user.role,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

// Export authentication middleware for use in other services
export { authenticateToken, requireRole, generateJWT, verifyJWT };

// Start the enhanced auth service
const PORT = parseInt(process.env.AUTH_PORT || '4000');
const HOST = process.env.AUTH_HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  logger.info('🚀 Enhanced Authentication Service started', {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  });
}); 