// @ts-nocheck
/**
 * AuthMiddleware Test Suite
 * Tests for authentication middleware functionality
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { AuthMiddleware, AuthMiddlewareConfig } from '../../src/middleware/AuthMiddleware';
import { 
  AuthenticationError, 
  AuthorizationError, 
  RateLimitExceededError 
} from '../../src/types';
import { User, Session, JWTPayload } from '../../src/types/auth';

// Mock Redis
jest.mock('ioredis');

// Mock services
jest.mock('../../src/services/JWTService');
jest.mock('../../src/services/RBACService');
jest.mock('../../src/services/SessionManager');
jest.mock('../../src/services/MFAService');
jest.mock('../../src/services/SecurityService');

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockRedis: jest.Mocked<Redis>;
  let mockConfig: AuthMiddlewareConfig;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Setup mocks
    mockRedis = new Redis() as jest.Mocked<Redis>;
    
    mockConfig = {
      jwt: {
        secret: 'test-secret',
        algorithm: 'HS256',
        issuer: 'coinet',
        audience: 'coinet-users',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
        clockTolerance: 30
      },
      session: {
        defaultTimeout: 3600,
        maxConcurrentSessions: 5,
        enableDeviceTracking: true,
        enableLocationTracking: true,
        securityChecks: true,
        extendOnActivity: true,
        secureCookies: true,
        sameSite: 'strict',
        cleanupInterval: 300
      },
      mfa: {
        enabled: true,
        requiredForRoles: ['admin'],
        allowedMethods: ['totp', 'sms'],
        gracePeriod: 3600
      },
      oauth: {
        providers: ['google', 'apple'],
        allowAccountLinking: true,
        requireEmailVerification: true
      },
      security: {
        riskScoring: {
          enabled: true,
          thresholds: { low: 30, medium: 60, high: 80 },
          factors: {
            locationWeight: 0.25,
            deviceWeight: 0.25,
            behaviorWeight: 0.25,
            timeWeight: 0.25
          }
        },
        fraudDetection: {
          enabled: true,
          maxLoginAttempts: 5,
          suspiciousActivityThreshold: 10,
          blockDuration: 1800000
        },
        ipIntelligence: {
          enabled: true,
          blockedCountries: ['XX'],
          vpnDetection: true,
          torDetection: true
        },
        deviceFingerprinting: {
          enabled: true,
          trustPeriod: 30,
          maxDevicesPerUser: 5
        }
      },
      rateLimit: {
        enabled: true,
        windowMs: 900000,
        maxAttempts: 10,
        blockDuration: 3600000
      }
    };

    authMiddleware = new AuthMiddleware(mockRedis, mockConfig);

    // Setup request mock
    mockReq = {
      path: '/api/portfolios',
      method: 'GET',
      ip: '192.168.1.1',
      headers: {
        'authorization': 'Bearer test-token',
        'user-agent': 'Mozilla/5.0',
        'x-device-fingerprint': 'test-fingerprint'
      },
      get: jest.fn((header: string) => mockReq.headers[header.toLowerCase()]),
      connection: { remoteAddress: '192.168.1.1' },
      params: {},
      query: {},
      body: {},
      requestId: 'test-request-id',
      startTime: Date.now()
    };

    // Setup response mock
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('authenticate()', () => {
    it('should skip authentication for non-auth routes', async () => {
      mockReq.path = '/api/auth/login';
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.auth).toBeUndefined();
    });

    it('should require token for protected routes', async () => {
      mockReq.headers.authorization = undefined;
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });

    it('should validate JWT token', async () => {
      // Mock JWT service to return invalid token
      const mockJWTService = authMiddleware['jwtService'] as any;
      mockJWTService.extractTokenFromRequest.mockReturnValue('invalid-token');
      mockJWTService.validateToken.mockResolvedValue({
        valid: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
      });

      const middleware = authMiddleware.authenticate();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });

    it('should validate session', async () => {
      const mockJWTPayload: JWTPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'coinet',
        aud: 'coinet-users',
        jti: 'token-123'
      };

      const mockJWTService = authMiddleware['jwtService'] as any;
      mockJWTService.extractTokenFromRequest.mockReturnValue('valid-token');
      mockJWTService.validateToken.mockResolvedValue({
        valid: true,
        payload: mockJWTPayload
      });

      const mockSessionManager = authMiddleware['sessionManager'] as any;
      mockSessionManager.getSession.mockResolvedValue(null); // No session found

      const middleware = authMiddleware.authenticate();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });

    it('should perform security checks', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        roles: [],
        permissions: [],
        status: 'inactive', // Inactive user
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          loginAttempts: 0,
          lockoutUntil: null,
          passwordLastChanged: new Date(),
          devices: [],
          preferences: {},
          tags: []
        }
      };

      const mockSession: Session = {
        id: 'session-123',
        userId: 'user-123',
        deviceInfo: {
          fingerprint: 'test-fingerprint',
          type: 'desktop',
          os: 'Windows',
          browser: 'Chrome',
          lastSeen: new Date(),
          trusted: false
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        isActive: true,
        lastActivity: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        metadata: {
          mfaVerified: false,
          riskScore: 0,
          flags: [],
          lastPermissionCheck: new Date()
        }
      };

      const mockJWTPayload: JWTPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'coinet',
        aud: 'coinet-users',
        jti: 'token-123'
      };

      // Setup mocks
      const mockJWTService = authMiddleware['jwtService'] as any;
      mockJWTService.extractTokenFromRequest.mockReturnValue('valid-token');
      mockJWTService.validateToken.mockResolvedValue({
        valid: true,
        payload: mockJWTPayload
      });

      const mockSessionManager = authMiddleware['sessionManager'] as any;
      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockSessionManager.updateSession.mockResolvedValue(undefined);

      // Mock Redis for user loading
      mockRedis.get.mockResolvedValue(JSON.stringify(mockUser));

      const middleware = authMiddleware.authenticate();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Account is not active'
        })
      );
    });

    it('should check rate limiting', async () => {
      // Mock rate limit exceeded
      mockRedis.incr.mockResolvedValue(15); // Exceeds limit of 10
      mockRedis.ttl.mockResolvedValue(300);

      const middleware = authMiddleware.authenticate();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(RateLimitExceededError)
      );
    });

    it('should successfully authenticate valid request', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        roles: [
          {
            id: 'role-1',
            name: 'user',
            description: 'Regular user',
            permissions: [],
            inherits: [],
            isSystem: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        permissions: [
          {
            id: 'perm-1',
            resource: 'portfolios',
            action: 'read',
            description: 'Read portfolios',
            isSystem: false,
            createdAt: new Date()
          }
        ],
        status: 'active',
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          loginAttempts: 0,
          lockoutUntil: null,
          passwordLastChanged: new Date(),
          devices: [],
          preferences: {},
          tags: []
        }
      };

      const mockSession: Session = {
        id: 'session-123',
        userId: 'user-123',
        deviceInfo: {
          fingerprint: 'test-fingerprint',
          type: 'desktop',
          os: 'Windows',
          browser: 'Chrome',
          lastSeen: new Date(),
          trusted: true
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        isActive: true,
        lastActivity: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        metadata: {
          mfaVerified: true,
          riskScore: 20, // Low risk
          flags: ['trusted_device'],
          lastPermissionCheck: new Date()
        }
      };

      const mockJWTPayload: JWTPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['user'],
        permissions: ['portfolios:read'],
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'coinet',
        aud: 'coinet-users',
        jti: 'token-123'
      };

      // Setup mocks for successful authentication
      const mockJWTService = authMiddleware['jwtService'] as any;
      mockJWTService.extractTokenFromRequest.mockReturnValue('valid-token');
      mockJWTService.validateToken.mockResolvedValue({
        valid: true,
        payload: mockJWTPayload
      });

      const mockSessionManager = authMiddleware['sessionManager'] as any;
      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockSessionManager.updateSession.mockResolvedValue(undefined);

      const mockRBACService = authMiddleware['rbacService'] as any;
      mockRBACService.getUserEffectivePermissions.mockResolvedValue(mockUser.permissions);
      mockRBACService.hasPermission.mockResolvedValue(true);

      const mockSecurityService = authMiddleware['securityService'] as any;
      mockSecurityService.calculateRiskScore.mockResolvedValue(20);

      // Mock Redis for user loading and rate limiting
      mockRedis.get.mockResolvedValue(JSON.stringify(mockUser));
      mockRedis.incr.mockResolvedValue(1); // Under rate limit
      mockRedis.del.mockResolvedValue(1);

      const middleware = authMiddleware.authenticate();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(); // No error
      expect(mockReq.auth).toBeDefined();
      expect(mockReq.user).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com'
      }));
      expect(mockReq.session).toEqual(mockSession);
    });
  });

  describe('requirePermission()', () => {
    it('should grant access for valid permissions', async () => {
      mockReq.auth = {
        user: { id: 'user-123' },
        permissions: [],
        roles: [],
        session: {},
        isAuthenticated: true,
        isMFAVerified: true,
        deviceTrusted: true,
        riskScore: 10
      };

      const mockRBACService = authMiddleware['rbacService'] as any;
      mockRBACService.hasPermission.mockResolvedValue(true);

      const middleware = authMiddleware.requirePermission('portfolios', 'read');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for insufficient permissions', async () => {
      mockReq.auth = {
        user: { id: 'user-123' },
        permissions: [],
        roles: [],
        session: {},
        isAuthenticated: true,
        isMFAVerified: true,
        deviceTrusted: true,
        riskScore: 10
      };

      const mockRBACService = authMiddleware['rbacService'] as any;
      mockRBACService.hasPermission.mockResolvedValue(false);

      const middleware = authMiddleware.requirePermission('portfolios', 'delete');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });

    it('should grant owner access when enabled', async () => {
      mockReq.auth = {
        user: { id: 'user-123' },
        permissions: [],
        roles: [],
        session: {},
        isAuthenticated: true,
        isMFAVerified: true,
        deviceTrusted: true,
        riskScore: 10
      };

      mockReq.params = { userId: 'user-123' };

      const middleware = authMiddleware.requirePermission(
        'portfolios', 
        'read', 
        { allowOwner: true, ownerField: 'userId' }
      );
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requireRole()', () => {
    it('should grant access for valid roles', async () => {
      mockReq.auth = {
        user: { id: 'user-123' },
        permissions: [],
        roles: [{ name: 'admin' }, { name: 'user' }],
        session: {},
        isAuthenticated: true,
        isMFAVerified: true,
        deviceTrusted: true,
        riskScore: 10
      };

      const middleware = authMiddleware.requireRole('admin');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for insufficient roles', async () => {
      mockReq.auth = {
        user: { id: 'user-123' },
        permissions: [],
        roles: [{ name: 'user' }],
        session: {},
        isAuthenticated: true,
        isMFAVerified: true,
        deviceTrusted: true,
        riskScore: 10
      };

      const middleware = authMiddleware.requireRole('admin');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthorizationError)
      );
    });

    it('should handle multiple roles with requireAll option', async () => {
      mockReq.auth = {
        user: { id: 'user-123' },
        permissions: [],
        roles: [{ name: 'admin' }, { name: 'user' }],
        session: {},
        isAuthenticated: true,
        isMFAVerified: true,
        deviceTrusted: true,
        riskScore: 10
      };

      const middleware = authMiddleware.requireRole(
        ['admin', 'user'], 
        { requireAll: true }
      );
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requireMFA()', () => {
    it('should grant access when MFA is verified', async () => {
      mockReq.auth = {
        user: { id: 'user-123' },
        permissions: [],
        roles: [],
        session: {
          metadata: { mfaVerified: true }
        },
        isAuthenticated: true,
        isMFAVerified: true,
        deviceTrusted: true,
        riskScore: 10
      };

      const middleware = authMiddleware.requireMFA();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when MFA is not verified', async () => {
      mockReq.auth = {
        user: { id: 'user-123' },
        permissions: [],
        roles: [],
        session: {
          metadata: { mfaVerified: false }
        },
        isAuthenticated: true,
        isMFAVerified: false,
        deviceTrusted: true,
        riskScore: 10
      };

      const middleware = authMiddleware.requireMFA();
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });
  });
}); 